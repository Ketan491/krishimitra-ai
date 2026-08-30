import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../contexts/ToastContext';
import { formatINR, formatNumber } from '../../lib/format';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageLoader, ErrorState } from '../../components/ui/StateComponents';
import { Button } from '../../components/ui/Button';
import { useAsync } from '../../hooks/useAsync';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { AdminSummary } from '../../lib/types';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Confirmed: '#3B82F6',
  Packed: '#8B5CF6',
  Shipped: '#0EA5E9',
  Delivered: '#16A34A',
  Reviewed: '#15803D',
  Cancelled: '#EF4444',
};

export function AdminDashboardPage() {
  const { data, loading, error, refetch } = useAsync<AdminSummary>(() => api.adminSummary(), []);
  const { translate } = useI18n();
  const { errorToast } = useToast();
  const revenueLabel = translate('admin.revenue');
  const ordersLabel = translate('nav.orders');

  const handleExport = async () => {
    try {
      await api.adminExport();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.exportError'));
    }
  };

  if (loading) return <PageLoader label={translate('common.loading')} />;
  if (error || !data) return <ErrorState message={error || translate('admin.loadSummaryError')} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={translate('nav.farmers')} value={data.farmers} icon="🚜" accent="green" />
        <StatCard label={translate('nav.customers')} value={data.customers} icon="🛒" accent="soil" />
        <StatCard label={translate('admin.products')} value={data.products} icon="🧺" accent="harvest" />
        <StatCard label={translate('admin.revenue')} value={formatINR(data.revenue)} icon="💰" accent="sky" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={translate('admin.pendingApprovals')} value={data.pendingProducts} icon="⏳" accent="harvest" />
        <StatCard label={ordersLabel} value={data.orders} icon="📦" accent="green" />
        <StatCard label={translate('nav.reviews')} value={data.reviews} icon="⭐" accent="soil" />
        <StatCard label={translate('admin.avgOrder')} value={formatINR(data.avgOrderValue)} icon="📊" accent="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={translate('admin.ordersRevenueChart')} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.orderTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="orders" tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(value, name) => (name === revenueLabel ? formatINR(Number(value ?? 0)) : value)} />
                <Legend />
                <Bar yAxisId="orders" dataKey="orders" name={ordersLabel} fill="#1B5E20" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="revenue" dataKey="revenue" name={revenueLabel} fill="#FFB300" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={translate('admin.ordersByStatus')} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  label={({ name }) => translate(`status.${String(name)}`)}
                >
                  {data.statusBreakdown.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip formatter={(_value, name) => translate(`status.${String(name)}`)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={translate('admin.topCrops')} />
          {data.topCrops.length ? (
            <div className="space-y-3">
              {data.topCrops.map((c, i) => {
                const max = Math.max(1, ...data.topCrops.map((t) => t.listings));
                return (
                  <div key={c.crop}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-ink-800">
                        {i + 1}. {c.crop}
                      </span>
                      <span className="text-ink-500">
                        {translate('admin.listingsCount').replace('{count}', String(c.listings))}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-ink-100">
                      <div className="h-2 rounded-full bg-crop-600" style={{ width: `${(c.listings / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-500">{translate('admin.noListings')}</p>
          )}
        </Card>

        <Card>
          <CardHeader title={translate('admin.inventory')} subtitle={translate('admin.inventorySubtitle')} />
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              [translate('admin.cropDbEntries'), data.cropCatalog],
              [translate('nav.schemes'), data.schemes],
              [translate('nav.equipment'), data.equipment],
              [translate('admin.recommendations'), data.recommendations],
              [translate('admin.pendingOrders'), data.pendingOrders],
              [translate('admin.auditEntries'), data.audits],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-ink-50 px-3 py-2.5">
                <p className="text-xs text-ink-500">{k}</p>
                <p className="text-lg font-bold text-ink-900">{formatNumber(Number(v))}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            {translate('admin.exportDataJson')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
