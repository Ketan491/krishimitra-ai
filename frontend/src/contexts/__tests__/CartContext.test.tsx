import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart } from '../CartContext';
import { CART_KEY, readCart } from '../../lib/cart';

/**
 * Regression: ProductDetailPage used to call setLineQuantity(id, qty), which
 * *replaces* a line. Tapping "Add to cart" twice on the same product left the
 * quantity at 1 instead of raising it to 2, because the product page's qty
 * defaults to 1. addLineQuantity is additive and capped at stock.
 */
function Harness() {
  const { count, lines, addLineQuantity, setLineQuantity, removeProduct } = useCart();
  return (
    <div>
      <p data-testid="count">{count}</p>
      <p data-testid="lines">{JSON.stringify(lines)}</p>
      <button type="button" onClick={() => addLineQuantity(1, 1, 10)}>
        add one
      </button>
      <button type="button" onClick={() => addLineQuantity(1, 3, 10)}>
        add three
      </button>
      <button type="button" onClick={() => addLineQuantity(1, 1, 2)}>
        add one capped
      </button>
      <button type="button" onClick={() => addLineQuantity(2, 2, 10)}>
        add other product
      </button>
      <button type="button" onClick={() => setLineQuantity(1, 7)}>
        set to seven
      </button>
      <button type="button" onClick={() => removeProduct(1)}>
        remove one
      </button>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <Harness />
    </CartProvider>,
  );
}

const qtyOf = (productId: number) =>
  (readCart().find((l) => l.productId === productId) || { quantity: 0 }).quantity;

describe('CartContext addLineQuantity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a brand new line when the product is not in the cart', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add one'));
    expect(qtyOf(1)).toBe(1);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('increments an existing line instead of resetting it', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add one'));
    await user.click(screen.getByText('add one'));
    await user.click(screen.getByText('add one'));
    expect(qtyOf(1)).toBe(3);
    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('accumulates the picked quantity across repeated adds', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add one'));
    await user.click(screen.getByText('add three'));
    expect(qtyOf(1)).toBe(4);
  });

  it('never exceeds the stock the caller passes as the cap', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add three'));
    await user.click(screen.getByText('add three'));
    await user.click(screen.getByText('add three'));
    expect(qtyOf(1)).toBe(9);

    await user.click(screen.getByText('add one capped'));
    expect(qtyOf(1)).toBe(2);
  });

  it('keeps other product lines untouched', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add one'));
    await user.click(screen.getByText('add other product'));
    await user.click(screen.getByText('add one'));
    expect(qtyOf(1)).toBe(2);
    expect(qtyOf(2)).toBe(2);
  });

  it('still supports absolute set and remove', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add one'));
    await user.click(screen.getByText('set to seven'));
    expect(qtyOf(1)).toBe(7);
    await user.click(screen.getByText('remove one'));
    expect(qtyOf(1)).toBe(0);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('ignores a non-positive add instead of writing a broken line', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByText('add one'));
    localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 1, quantity: 1 }]));
    await user.click(screen.getByText('add other product'));
    expect(qtyOf(2)).toBe(2);
  });
});
