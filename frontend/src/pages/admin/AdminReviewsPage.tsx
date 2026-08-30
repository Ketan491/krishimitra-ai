import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { RatingStars } from '../../components/ui/RatingStars';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Review } from '../../lib/types';

export function AdminReviewsPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Review[]>(() => api.adminReviews(), []);
  const [busyId, setBusyId] = useState<number | null>(null);

  const doDelete = async (id: number) => {
    setBusyId(id);
    try {
      await api.adminDeleteReview(id);
      successToast(translate('admin.reviewRemoved'));
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.reviewDeleteError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('nav.reviews')}
        subtitle={translate('admin.reviewsCount').replace('{count}', String(data?.length || 0))}
        icon="⭐"
      />

      <DataTable<Review>
        loading={loading}
        rows={data || []}
        rowKey={(r) => r.id}
        emptyTitle={translate('admin.noReviews')}
        emptyMessage={translate('admin.noReviewsMessage')}
        columns={[
          {
            key: 'customer',
            header: translate('admin.customer'),
            render: (r) => (
              <p className="font-semibold text-ink-900">{r.customerName || `Customer #${r.customerId}`}</p>
            ),
          },
          {
            key: 'product',
            header: translate('admin.product'),
            render: (r) => r.cropName || `Product #${r.productId}`,
          },
          { key: 'rating', header: translate('admin.rating'), render: (r) => <RatingStars value={r.rating} /> },
          {
            key: 'comment',
            header: translate('admin.comment'),
            render: (r) => <span className="text-sm text-ink-600">{r.comment || '—'}</span>,
          },
          { key: 'date', header: translate('admin.date'), render: (r) => formatDate(r.createdAt) },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <Button variant="danger" size="sm" disabled={busyId === r.id} onClick={() => doDelete(r.id)}>
                {translate('admin.remove')}
              </Button>
            ),
          },
        ]}
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
