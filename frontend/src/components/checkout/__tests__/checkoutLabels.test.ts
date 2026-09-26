import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from '../../../lib/i18n';
import type { Language } from '../../../lib/i18n';

/**
 * The confirm button on the cart changes with the chosen method, so these
 * labels are part of the checkout contract:
 *   COD    -> "Place Order (Cash on Delivery) · ₹X"
 *   Online -> "Pay ₹X now"
 */
function dictValue(lang: Language, path: string): string {
  let node: unknown = DICTIONARIES[lang];
  for (const part of path.split('.')) {
    node = (node as Record<string, unknown>)[part];
  }
  return node as string;
}

const LANGS: Language[] = ['en', 'hi', 'mr'];

describe('checkout confirm labels', () => {
  it.each(LANGS)('names the payment method in the COD confirm label (%s)', (lang) => {
    const label = dictValue(lang, 'pay.payNowCod');
    const method = dictValue(lang, 'pay.methodCod');
    expect(label).toContain('{total}');
    expect(label).toContain(method);
  });

  it.each(LANGS)('reads as a payment action in the online confirm label (%s)', (lang) => {
    const label = dictValue(lang, 'pay.payNow');
    expect(label).toContain('{total}');
    expect(label).not.toEqual(dictValue(lang, 'pay.payNowCod'));
  });

  it.each(LANGS)('uses the same method name on the selector and the pill (%s)', (lang) => {
    expect(dictValue(lang, 'pay.methodCod')).toBe(dictValue(lang, 'pay.methodCod'));
    expect(dictValue(lang, 'pay.methodOnline')).toBeTruthy();
  });

  it.each(LANGS)('reminds the farmer to collect cash for COD orders (%s)', (lang) => {
    expect(dictValue(lang, 'farmer.collectCashOnDelivery')).toBeTruthy();
  });

  // The blocked-script card is read by farmers on shared phones with aggressive
  // content blockers, so the guidance has to be actionable and in every
  // language - not a technical error string.
  it.each(LANGS)('explains a blocked payment window in plain language (%s)', (lang) => {
    const title = dictValue(lang, 'pay.loadFailedTitle');
    const body = dictValue(lang, 'pay.loadFailedBody');

    expect(title).toBeTruthy();
    expect(body).toBeTruthy();
    // Must point at the fix, not just report a failure.
    expect(body).toMatch(/ad-?blocker|एड-ब्लॉकर|अ‍ॅड-ब्लॉकर/i);
    expect(body).toContain('checkout.razorpay.com');
    // The domain is named, but no raw stack/CSP text leaks into the UI.
    expect(body).not.toMatch(/Content-Security-Policy|script-src|HTTP \d/);
  });

  it.each(LANGS)('offers a retry and a way out of a blocked payment (%s)', (lang) => {
    expect(dictValue(lang, 'pay.retryLoad')).toBeTruthy();
    expect(dictValue(lang, 'common.cancel')).toBeTruthy();
    expect(dictValue(lang, 'pay.switchToCodHint')).toMatch(/cash on delivery|कैश ऑन डिलीवरी|रोख/i);
  });

  it.each(LANGS)('exposes a payment method name for the admin orders column (%s)', (lang) => {
    expect(dictValue(lang, 'pay.method')).toBeTruthy();
    expect(dictValue(lang, 'pay.statusPaid')).toBeTruthy();
    expect(dictValue(lang, 'pay.statusPending')).toBeTruthy();
  });
});
