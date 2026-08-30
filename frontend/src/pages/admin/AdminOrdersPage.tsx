import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDateTime } from '../../lib/format';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Order, OrderStatus } from '../../lib/types';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  Pending: 'Confirmed',
  Confirmed: 'Packed',
  Packed: 'Shipped',
  Shipped: 'Delivered',
};

export function AdminOrdersPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Order[]>(() => api.adminOrders(), []);
  const [busyId, setBusyId] = useState<number | null>(null);

  const advance = async (o: Order) => {
    const next = NEXT[o.status];
    if (!next) return;
    setBusyId(o.id);
    try {
      await api.updateOrderStatus(o.id, next);
      successToast(
        translate('admin.ordersAdvanced')
          .replace('{id}', String(o.id))
          .replace('{status}', translate(`status.${next}`)),
      );
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.updateOrderError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title={translate('nav.orders')} subtitle={translate('admin.ordersSubtitle')} icon="📦" />

      <DataTable<Order>
        loading={loading}
        rows={data || []}
        rowKey={(r) => r.id}
        emptyTitle={translate('admin.noOrders')}
        emptyMessage={translate('admin.noOrdersMessage')}
        columns={[
          {
            key: 'id',
            header: translate('orders.orderIdHeader'),
            render: (r) => <span className="font-semibold text-ink-900">#{r.id}</span>,
          },
          {
            key: 'matter',
            header: translate('admin.forFrom'),
            render: (r) => (
              <div>
                <p className="font-medium text-ink-800">
                  {r.cropName} × {r.quantity}
                </p>
                <p className="text-xs text-ink-500">
                  {r.customerName || `C#${r.customerId}`} ← {r.farmerName || `F#${r.farmerId}`}
                </p>
              </div>
            ),
          },
          {
            key: 'total',
            header: translate('orders.total'),
            render: (r) => <span className="font-semibold text-crop-800">{formatINR(r.totalPrice)}</span>,
          },
          { key: 'date', header: translate('orders.placedOn'), render: (r) => formatDateTime(r.orderDate) },
          { key: 'status', header: translate('orders.status'), render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'actions',
            header: translate('admin.actions'),
            render: (r) =>
              NEXT[r.status] ? (
                <Button size="sm" disabled={busyId === r.id} onClick={() => advance(r)}>
                  {translate('admin.advanceStatus').replace('{status}', translate(`status.${NEXT[r.status]}`))}
                </Button>
              ) : (
                <span className="text-xs text-ink-400">—</span>
              ),
          },
        ]}
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {data && data.length ? <p className="mt-3 text-xs text-ink-400">{translate('admin.ordersTip')}</p> : null}
    </div>
  );
}
