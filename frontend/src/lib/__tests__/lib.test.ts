import { describe, expect, it } from 'vitest';
import {
  capitalize,
  formatDate,
  formatDateTime,
  formatINR,
  formatNumber,
  initials,
  joinUnit,
  timeAgo,
  weatherConditionIcon,
} from '../format';
import { t, translate } from '../i18n';
import {
  readCart,
  writeCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  cartCount,
  cartTotal,
  cartViewLines,
  cartLinesWithCatalog,
  CART_KEY,
} from '../cart';
import type { Product } from '../types';
import {
  isValidMobile,
  isValidPassword,
  isPositiveNumber,
  validateCustomerForm,
  validateFarmerForm,
  validateAddressForm,
  validateProductForm,
} from '../validators';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    farmerId: 10,
    cropName: 'Tomato',
    price: 40,
    quantity: 100,
    unit: 'kg',
    approved: true,
    avgRating: 4.2,
    reviewCount: 8,
    ...overrides,
  };
}

describe('format', () => {
  it('formatINR uses Indian grouping', () => {
    expect(formatINR(123456)).toBe('₹1,23,456');
    expect(formatINR(40)).toBe('₹40');
    expect(formatINR(40.5)).toBe('₹40.50');
    expect(formatINR('abc')).toBe('₹0');
  });

  it('formatNumber groups digits', () => {
    expect(formatNumber(1000000)).toBe('10,00,000');
    expect(formatNumber('nope')).toBe('0');
  });

  it('formatDate handles missing/invalid input', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('garbage')).toBe('—');
    expect(formatDate('2025-03-15T10:00:00Z')).not.toBe('—');
  });

  it('formatDateTime includes time', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('2025-03-15T10:00:00Z')).toContain('2025');
  });

  it('timeAgo returns sensible strings', () => {
    expect(timeAgo()).toBe('');
    expect(timeAgo(new Date().toISOString())).toBe('just now');
    expect(timeAgo(new Date(Date.now() - 2 * 86400 * 1000).toISOString())).toBe('2 days ago');
  });

  it('initials derives from the name', () => {
    expect(initials('Ramesh Patil')).toBe('RP');
    expect(initials('')).toBe('?');
    expect(initials(undefined)).toBe('?');
  });

  it('joinUnit and capitalize work', () => {
    expect(joinUnit(5, 'kg')).toBe('5 kg');
    expect(joinUnit(5.5)).toBe('5.5 kg');
    expect(capitalize('tomato')).toBe('Tomato');
  });

  it('weatherConditionIcon matches keywords', () => {
    expect(weatherConditionIcon('Sunny')).toBe('☀️');
    expect(weatherConditionIcon('Thunderstorm')).toBe('⛈️');
    expect(weatherConditionIcon('Light rain')).toBe('🌧️');
    expect(weatherConditionIcon('Partly cloudy')).toBe('☁️');
    expect(weatherConditionIcon('Haze')).toBe('🌤️');
  });
});

describe('i18n', () => {
  it('translate resolves in every language', () => {
    expect(translate('nav.marketplace', 'en')).toBe('Marketplace');
    expect(translate('actions.login', 'hi')).not.toBe('actions.login');
    expect(translate('actions.login', 'mr')).not.toBe('actions.login');
    expect(translate('actions.login', 'mr')).toContain('लॉगिन');
  });

  it('t returns the raw key path when missing', () => {
    expect(translate('missing.deep.key', 'en')).toBe('missing.deep.key');
  });

  it('t resolves from an explicit dictionary', () => {
    const dict = { a: { b: 'hello' } } as never;
    expect(t('a.b', dict, 'en')).toBe('hello');
    expect(t('a.c', dict, 'en')).toBe('a.c');
  });
});

describe('validators', () => {
  it('validates Indian mobile numbers', () => {
    expect(isValidMobile('9876543210')).toBe(true);
    expect(isValidMobile(' 9123456780 ')).toBe(true);
    expect(isValidMobile('1234567890')).toBe(false);
    expect(isValidMobile('987654321')).toBe(false);
  });

  it('validates passwords', () => {
    expect(isValidPassword('abcd')).toBe(true);
    expect(isValidPassword('abc')).toBe(false);
  });

  it('validates positive numbers', () => {
    expect(isPositiveNumber('25')).toBe(true);
    expect(isPositiveNumber('0')).toBe(false);
    expect(isPositiveNumber('')).toBe(false);
  });

  it('validateCustomerForm flags bad name/mobile/password', () => {
    expect(validateCustomerForm({ name: 'A', mobile: '1234567890', password: 'abcd' }).valid).toBe(false);
    expect(validateCustomerForm({ name: 'Priya', mobile: '9123456780', password: 'abcd' }).valid).toBe(true);
  });

  it('validateFarmerForm flags invalid land size', () => {
    expect(validateFarmerForm({ name: 'Ramesh', mobile: '9876543210', password: 'abcd', landSize: '-3' }).valid).toBe(
      false,
    );
    expect(validateFarmerForm({ name: 'Ramesh', mobile: '9876543210', password: 'abcd', landSize: '5' }).valid).toBe(
      true,
    );
  });

  it('validateAddressForm checks address and pincode', () => {
    expect(validateAddressForm({ fullAddress: 'Sho' }).valid).toBe(false);
    expect(validateAddressForm({ fullAddress: 'Gandhi Chowk, Pune 411001', pincode: '41100' }).valid).toBe(false);
    expect(validateAddressForm({ fullAddress: 'Gandhi Chowk, Pune 411001', pincode: '411001' }).valid).toBe(true);
  });

  it('validateProductForm checks name, price, quantity', () => {
    expect(validateProductForm({ cropName: 'T', price: '10', quantity: '5' }).valid).toBe(false);
    expect(validateProductForm({ cropName: 'Onion', price: '-2', quantity: '5' }).valid).toBe(false);
    expect(validateProductForm({ cropName: 'Onion', price: '30', quantity: '0' }).valid).toBe(false);
    expect(validateProductForm({ cropName: 'Onion', price: '30', quantity: '40' }).valid).toBe(true);
  });
});

describe('cart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(readCart()).toEqual([]);
    expect(cartCount()).toBe(0);
  });

  it('adds and merges lines', () => {
    addToCart(makeProduct({ id: 1, price: 40 }), 2);
    addToCart(makeProduct({ id: 1, price: 40 }), 3);
    expect(cartCount()).toBe(5);
    const lines = readCart();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(5);
  });

  it('caps quantity at product stock', () => {
    addToCart(makeProduct({ id: 1, quantity: 10 }), 20);
    expect(readCart()[0].quantity).toBe(10);
  });

  it('updates and removes lines', () => {
    addToCart(makeProduct({ id: 1 }), 4);
    updateCartQty(1, 0);
    expect(readCart()).toEqual([]);
    addToCart(makeProduct({ id: 1 }), 4);
    addToCart(makeProduct({ id: 2 }), 1);
    updateCartQty(1, 7);
    expect(readCart()[0].quantity).toBe(7);
    removeFromCart(2);
    expect(readCart().map((l) => l.productId)).toEqual([1]);
  });

  it('clears the cart', () => {
    addToCart(makeProduct({ id: 1 }), 2);
    clearCart();
    expect(localStorage.getItem(CART_KEY)).toBeNull();
  });

  it('computes totals and view lines from a catalog', () => {
    const catalog = new Map<number, Product>([
      [1, makeProduct({ id: 1, price: 40, quantity: 10 })],
      [2, makeProduct({ id: 2, price: 100, quantity: 3 })],
    ]);
    writeCart([
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 3 },
      { productId: 999, quantity: 1 },
    ]);
    expect(cartCount()).toBe(6);
    expect(cartTotal(catalog)).toBe(40 * 2 + 100 * 3);
    const view = cartViewLines(catalog);
    expect(view).toHaveLength(2);
    expect(view[0].lineTotal).toBe(80);
    expect(view[1].lineTotal).toBe(300);
  });

  it('cartLinesWithCatalog resolves provided lines', () => {
    const catalog = new Map<number, Product>([[1, makeProduct({ id: 1, price: 40 })]]);
    const view = cartLinesWithCatalog([{ productId: 1, quantity: 2 }], catalog);
    expect(view[0].product.cropName).toBe('Tomato');
    expect(view[0].lineTotal).toBe(80);
  });
});
