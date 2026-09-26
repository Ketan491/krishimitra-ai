import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { loadRazorpayScript, resetRazorpayScript, startCheckout } from '../lib/razorpay';
import type { CartLine } from '../lib/cart';
import type { Order, PaymentConfig, PaymentMethod } from '../lib/types';

export type CheckoutPhase =
  | 'idle'
  | 'creating'
  | 'loading-script'
  | 'paying'
  | 'verifying'
  | 'confirming'
  | 'done';

export interface CheckoutLine {
  productId: number;
  quantity: number;
  productName: string;
}

export interface CheckoutResult {
  /** Orders that were successfully placed (and paid, for online orders). */
  orders: Order[];
  /** Crop names that could not be completed, so the UI can report them. */
  failed: string[];
  /** The method the customer actually completed with. */
  method: PaymentMethod | null;
}

export interface UseCheckoutOptions {
  lines: CheckoutLine[];
  address: string;
  config: PaymentConfig | null;
  method: PaymentMethod;
  customerName: string;
  onSuccess?: (result: CheckoutResult) => void;
  onFailure?: (message: string) => void;
  onCancelled?: () => void;
}

const EMPTY_RESULT: CheckoutResult = { orders: [], failed: [], method: null };

/** Stable key so retries of the same attempt never create a second order. */
function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * The single checkout implementation used by the cart, Buy Now and Quick Pay.
 *
 * It owns the whole lifecycle for every cart line:
 *   create order -> open Razorpay -> verify signature -> confirm,
 * plus Cash on Delivery, cancellation cleanup and duplicate protection.
 */
export function useCheckout({
  lines,
  address,
  config,
  method,
  customerName,
  onSuccess,
  onFailure,
  onCancelled,
}: UseCheckoutOptions) {
  const [phase, setPhase] = useState<CheckoutPhase>('idle');
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [result, setResult] = useState<CheckoutResult>(EMPTY_RESULT);

  // The key is minted once per attempt and reused on every retry of that
  // attempt, so a retried request resolves to the same order server-side.
  const idempotencyKeyRef = useRef<string>(makeIdempotencyKey());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    idempotencyKeyRef.current = makeIdempotencyKey();
    setPhase('idle');
    setActiveLine(null);
    setResult(EMPTY_RESULT);
  }, []);

  const lineKey = useMemo(
    () =>
      lines
        .map((l) => `${l.productId}x${l.quantity}`)
        .sort()
        .join('|'),
    [lines],
  );

  // A different basket deserves a different idempotency key.
  useEffect(() => {
    idempotencyKeyRef.current = makeIdempotencyKey();
  }, [lineKey, method]);

  const keyFor = (line: CheckoutLine) => `${idempotencyKeyRef.current}:${line.productId}:${line.quantity}`;

  const payForLine = (line: CheckoutLine): Promise<Order | null> => {
    if (!config) return Promise.reject(new Error('payment-unavailable'));

    return new Promise<Order | null>((resolve, reject) => {
      setActiveLine(line.productId);
      api
        .createPaymentOrder({
          productId: line.productId,
          quantity: line.quantity,
          address,
          paymentMethod: 'razorpay',
          idempotencyKey: keyFor(line),
        })
        .then((payment) => {
          if (!payment.razorpayOrderId || !payment.keyId) {
            throw new Error('bad-gateway-response');
          }
          // Bind the narrowed values: the guard above does not carry into the
          // nested .then below.
          const { razorpayOrderId, keyId } = payment;
          // Report the real reason instead of a generic connection message, and
          // drop any cached failure so a retry re-injects the script.
          setPhase('loading-script');
          return loadRazorpayScript()
            .catch((err) => {
              resetRazorpayScript();
              throw err instanceof Error ? err : new Error(String(err));
            })
            .then(() => {
              setPhase('paying');
              return startCheckout({
                config: { ...config, keyId },
                payment: { ...payment, razorpayOrderId },
                productName: line.productName,
                customerName,
                onSuccess: (response) => {
                  setPhase('verifying');
                  api
                    .verifyPayment({
                      orderId: payment.order.id,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    })
                    .then((verified) => {
                      setPhase('confirming');
                      resolve(verified.order);
                    })
                    .catch(reject)
                    .finally(() => setActiveLine(null));
                },
                onDismiss: () => {
                  setActiveLine(null);
                  // Release the stock this line was holding.
                  api.cancelPaymentOrder(payment.order.id).catch(() => undefined);
                  resolve(null);
                },
              });
            });
        })
        .catch(reject);
    });
  };

  const placeCodLine = (line: CheckoutLine): Promise<Order> =>
    api
      .createPaymentOrder({
        productId: line.productId,
        quantity: line.quantity,
        address,
        paymentMethod: 'cod',
        idempotencyKey: keyFor(line),
      })
      .then((payment) => payment.order);

  const checkout = async (useMethod?: PaymentMethod): Promise<CheckoutResult> => {
    const chosen: PaymentMethod = useMethod || method;

    if (useMethod && useMethod !== method) {
      // A different method is a different attempt, so it needs a fresh key.
      idempotencyKeyRef.current = makeIdempotencyKey();
    }

    if (lines.length === 0) return EMPTY_RESULT;
    if (!address) throw new Error('missing-address');
    if (chosen === 'razorpay' && !config?.enabled) throw new Error('payment-unavailable');

    const placed: Order[] = [];
    const failed: string[] = [];
    setResult(EMPTY_RESULT);
    setPhase(chosen === 'razorpay' ? 'creating' : 'confirming');

    for (const line of lines) {
      try {
        if (chosen === 'cod') {
          const order = await placeCodLine(line);
          if (mountedRef.current) placed.push(order);
        } else {
          const order = await payForLine(line);
          if (order) {
            if (mountedRef.current) placed.push(order);
          } else {
            // Customer closed the Checkout window — stop rather than charging
            // them again for the same basket.
            failed.push(line.productName);
            break;
          }
        }
      } catch (err) {
        failed.push(line.productName);
        if (mountedRef.current) {
          setPhase('idle');
          onFailure?.(err instanceof Error ? err.message : 'checkout-failed');
        }
        break;
      }
    }

    const outcome: CheckoutResult = { orders: placed, failed, method: chosen };
    if (mountedRef.current) {
      setResult(outcome);
      setPhase('done');
    }
    if (placed.length) onSuccess?.(outcome);
    if (!placed.length) onCancelled?.();
    return outcome;
  };

  const busy = phase !== 'idle' && phase !== 'done';

  return { phase, busy, activeLine, result, checkout, reset };
}

/**
 * Warms the Razorpay script while the customer is still choosing a method, so
 * the click on "Pay now" usually finds `window.Razorpay` already present.
 * Failures are swallowed here on purpose: the real error is raised (and
 * retryable) at checkout time, with the script cache cleared.
 */
export function usePreloadRazorpay(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadRazorpayScript()
      .then(() => undefined)
      .catch(() => {
        // Do not leave a rejected promise cached for the rest of the session.
        if (!cancelled) resetRazorpayScript();
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

export function isCartLine(line: CartLine): line is CartLine & { quantity: number } {
  return typeof line?.productId === 'number' && typeof line?.quantity === 'number';
}
