import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { RatingStars } from '../../components/ui/RatingStars';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Order } from '../../lib/types';

export function CustomerOrdersPage() {
  const { user } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Order[]>(() => api.customerOrders(user!.id), [user?.id]);

  const [reviewTarget, setReviewTarget] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const openReview = (o: Order) => {
    setReviewTarget(o);
    setRating(5);
    setComment('');
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    setBusy(true);
    try {
      await api.reviewOrder(reviewTarget.id, {
        productId: reviewTarget.productId,
        rating,
        comment: comment.trim() || undefined,
      });
      successToast(translate('customer.reviewThanks'));
      setReviewTarget(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('customer.submitReviewError'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (o: Order) => {
    setBusy(true);
    try {
      await api.cancelOrder(o.id, 'Requested by customer');
      successToast(translate('orders.orderCancelled').replace('{id}', String(o.id)));
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('orders.cancelError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={translate('customer.yourOrders')} subtitle={translate('customer.ordersSubtitle')} icon="📦" />

      {loading ? (
        <PageLoader label={translate('orders.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={translate('orders.noOrders')}
          message={translate('customer.noOrdersMsg')}
          action={<Link to="/customer/market">{translate('customer.browseMarketplaceBtn')}</Link>}
        />
      ) : (
        <div className="space-y-4">
          {data.map((o) => {
            const reviewable = o.status === 'Delivered' && !o.reviewed;
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink-900">
                        #{o.id} · {o.cropName} × {o.quantity} {o.unit || ''}
                      </h3>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      {formatINR(o.totalPrice)} ·{' '}
                      {translate('customer.orderedOn').replace('{date}', formatDateTime(o.orderDate))}
                    </p>
                    {o.farmerName ? (
                      <p className="text-xs text-ink-500">
                        {translate('customer.from').replace('{name}', o.farmerName)}
                        {o.farmerMobile ? ` · ${translate('customer.call').replace('{mobile}', o.farmerMobile)}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {o.status === 'Pending' || o.status === 'Confirmed' ? (
                      <Button variant="danger" size="sm" onClick={() => cancel(o)} disabled={busy}>
                        {translate('common.cancel')}
                      </Button>
                    ) : null}
                    {reviewable ? (
                      <Button size="sm" onClick={() => openReview(o)}>
                        ⭐ {translate('customer.reviewProduct')}
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
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={translate('customer.reviewTitle').replace('{cropName}', reviewTarget?.cropName || '')}
        size="sm"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">{translate('customer.yourRating')}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={translate('customer.nStars').replace('{n}', String(n))}
                  className={`text-3xl transition-transform ${n <= rating ? 'text-harvest-500' : 'text-ink-300 hover:scale-110'} ${n <= rating ? 'scale-110' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label={translate('customer.comment')}
            placeholder={translate('customer.commentPlaceholder')}
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <RatingStars value={rating} showValue />
            <div className="flex gap-3">
              <Button variant="ghost" type="button" onClick={() => setReviewTarget(null)}>
                {translate('common.cancel')}
              </Button>
              <Button type="button" onClick={submitReview} loading={busy}>
                {translate('customer.submitReview')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
