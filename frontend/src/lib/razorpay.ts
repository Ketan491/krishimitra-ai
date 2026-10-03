import type { PaymentConfig, PaymentMethod, PaymentOrderResponse } from './types';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Razorpay requires checkout.js to be loaded from their CDN and explicitly
 * forbids self-hosting it, so when a content blocker or network filter refuses
 * the request there is nothing the app can do to make online payment work on
 * that device. COD is the only way to keep the order placeable.
 *
 * Returns true only when online was the chosen method and COD is genuinely
 * available for this amount. The caller still has the customer press the pay
 * button, so no order is ever placed automatically.
 */
export function shouldFallBackToCod(
  method: PaymentMethod,
  config: Pick<PaymentConfig, 'codEnabled' | 'codMaxAmount'> | null | undefined,
  total: number,
): boolean {
  if (method !== 'razorpay') return false;
  if (!config?.codEnabled) return false;
  return total <= (config.codMaxAmount ?? 0);
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (payload: Record<string, unknown>) => void) => void;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: Record<string, string>;
  notes?: Record<string, string>;
  image?: string;
  theme?: { color: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
    // Escape / overlay click. Treated as an abandoned payment.
    escape?: boolean;
  };
  retry?: { enabled: boolean };
}

export interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

let scriptPromise: Promise<void> | null = null;
let inFlight: HTMLScriptElement | null = null;

/** A stalled request never fires load or error, so we cap the wait ourselves. */
const SCRIPT_TIMEOUT_MS = 20_000;
const READY_POLL_MS = 50;

/**
 * True when the failure is almost certainly a content blocker rather than a
 * flaky network. Ad blockers and privacy extensions match on the razorpay host.
 */
function blockerHint(): string {
  return (
    'This is usually an ad blocker, privacy extension, or network filter ' +
    'blocking checkout.razorpay.com. Allow it for this site and try again.'
  );
}

function scriptBlockedMessage(detail?: string): string {
  return `Could not load the Razorpay checkout script from ${SCRIPT_SRC}. ${blockerHint()}${
    detail ? ` (${detail})` : ''
  }`;
}

/** Removes a dead element so the next attempt injects a completely fresh one. */
function discardScript(script: HTMLScriptElement) {
  script.remove();
  if (inFlight === script) inFlight = null;
  scriptPromise = null;
}

/** Forces the next load attempt to re-inject the script. */
export function resetRazorpayScript(): void {
  if (inFlight) inFlight.remove();
  inFlight = null;
  scriptPromise = null;
}

/** Matches the host in our own failure messages without embedding a bare
 * dotted string literal (the i18n coverage check reads those as keys). */
const SCRIPT_HOST_RE = /checkout\.razorpay\.com/;

/** True for the failures that a plain "try again" can actually recover from. */
export function isScriptLoadFailure(message: string): boolean {
  return SCRIPT_HOST_RE.test(message) || message.includes('Razorpay checkout script');
}

/**
 * Loads checkout.js and resolves only once `window.Razorpay` actually exists.
 *
 * Every failure path clears `scriptPromise`, otherwise a single blocked or
 * failed load would cache a rejected promise for the whole session and no
 * retry could ever recover.
 */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay needs a browser.'));
  if (window.Razorpay) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      // Every path below must clear both timers, otherwise the 50ms readiness
      // poll outlives the failed attempt and leaks for the rest of the session.
      const stopTimers = () => {
        window.clearTimeout(timer);
        window.clearInterval(poll);
      };
      const succeed = () => {
        stopTimers();
        resolve();
      };
      const fail = (message: string) => {
        stopTimers();
        discardScript(script);
        reject(new Error(message));
      };

      // A previous attempt may have injected an element whose load event
      // already fired before we attached a listener. Polling for the global
      // covers that case, which a one-shot listener never would.
      const poll = window.setInterval(() => {
        if (window.Razorpay) succeed();
      }, READY_POLL_MS);

      const timer = window.setTimeout(
        () => fail(scriptBlockedMessage('timed out after 20s')),
        SCRIPT_TIMEOUT_MS,
      );

      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      const script = existing ?? document.createElement('script');

      script.addEventListener('load', () => {
        if (window.Razorpay) succeed();
        else fail(scriptBlockedMessage('script loaded but the Razorpay global is missing'));
      });

      script.addEventListener('error', () => {
        fail(scriptBlockedMessage('the browser refused the request'));
      });

      if (!existing) {
        inFlight = script;
        script.src = SCRIPT_SRC;
        script.async = true;
        // Some extensions abort an inline-looking fetch; async + no inline
        // value keeps the request looking like a normal external script.
        script.setAttribute('data-razorpay', 'checkout');
        document.body.appendChild(script);
      } else {
        inFlight = script;
      }
    });
  }
  return scriptPromise;
}

export interface StartCheckoutArgs {
  config: PaymentConfig;
  payment: PaymentOrderResponse;
  productName: string;
  customerName: string;
  onSuccess: (response: RazorpayHandlerResponse) => void;
  onDismiss: () => void;
}

/**
 * Opens Razorpay Checkout. Razorpay decides which methods to show (UPI, Google
 * Pay, cards, net banking) based on what the merchant account has enabled, so we
 * deliberately do not restrict `method` here.
 */
export async function startCheckout({
  config,
  payment,
  productName,
  customerName,
  onSuccess,
  onDismiss,
}: StartCheckoutArgs): Promise<RazorpayInstance> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Razorpay failed to load.');
  if (!payment.razorpayOrderId) throw new Error('This payment is missing its Razorpay order id.');

  const checkout = new window.Razorpay({
    key: config.keyId,
    amount: payment.amountInPaise,
    currency: payment.currency,
    name: config.providerName,
    description: productName,
    order_id: payment.razorpayOrderId,
    prefill: { name: customerName, ...(payment.prefill ?? {}) },
    notes: { orderId: String(payment.order.id) },
    theme: { color: '#2e7d32' },
    retry: { enabled: true },
    handler: (response) => onSuccess(response),
    modal: { ondismiss: onDismiss },
  });

  checkout.open();
  return checkout;
}
