import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDate } from '../../lib/format';
import { ApprovalBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import type { Product } from '../../lib/types';

export function AdminProductsPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Product[]>(() => api.adminProducts(), []);

  const setApproval = async (p: Product, approved: boolean) => {
    try {
      await api.adminApproveProduct(p.id, approved);
      successToast(
        approved
          ? translate('admin.productApproved').replace('{name}', p.cropName)
          : translate('admin.productRejected').replace('{name}', p.cropName),
      );
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.updateApprovalError'));
    }
  };

  return (
    <div>
      <PageHeader title={translate('nav.products')} subtitle={translate('admin.productsSubtitle')} icon="🧺" />

      <DataTable<Product>
        loading={loading}
        rows={data || []}
        rowKey={(r) => r.id}
        emptyTitle={translate('admin.noProducts')}
        emptyMessage={translate('admin.noProductsMessage')}
        columns={[
          {
            key: 'product',
            header: translate('admin.product'),
            render: (r) => (
              <div className="flex items-center gap-3">
                <ImageWithFallback
                  src={r.photoUrl}
                  alt={r.cropName}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
                <div>
                  <p className="font-semibold text-ink-900">
                    {r.cropName} {r.organic ? '· 🌱' : ''}
                  </p>
                  <p className="text-xs text-ink-500">
                    {translate('admin.byLine')
                      .replace('{name}', r.farmerName || '')
                      .replace('{location}', r.location || '—')}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'price',
            header: translate('admin.price'),
            render: (r) => (
              <span className="font-semibold text-crop-800">
                {formatINR(r.price)}/{r.unit}
              </span>
            ),
          },
          { key: 'qty', header: translate('admin.quantity'), render: (r) => `${r.quantity} ${r.unit}` },
          { key: 'listed', header: translate('admin.listed'), render: (r) => formatDate(r.createdAt) },
          { key: 'status', header: translate('admin.status'), render: (r) => <ApprovalBadge approved={r.approved} /> },
          {
            key: 'actions',
            header: translate('admin.actions'),
            render: (r) =>
              r.approved === true ? (
                <Button variant="outline" size="sm" onClick={() => setApproval(r, false)}>
                  {translate('admin.rejectOrUnlist')}
                </Button>
              ) : r.approved === false ? (
                <Button variant="success" size="sm" onClick={() => setApproval(r, true)}>
                  {translate('actions.approve')}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setApproval(r, true)}>
                    {translate('actions.approve')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setApproval(r, false)}>
                    {translate('actions.reject')}
                  </Button>
                </div>
              ),
          },
        ]}
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
