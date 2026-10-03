import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RazorpayOptions } from '../razorpay';
import { shouldFallBackToCod } from '../razorpay';
import type { PaymentConfig, PaymentOrderResponse } from '../types';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * The module caches its in-flight script promise, so each test needs a fresh
 * copy of the module to get a clean slate.
 */
async function freshModule() {
  vi.resetModules();
  return import('../razorpay');
}

const config: PaymentConfig = {
  enabled: true,
  keyId: 'rzp_test_key',
  currency: 'INR',
  providerName: 'KrishiMitraa',
  codEnabled: true,
  codMaxAmount: 25000,
};

const payment: PaymentOrderResponse = {
  order: { id: 42, totalPrice: 88 } as PaymentOrderResponse['order'],
  paymentMethod: 'razorpay',
  razorpayOrderId: 'order_abc',
  amount: 88,
  currency: 'INR',
  amountInPaise: 8800,
  keyId: 'rzp_test_key',
  prefill: { email: 'a@b.com', contact: '9999900000' },
};

let captured: RazorpayOptions | null;
let opened: number;

function installRazorpay() {
  captured = null;
  opened = 0;
  (window as unknown as { Razorpay: unknown }).Razorpay = function FakeRazorpay(options: RazorpayOptions) {
    captured = options;
    return {
      open: () => {
        opened += 1;
      },
      on: () => undefined,
    };
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  delete (window as unknown as { Razorpay?: unknown }).Razorpay;
});

afterEach(() => {
  delete (window as unknown as { Razorpay?: unknown }).Razorpay;
});

describe('loadRazorpayScript', () => {
  it('resolves immediately when Razorpay is already on the page', async () => {
    const { loadRazorpayScript } = await freshModule();
    installRazorpay();
    await expect(loadRazorpayScript()).resolves.toBeUndefined();
    expect(document.querySelector(`script[src="${SCRIPT_SRC}"]`)).toBeNull();
  });

  it('injects checkout.js once and resolves on load', async () => {
    const { loadRazorpayScript } = await freshModule();
    const first = loadRazorpayScript();
    const second = loadRazorpayScript();
    expect(first).toBe(second);

    const script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(script).not.toBeNull();
    expect(script?.async).toBe(true);
    expect(document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`)).toHaveLength(1);

    installRazorpay();
    script?.dispatchEvent(new Event('load'));
    await expect(first).resolves.toBeUndefined();
  });

  it('rejects and allows a retry when the script fails to load', async () => {
    const { loadRazorpayScript } = await freshModule();
    const first = loadRazorpayScript();
    document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)?.dispatchEvent(new Event('error'));
    // The message must name the blocked host and point at content blockers,
    // instead of the old vague "check your connection".
    await expect(first).rejects.toThrow(/checkout\.razorpay\.com/);
    await expect(first).rejects.toThrow(/ad blocker/i);

    // A fresh attempt after the failure gets a new script element.
    const retry = loadRazorpayScript();
    const scripts = document.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(scripts).toHaveLength(1);
    installRazorpay();
    scripts[0]?.dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBeUndefined();
  });

  it('recovers when the script loaded but the Razorpay global is missing', async () => {
    const { loadRazorpayScript } = await freshModule();
    const first = loadRazorpayScript();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    // A blocked or partially executed script can fire load without defining
    // window.Razorpay; that must reject *and* clear the cache, not poison the
    // session with a cached rejected promise.
    script?.dispatchEvent(new Event('load'));
    await expect(first).rejects.toThrow(/global is missing/i);

    const retry = loadRazorpayScript();
    const scripts = document.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(scripts).toHaveLength(1);
    installRazorpay();
    scripts[0]?.dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBeUndefined();
  });

  it('resolves when the global appears without a load event', async () => {
    // The preload may have injected the element before this module instance
    // attached listeners, so the load event can already be in the past.
    const { loadRazorpayScript } = await freshModule();
    const pending = loadRazorpayScript();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    installRazorpay();
    script?.dispatchEvent(new Event('load'));
    await expect(pending).resolves.toBeUndefined();
  });

  it('isScriptLoadFailure only matches recoverable script failures', async () => {
    const { isScriptLoadFailure } = await freshModule();
    expect(isScriptLoadFailure(`Could not load the Razorpay checkout script from x`)).toBe(true);
    expect(isScriptLoadFailure('payment-unavailable')).toBe(false);
    expect(isScriptLoadFailure('missing-address')).toBe(false);
  });
});

describe('startCheckout', () => {
  beforeEach(installRazorpay);

  it('opens Checkout with the server amount in paise and the public key', async () => {
    const { startCheckout } = await freshModule();
    await startCheckout({
      config,
      payment,
      productName: 'Onion',
      customerName: 'Asha',
      onSuccess: () => undefined,
      onDismiss: () => undefined,
    });

    expect(opened).toBe(1);
    const options = captured as unknown as RazorpayOptions;
    expect(options.key).toBe('rzp_test_key');
    expect(options.amount).toBe(8800);
    expect(options.currency).toBe('INR');
    expect(options.order_id).toBe('order_abc');
    expect(options.description).toBe('Onion');
    expect(options.prefill).toMatchObject({ name: 'Asha', email: 'a@b.com', contact: '9999900000' });
    expect(options.notes).toEqual({ orderId: '42' });
  });

  it('does not restrict payment methods, so UPI/cards/net banking all stay available', async () => {
    const { startCheckout } = await freshModule();
    await startCheckout({
      config,
      payment,
      productName: 'Onion',
      customerName: 'Asha',
      onSuccess: () => undefined,
      onDismiss: () => undefined,
    });

    // A `method` allow-list would hide methods the merchant account has enabled.
    const options = captured as unknown as RazorpayOptions & { method?: unknown };
    expect(options.method).toBeUndefined();
  });

  it('routes the success callback to the caller', async () => {
    const { startCheckout } = await freshModule();
    const onSuccess = vi.fn();
    await startCheckout({
      config,
      payment,
      productName: 'Onion',
      customerName: 'Asha',
      onSuccess,
      onDismiss: () => undefined,
    });

    const options = captured as unknown as RazorpayOptions;
    options.handler({ razorpay_order_id: 'order_abc', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' });
    expect(onSuccess).toHaveBeenCalledWith({
      razorpay_order_id: 'order_abc',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig',
    });
  });

  it('routes a dismissed modal to onDismiss so checkout can unwind', async () => {
    const { startCheckout } = await freshModule();
    const onDismiss = vi.fn();
    await startCheckout({
      config,
      payment,
      productName: 'Onion',
      customerName: 'Asha',
      onSuccess: () => undefined,
      onDismiss,
    });

    const options = captured as unknown as RazorpayOptions;
    options.modal?.ondismiss?.();
    expect(onDismiss).toHaveBeenCalled();
  });
});


describe('shouldFallBackToCod', () => {
  const cod = { codEnabled: true, codMaxAmount: 25000 };

  it('switches to COD when online was chosen and COD is available', () => {
    expect(shouldFallBackToCod('razorpay', cod, 500)).toBe(true);
  });

  it('treats the cap as inclusive, matching PaymentMethodSelector', () => {
    expect(shouldFallBackToCod('razorpay', cod, 25000)).toBe(true);
  });

  it('does not switch when the order is above the COD cap', () => {
    expect(shouldFallBackToCod('razorpay', cod, 25001)).toBe(false);
  });

  it('does not switch when the merchant has COD switched off', () => {
    expect(shouldFallBackToCod('razorpay', { codEnabled: false, codMaxAmount: 25000 }, 500)).toBe(
      false,
    );
  });

  it('does nothing when COD was already the chosen method', () => {
    expect(shouldFallBackToCod('cod', cod, 500)).toBe(false);
  });

  it('copes with a missing payment config', () => {
    expect(shouldFallBackToCod('razorpay', null, 500)).toBe(false);
    expect(shouldFallBackToCod('razorpay', undefined, 500)).toBe(false);
  });
});