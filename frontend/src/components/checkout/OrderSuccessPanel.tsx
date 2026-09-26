import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDateTime } from '../../lib/format';
import { Button } from '../ui/Button';
import { PaymentStatusPill } from './PaymentStatusPill';
import type { Order } from '../../lib/types';

export interface OrderSuccessPanelProps {
  orders: Order[];
  method: 'razorpay' | 'cod' | null;
  onContinueShopping: () => void;
}

/**
 * Post-checkout confirmation. Shows exactly what happened and the three things
 * a customer wants next: track the order, see all orders, or keep shopping.
 */
export function OrderSuccessPanel({ orders, method, onContinueShopping }: OrderSuccessPanelProps) {
  const { translate } = useI18n();
  const navigate = useNavigate();

  if (orders.length === 0) return null;

  const total = orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
  const paidOnline = method === 'razorpay';
  const first = orders[0];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-crop-200 bg-white shadow-sm">
        <div className="flex flex-col items-center bg-crop-50 px-6 py-8 text-center">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-full bg-crop-600 text-2xl text-white shadow-sm"
          >
            ✓
          </span>
          <h2 className="mt-3 text-xl font-bold text-ink-900">
            {paidOnline ? translate('pay.successPaidTitle') : translate('pay.successCodTitle')}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-ink-600">
            {paidOnline ? translate('pay.successPaidHint') : translate('pay.successCodHint')}
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3.5 py-2.5">
            <span className="text-xs font-medium text-ink-500">{translate('pay.orderNumber')}</span>
            <span className="text-sm font-semibold text-ink-900">
              {orders.length === 1
                ? `#${first.id}`
                : translate('pay.orderNumbers').replace('{ids}', orders.map((o) => `#${o.id}`).join(', '))}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3.5 py-2.5">
            <span className="text-xs font-medium text-ink-500">{translate('pay.amount')}</span>
            <span className="text-sm font-semibold text-ink-900">{formatINR(total)}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3.5 py-2.5">
            <span className="text-xs font-medium text-ink-500">{translate('pay.method')}</span>
            <PaymentStatusPill order={first} showMethod />
          </div>

          <ul className="space-y-1.5 pt-1">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm text-ink-600">
                <span className="min-w-0 truncate">
                  #{o.id} · {o.cropName} × {o.quantity} {o.unit || ''}
                </span>
                <span className="shrink-0 font-medium text-ink-800">{formatINR(o.totalPrice)}</span>
              </li>
            ))}
          </ul>

          {first.orderDate ? (
            <p className="text-xs text-ink-400">
              {translate('pay.placedAt').replace('{date}', formatDateTime(first.orderDate))}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-ink-100 bg-ink-50/60 p-4 sm:grid-cols-3">
          <Button variant="primary" size="sm" onClick={onContinueShopping} fullWidth>
            🛒 {translate('pay.continueShopping')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/customer/orders')} fullWidth>
            📋 {translate('pay.myOrders')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/customer/orders')} fullWidth>
            🚚 {translate('pay.trackOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
}
