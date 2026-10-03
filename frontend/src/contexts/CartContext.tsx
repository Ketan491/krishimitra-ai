import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../lib/types';
import { cartCount, readCart, writeCart } from '../lib/cart';
import type { CartLine } from '../lib/cart';

export interface CartContextValue {
  count: number;
  lines: CartLine[];
  refresh: () => void;
  setLineQuantity: (productId: number, quantity: number) => void;
  addLineQuantity: (productId: number, quantity: number, maxQuantity?: number) => void;
  removeProduct: (productId: number) => void;
  clearCart: () => void;
  syncFromServer: (products: Product[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ count: number; lines: CartLine[] }>(() => {
    const lines = readCart();
    return { count: lines.reduce((s, l) => s + l.quantity, 0), lines };
  });

  const refresh = useCallback(() => {
    const lines = readCart();
    setState({ count: lines.reduce((s, l) => s + l.quantity, 0), lines });
  }, []);

  const setLineQuantity = useCallback((productId: number, quantity: number) => {
    setState((prev) => {
      let next =
        quantity > 0
          ? prev.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l))
          : prev.lines.filter((l) => l.productId !== productId);
      if (quantity > 0 && !next.some((l) => l.productId === productId)) {
        next = [...next, { productId, quantity }];
      }
      writeCart(next);
      return { count: next.reduce((s, l) => s + l.quantity, 0), lines: next };
    });
  }, []);

  // "Add to cart" is additive: tapping it again on a product already in the
  // cart should increase that line, not silently reset it back to the
  // quantity picked on the product page. Capped at the stock the caller knows
  // about so a line can never exceed what the farmer has available.
  const addLineQuantity = useCallback((productId: number, quantity: number, maxQuantity?: number) => {
    setState((prev) => {
      if (quantity <= 0) return prev;
      const existing = prev.lines.find((l) => l.productId === productId);
      const wanted = (existing ? existing.quantity : 0) + quantity;
      const capped = maxQuantity && maxQuantity > 0 ? Math.min(maxQuantity, wanted) : wanted;
      const nextQty = Math.max(1, capped);
      const next = existing
        ? prev.lines.map((l) => (l.productId === productId ? { ...l, quantity: nextQty } : l))
        : [...prev.lines, { productId, quantity: nextQty }];
      writeCart(next);
      return { count: next.reduce((s, l) => s + l.quantity, 0), lines: next };
    });
  }, []);

  const removeProduct = useCallback((productId: number) => {
    setState((prev) => {
      const next = prev.lines.filter((l) => l.productId !== productId);
      writeCart(next);
      return { count: next.reduce((s, l) => s + l.quantity, 0), lines: next };
    });
  }, []);

  const clearCart = useCallback(() => {
    writeCart([]);
    setState({ count: 0, lines: [] });
  }, []);

  const syncFromServer = useCallback((products: Product[]) => {
    const validIds = new Set(products.map((p) => p.id));
    setState((prev) => {
      const next = prev.lines.filter((l) => validIds.has(l.productId));
      if (next.length === prev.lines.length) return prev;
      writeCart(next);
      return { count: next.reduce((s, l) => s + l.quantity, 0), lines: next };
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      count: state.count,
      lines: state.lines,
      refresh,
      setLineQuantity,
      addLineQuantity,
      removeProduct,
      clearCart,
      syncFromServer,
    }),
    [state, refresh, setLineQuantity, addLineQuantity, removeProduct, clearCart, syncFromServer],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

void cartCount;
