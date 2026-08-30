import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDateTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Order, OrderStatus } from '../../lib/types';

export function FarmerOrdersPage() {
  const { user } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Order[]>(() => api.farmerOrders(user!.id), [user?.id]);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [noteOrder, setNoteOrder] = useState<Order | null>(null);
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null);

  const nextAction = (o: Order): { status: OrderStatus; label: string; dangerous?: boolean } | null => {
    switch (o.status) {
      case 'Pending':
        return { status: 'Confirmed', label: translate('actions.confirmOrder') };
      case 'Confirmed':
        return { status: 'Packed', label: translate('farmer.markPacked') };
      case 'Packed':
        return { status: 'Shipped', label: translate('actions.markShipped') };
      case 'Shipped':
        return { status: 'Delivered', label: translate('actions.markDelivered') };
      default:
        return null;
    }
  };

  const canCancel = (o: Order) => o.status === 'Pending' || o.status === 'Confirmed';

  const advance = async (o: Order) => {
    const action = nextAction(o);
    if (!action) return;
    setBusyId(o.id);
    if (action.status === 'Delivered' || action.status === 'Shipped') {
      setNoteOrder(o);
      setNextStatus(action.status);
      setNote('');
      setBusyId(null);
      return;
    }
    try {
      await api.updateOrderStatus(o.id, action.status);
      successToast(
        translate('orders.statusChanged')
          .replace('{id}', String(o.id))
          .replace('{status}', translate('status.' + action.status)),
      );
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.updateOrderError'));
    } finally {
      setBusyId(null);
    }
  };

  const submitNoteTransition = async () => {
    if (!noteOrder || !nextStatus) return;
    setBusyId(noteOrder.id);
    try {
      await api.updateOrderStatus(noteOrder.id, nextStatus, note.trim() || undefined);
      successToast(
        translate('orders.statusChanged')
          .replace('{id}', String(noteOrder.id))
          .replace('{status}', translate('status.' + nextStatus)),
      );
      setNoteOrder(null);
      setNextStatus(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.updateOrderError'));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (o: Order) => {
    setBusyId(o.id);
    try {
      await api.cancelOrder(o.id, 'Cancelled by farmer');
      successToast(translate('orders.orderCancelled').replace('{id}', String(o.id)));
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('orders.cancelError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title={translate('farmer.incomingOrders')} subtitle={translate('farmer.ordersSubtitle')} icon="📦" />

      {loading ? (
        <PageLoader label={translate('orders.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={translate('orders.noOrders')} message={translate('farmer.noOrdersMsg')} />
      ) : (
        <div className="space-y-4">
          {data.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink-900">
                      {translate('orders.orderId').replace('{id}', String(o.id))}
                    </h3>
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-ink-400">{formatDateTime(o.orderDate)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    {o.cropName} × {o.quantity} {o.unit || ''} · {formatINR(o.totalPrice)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {translate('orders.customer')}: {o.customerName || `#${o.customerId}`}{' '}
                    {o.address ? `· ${translate('orders.deliver').replace('{address}', o.address)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canCancel(o) ? (
                    <Button variant="danger" size="sm" disabled={busyId === o.id} onClick={() => cancel(o)}>
                      {translate('common.cancel')}
                    </Button>
                  ) : null}
                  {nextAction(o) ? (
                    <Button size="sm" disabled={busyId === o.id} onClick={() => advance(o)}>
                      {nextAction(o)!.label}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 border-t border-ink-100 pt-3">
                <p className="mb-1.5 text-xs font-semibold text-ink-500">{translate('orders.timeline')}</p>
                <ol className="flex flex-wrap items-center gap-1.5">
                  {o.timeline.map((t, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 font-medium text-ink-700">
                        {translate('status.' + t.status)}
                      </span>
                      <span className="text-ink-400">{formatDateTime(t.at)}</span>
                      {i < o.timeline.length - 1 ? <span className="text-ink-300">→</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(noteOrder)}
        onClose={() => setNoteOrder(null)}
        title={translate('farmer.advanceOrderTitle').replace('{id}', String(noteOrder?.id ?? ''))}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-700">
            {translate('farmer.markingAs').replace('{status}', translate('status.' + nextStatus))}
            {nextStatus === 'Delivered' ? ` ${translate('farmer.markingDeliveredNote')}` : ''}
          </p>
          <Textarea
            label={translate('farmer.noteFor').replace('{status}', translate('status.' + nextStatus))}
            placeholder={translate('farmer.notePlaceholder')}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setNoteOrder(null)}>
              {translate('common.cancel')}
            </Button>
            <Button type="button" loading={busyId !== null} onClick={submitNoteTransition}>
              {translate('farmer.confirmStatus').replace('{status}', translate('status.' + nextStatus))}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
