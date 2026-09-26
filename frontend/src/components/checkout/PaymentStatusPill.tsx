import { useI18n } from '../../contexts/I18nContext';
import type { Order, PaymentMethod, PaymentStatus } from '../../lib/types';

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-crop-100 text-crop-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-ink-100 text-ink-600',
};

const METHOD_ICONS: Record<PaymentMethod, string> = {
  razorpay: '💳',
  cod: '💵',
};

// Dictionaries are flat, so dynamic values resolve through a static key map
// rather than an interpolated key.
const STATUS_KEYS: Record<PaymentStatus, string> = {
  paid: 'pay.statusPaid',
  pending: 'pay.statusPending',
  failed: 'pay.statusFailed',
  refunded: 'pay.statusRefunded',
};

const METHOD_KEYS: Record<PaymentMethod, string> = {
  razorpay: 'pay.methodOnline',
  cod: 'pay.methodCod',
};

export interface PaymentStatusPillProps {
  order: Pick<Order, 'paymentStatus' | 'paymentMethod'>;
  showMethod?: boolean;
}

/** Compact "method + paid/unpaid" chip used in the success panel and order list. */
export function PaymentStatusPill({ order, showMethod = false }: PaymentStatusPillProps) {
  const { translate } = useI18n();

  const method: PaymentMethod = order.paymentMethod === 'razorpay' ? 'razorpay' : 'cod';
  const status: PaymentStatus = order.paymentStatus || 'pending';
  const label = translate(STATUS_KEYS[status]);

  return (
    <span className="inline-flex items-center gap-1.5">
      {showMethod ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-600">
          <span aria-hidden>{METHOD_ICONS[method]}</span>
          {translate(METHOD_KEYS[method])}
        </span>
      ) : null}
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          STATUS_STYLES[status] || STATUS_STYLES.pending
        }`}
      >
        {label}
      </span>
    </span>
  );
}
