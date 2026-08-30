import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDate, weatherConditionIcon } from '../../lib/format';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { StatusBadge, ApprovalBadge } from '../../components/ui/Badge';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { FadeIn } from '../../components/motion/FadeIn';
import { useAsync } from '../../hooks/useAsync';
import type { FarmerDashboard } from '../../lib/types';

export function FarmerDashboardPage() {
  const { user } = useAuth();
  const { translate } = useI18n();
  const { data, loading, error, refetch } = useAsync<FarmerDashboard>(() => api.farmerDashboard(user!.id), [user?.id]);

  if (loading) return <PageLoader label={translate('farmer.dashboardLoading')} />;
  if (error || !data) return <ErrorState message={error || translate('farmer.dashboardLoadError')} onRetry={refetch} />;

  const { farm, stats, weather, cropSuggestion, recentOrders, listedProducts, alerts } = data;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink-900">
              {translate('farmer.greeting').replace('{name}', user?.name || '')}
            </h2>
            <p className="text-sm text-ink-500">
              {translate('farmer.farmSummary')
                .replace('{location}', farm.location || translate('farmer.yourFarm'))
                .replace('{landSize}', String(farm.landSize))
                .replace('{soilType}', farm.soilType)}
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn y={10}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={translate('farmer.activeListings')} value={stats.activeListings} icon="🧺" accent="green" />
          <StatCard label={translate('farmer.pendingOrders')} value={stats.pendingOrders} icon="⏳" accent="harvest" />
          <StatCard label={translate('farmer.productsSold')} value={stats.productsSold} icon="📦" accent="soil" />
          <StatCard label={translate('farmer.revenue')} value={formatINR(stats.revenue)} icon="💰" accent="sky" />
        </div>
      </FadeIn>

      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                a.type === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-harvest-200 bg-harvest-50 text-harvest-600'
              }`}
            >
              <span>{a.type === 'danger' ? '⚠️' : '💡'}</span>
              <p className="flex-1">{a.message}</p>
              {a.to ? (
                <Link to={a.to} className="font-semibold underline">
                  {translate('farmer.alertView')}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title={translate('farmer.weatherToday')}
            subtitle={weather.location}
            action={<span className="text-2xl">{weatherConditionIcon(weather.current.condition)}</span>}
          />
          <p className="text-3xl font-extrabold text-ink-900">{weather.current.temp_max}°C</p>
          <p className="text-sm text-ink-500">
            {weather.current.condition} ·{' '}
            {translate('farmer.humidity').replace('{value}', String(weather.current.humidity))}
          </p>
          <p className="mt-1 text-sm text-sky-600">
            {translate('farmer.rainProbability').replace('{value}', String(weather.current.rainfall_probability))}
          </p>
        </Card>

        <Card>
          <CardHeader
            title={translate('farmer.cropSuggestion')}
            action={
              cropSuggestion.exactMatch ? <span className="text-xl">✅</span> : <span className="text-xl">🌾</span>
            }
          />
          {cropSuggestion.results.length ? (
            <ul className="space-y-2">
              {cropSuggestion.results.slice(0, 3).map((r) => (
                <li key={r.crop} className="rounded-lg bg-crop-50 px-3 py-2 text-sm font-medium text-crop-900">
                  {r.crop}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">{translate('farmer.noSuggestions')}</p>
          )}
          <Link
            to="/farmer/recommend"
            className="mt-3 inline-block text-xs font-semibold text-crop-700 hover:underline"
          >
            {translate('farmer.runAdvisor')}
          </Link>
        </Card>

        <Card>
          <CardHeader title={translate('farmer.recentOrders')} subtitle={translate('farmer.nearbyDeliveries')} />
          {recentOrders.length === 0 ? (
            <p className="text-sm text-ink-500">{translate('farmer.recentOrdersEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {recentOrders.slice(0, 4).map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                  <span className="font-medium text-ink-800">
                    #{o.id} · {o.cropName}
                  </span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title={translate('farmer.yourListings')}
          subtitle={translate('farmer.marketplaceVisibility')}
          action={
            <Link to="/farmer/products" className="text-xs font-semibold text-crop-700 hover:underline">
              {translate('farmer.manageListings')}
            </Link>
          }
        />
        {listedProducts.length === 0 ? (
          <EmptyState title={translate('farmer.noListings')} message={translate('farmer.noListingsMsg')} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listedProducts.map((p) => (
              <div key={p.id} className="rounded-xl border border-ink-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink-900">{p.cropName}</p>
                  <ApprovalBadge approved={p.approved} />
                </div>
                <p className="text-xs text-ink-500">
                  {formatDate(p.createdAt)} · {p.quantity} {p.unit}
                </p>
                <p className="mt-1 font-bold text-crop-800">{formatINR(p.price)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
