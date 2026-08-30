import type { Product } from './types';

export interface CartLine {
  productId: number;
  quantity: number;
}

export interface CartViewLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export const CART_KEY = 'km_cart_v1';

export function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => l && typeof l.productId === 'number' && typeof l.quantity === 'number' && l.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export function addToCart(product: Product, quantity = 1): CartLine[] {
  const lines = readCart();
  const existing = lines.find((l) => l.productId === product.id);
  const max = Math.max(1, product.quantity || 1);
  if (existing) {
    existing.quantity = Math.min(max, existing.quantity + quantity);
  } else {
    lines.push({ productId: product.id, quantity: Math.min(max, quantity) });
  }
  writeCart(lines);
  return lines;
}

export function updateCartQty(productId: number, quantity: number): CartLine[] {
  const lines = readCart();
  const line = lines.find((l) => l.productId === productId);
  if (!line) return lines;
  if (quantity <= 0) {
    return removeFromCart(productId);
  }
  line.quantity = quantity;
  writeCart(lines);
  return lines;
}

export function removeFromCart(productId: number): CartLine[] {
  const lines = readCart().filter((l) => l.productId !== productId);
  writeCart(lines);
  return lines;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}

export function cartCount(): number {
  return readCart().reduce((sum, l) => sum + l.quantity, 0);
}

export function cartTotal(catalog: Map<number, Product>): number {
  return readCart().reduce((sum, l) => {
    const p = catalog.get(l.productId);
    return sum + (p ? p.price * l.quantity : 0);
  }, 0);
}

export function cartViewLines(catalog: Map<number, Product>): CartViewLine[] {
  return readCart()
    .map((l) => {
      const product = catalog.get(l.productId);
      if (!product) return null;
      return { product, quantity: l.quantity, lineTotal: product.price * l.quantity };
    })
    .filter((x): x is CartViewLine => x !== null);
}

export function cartLinesWithCatalog(lines: CartLine[], catalog: Map<number, Product>): CartViewLine[] {
  return lines
    .map((l) => {
      const product = catalog.get(l.productId);
      if (!product) return null;
      return { product, quantity: l.quantity, lineTotal: product.price * l.quantity };
    })
    .filter((x): x is CartViewLine => x !== null);
}
