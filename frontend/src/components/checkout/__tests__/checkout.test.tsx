import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../../contexts/I18nContext';
import { PaymentMethodSelector } from '../PaymentMethodSelector';
import { OrderSuccessPanel } from '../OrderSuccessPanel';
import { PaymentStatusPill } from '../PaymentStatusPill';
import type { Order, PaymentConfig } from '../../../lib/types';

// The checkout components localise every string and OrderSuccessPanel links out
// to /customer/orders, so both providers are mounted for real.
function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>,
  );
}

const ONLINE_CONFIG: PaymentConfig = {
  enabled: true,
  keyId: 'rzp_test_key',
  currency: 'INR',
  providerName: 'KrishiMitraa',
  codEnabled: true,
  codMaxAmount: 25000,
};

const OFFLINE_CONFIG: PaymentConfig = { ...ONLINE_CONFIG, enabled: false, keyId: '' };
const COD_DISABLED_CONFIG: PaymentConfig = { ...ONLINE_CONFIG, codEnabled: false };
const NO_METHODS_CONFIG: PaymentConfig = { ...ONLINE_CONFIG, enabled: false, keyId: '', codEnabled: false };

const onlineRadio = () => screen.getByRole('radio', { name: /pay online|online payment/i });
const codRadio = () => screen.getByRole('radio', { name: /cash on delivery/i });

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: 11,
    productId: 3,
    cropName: 'Onion',
    quantity: 2,
    totalPrice: 40,
    status: 'Pending',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    orderDate: '2026-01-15T10:30:00.000Z',
    address: 'Test Street, Pune',
    ...over,
  } as Order;
}

describe('PaymentMethodSelector', () => {
  it('offers both methods when online is available and the total is under the COD cap', () => {
    renderWithProviders(
      <PaymentMethodSelector config={ONLINE_CONFIG} method="razorpay" onChange={() => {}} total={500} />,
    );
    expect(onlineRadio()).toBeEnabled();
    expect(onlineRadio()).toBeChecked();
    expect(codRadio()).toBeEnabled();
  });

  it('calls onChange when the shopper picks cash on delivery', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <PaymentMethodSelector config={ONLINE_CONFIG} method="razorpay" onChange={onChange} total={500} />,
    );
    await userEvent.click(codRadio());
    expect(onChange).toHaveBeenCalledWith('cod');
  });

  it('blocks cash on delivery above the configured cap and says why', () => {
    renderWithProviders(
      <PaymentMethodSelector config={ONLINE_CONFIG} method="razorpay" onChange={() => {}} total={30000} />,
    );
    expect(codRadio()).toBeDisabled();
    expect(within(codRadio()).getByText(/not available for orders above/i)).toBeInTheDocument();
  });

  it('allows COD exactly at the cap', () => {
    renderWithProviders(
      <PaymentMethodSelector config={ONLINE_CONFIG} method="razorpay" onChange={() => {}} total={25000} />,
    );
    expect(codRadio()).toBeEnabled();
  });

  it('disables online payment when Razorpay keys are missing', () => {
    renderWithProviders(
      <PaymentMethodSelector config={OFFLINE_CONFIG} method="cod" onChange={() => {}} total={500} />,
    );
    expect(onlineRadio()).toBeDisabled();
    expect(codRadio()).toBeEnabled();
    expect(codRadio()).toBeChecked();
  });

  it('disables cash on delivery when the feature is switched off', () => {
    renderWithProviders(
      <PaymentMethodSelector config={COD_DISABLED_CONFIG} method="razorpay" onChange={() => {}} total={500} />,
    );
    expect(onlineRadio()).toBeEnabled();
    expect(codRadio()).toBeDisabled();
  });

  it('explains when no payment method is available at all', () => {
    renderWithProviders(
      <PaymentMethodSelector config={NO_METHODS_CONFIG} method="razorpay" onChange={() => {}} total={500} />,
    );
    expect(onlineRadio()).toBeDisabled();
    expect(codRadio()).toBeDisabled();
    expect(screen.getByText(/no payment method is available/i)).toBeInTheDocument();
  });

  it('tells the shopper to keep cash ready for COD', () => {
    renderWithProviders(
      <PaymentMethodSelector config={ONLINE_CONFIG} method="cod" onChange={() => {}} total={500} />,
    );
    expect(screen.getByText(/exact amount ready/i)).toBeInTheDocument();
  });

  it('does not let the shopper change method mid-checkout', () => {
    renderWithProviders(
      <PaymentMethodSelector config={ONLINE_CONFIG} method="cod" onChange={() => {}} total={500} disabled />,
    );
    expect(onlineRadio()).toBeDisabled();
    expect(codRadio()).toBeDisabled();
  });
});

describe('OrderSuccessPanel', () => {
  it('confirms a COD order as awaiting collection, not paid', () => {
    renderWithProviders(
      <OrderSuccessPanel orders={[makeOrder()]} method="cod" onContinueShopping={() => {}} />,
    );
    expect(screen.getAllByText(/cash on delivery/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^paid$/i)).toBeNull();
    expect(screen.getByText(/Pay the farmer in cash on delivery/i)).toBeInTheDocument();
  });

  it('confirms a paid online order', () => {
    renderWithProviders(
      <OrderSuccessPanel
        orders={[makeOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid' })]}
        method="razorpay"
        onContinueShopping={() => {}}
      />,
    );
    expect(screen.getByText(/paid/i)).toBeInTheDocument();
  });

  it('provides track order, my orders and continue shopping shortcuts', () => {
    renderWithProviders(
      <OrderSuccessPanel orders={[makeOrder()]} method="cod" onContinueShopping={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /track order/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my orders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue shopping/i })).toBeInTheDocument();
  });

  it('calls onContinueShopping when the shopper keeps browsing', async () => {
    const onContinueShopping = vi.fn();
    renderWithProviders(
      <OrderSuccessPanel orders={[makeOrder()]} method="cod" onContinueShopping={onContinueShopping} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /continue shopping/i }));
    expect(onContinueShopping).toHaveBeenCalled();
  });

  it('renders one block per order in a multi-item checkout', () => {
    renderWithProviders(
      <OrderSuccessPanel
        orders={[makeOrder({ id: 1, cropName: 'Onion' }), makeOrder({ id: 2, cropName: 'Tomato' })]}
        method="cod"
        onContinueShopping={() => {}}
      />,
    );
    expect(screen.getAllByText(/Onion/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tomato/).length).toBeGreaterThan(0);
  });
});

describe('PaymentStatusPill', () => {
  it('shows the method and an unpaid COD order', () => {
    renderWithProviders(<PaymentStatusPill order={makeOrder()} showMethod />);
    expect(screen.getAllByText(/cash on delivery/i).length).toBeGreaterThan(0);
  });

  it('shows a paid online order', () => {
    renderWithProviders(
      <PaymentStatusPill order={makeOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid' })} />,
    );
    expect(screen.getByText(/paid/i)).toBeInTheDocument();
  });

  it('treats a missing payment method as legacy cash on delivery', () => {
    renderWithProviders(<PaymentStatusPill order={makeOrder({ paymentMethod: undefined })} showMethod />);
    expect(screen.getAllByText(/cash on delivery/i).length).toBeGreaterThan(0);
  });
});
