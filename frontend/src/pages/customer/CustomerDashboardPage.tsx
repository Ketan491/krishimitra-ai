import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDate } from '../../lib/format';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader, ErrorState } from '../../components/ui/StateComponents';
import { FadeIn } from '../../components/motion/FadeIn';
import { useAsync } from '../../hooks/useAsync';
import type { Order, WishlistItem } from '../../lib/types';

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const { translate } = useI18n();
  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
  } = useAsync<Order[]>(() => api.customerOrders(user!.id), [user?.id]);
  const { data: wishlist } = useAsync<WishlistItem[]>(() => api.getWishlist(user!.id), [user?.id]);
  const { data: catalog } = useAsync(() => api.listProducts({ limit: 100 }), []);

  if (ordersLoading) return <PageLoader label={translate('customer.dashboardLoading')} />;
  if (ordersError || !orders) return <ErrorState message={ordersError || translate('customer.dashboardLoadError')} />;

  const activeOrders = orders.filter((o) => !['Cancelled', 'Delivered', 'Reviewed'].includes(o.status));
  const spent = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.totalPrice, 0);
  const count = catalog?.total || 0;

  return (
    <div className="space-y-6">
      <FadeIn>
        <h2 className="text-xl font-bold text-ink-900">
          {translate('customer.greeting').replace('{name}', user?.name || '')}
        </h2>
        <p className="text-sm text-ink-500">{translate('customer.buyLocal')}</p>
      </FadeIn>

      <FadeIn y={10}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={translate('customer.activeOrders')} value={activeOrders.length} icon="📦" accent="soil" />
          <StatCard
            label={translate('customer.wishlistSaved')}
            value={wishlist?.length || 0}
            icon="❤️"
            accent="harvest"
          />
          <StatCard label={translate('customer.totalSpent')} value={formatINR(spent)} icon="💰" accent="sky" />
          <StatCard label={translate('customer.itemsInMarket')} value={count} icon="🧺" accent="green" />
        </div>
      </FadeIn>

      <Card>
        <CardHeader
          title={translate('customer.activeOrders')}
          subtitle={translate('customer.trackDeliveries')}
          action={
            <Link to="/customer/orders" className="text-xs font-semibold text-crop-700 hover:underline">
              {translate('customer.allOrders')}
            </Link>
          }
        />
        {activeOrders.length === 0 ? (
          <p className="text-sm text-ink-500">
            {translate('customer.noActiveOrders')}{' '}
            <Link to="/customer/market" className="font-semibold text-crop-700 hover:underline">
              {translate('customer.browseMarketplace')}
            </Link>
          </p>
        ) : (
          <ul className="space-y-2.5">
            {activeOrders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    #{o.id} · {o.cropName} × {o.quantity}
                  </p>
                  <p className="text-xs text-ink-500">
                    {o.farmerName || translate('roles.farmer')} ·{' '}
                    {translate('customer.orderedOn').replace('{date}', formatDate(o.orderDate))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-crop-800">{formatINR(o.totalPrice)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
