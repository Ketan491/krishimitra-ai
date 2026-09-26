import type { PaymentConfig, PaymentOrderResponse } from './types';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

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

/** Loads checkout.js once and resolves when `window.Razorpay` is ready. */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay needs a browser.'));
  if (window.Razorpay) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      const script = existing ?? document.createElement('script');

      script.addEventListener('load', () => (window.Razorpay ? resolve() : reject(new Error('Razorpay failed to load.'))));
      script.addEventListener('error', () => {
        // Drop the dead element so a retry injects a fresh script; otherwise
        // the next call would wait on load events that will never fire.
        script.remove();
        scriptPromise = null;
        reject(new Error('Could not load the payment window. Check your connection.'));
      });

      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        document.body.appendChild(script);
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
