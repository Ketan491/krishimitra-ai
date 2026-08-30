import { useI18n } from '../contexts/I18nContext';
import { DashboardShell, SidebarItem } from '../components/layout/DashboardShell';

export function CustomerLayout() {
  const { translate } = useI18n();
  const groups: { heading?: string; items: SidebarItem[] }[] = [
    {
      items: [
        { to: '/customer', label: translate('nav.dashboard'), icon: '🏠', end: true },
        { to: '/customer/market', label: translate('nav.marketplace'), icon: '🛒' },
        { to: '/customer/cart', label: translate('nav.cart'), icon: '🧺' },
        { to: '/customer/orders', label: translate('nav.orders'), icon: '📦' },
        { to: '/customer/wishlist', label: translate('nav.wishlist'), icon: '❤️' },
      ],
    },
    {
      heading: translate('nav.recommend'),
      items: [
        { to: '/customer/recommend', label: translate('nav.recommend'), icon: '🧭' },
        { to: '/customer/prices', label: translate('nav.prices'), icon: '💰' },
        { to: '/customer/weather', label: translate('nav.weather'), icon: '⛅' },
        { to: '/customer/disease', label: translate('nav.disease'), icon: '🔬' },
        { to: '/customer/schemes', label: translate('nav.schemes'), icon: '🏛️' },
      ],
    },
    {
      heading: translate('nav.profile'),
      items: [{ to: '/customer/profile', label: translate('nav.profile'), icon: '👤' }],
    },
  ];
  return <DashboardShell title={translate('customer.title')} groups={groups} accent="soil" />;
}
