import { useI18n } from '../contexts/I18nContext';
import { DashboardShell, SidebarItem } from '../components/layout/DashboardShell';

export function FarmerLayout() {
  const { translate } = useI18n();
  const groups: { heading?: string; items: SidebarItem[] }[] = [
    {
      items: [
        { to: '/farmer', label: translate('nav.dashboard'), icon: '🏠', end: true },
        { to: '/farmer/crops', label: translate('nav.crops'), icon: '🌱' },
        { to: '/farmer/products', label: translate('nav.products'), icon: '🧺' },
        { to: '/farmer/orders', label: translate('nav.orders'), icon: '📦' },
      ],
    },
    {
      heading: translate('nav.recommend'),
      items: [
        { to: '/farmer/recommend', label: translate('nav.recommend'), icon: '🧭' },
        { to: '/farmer/yield', label: translate('nav.yield'), icon: '📈' },
        { to: '/farmer/disease', label: translate('nav.disease'), icon: '🔬' },
        { to: '/farmer/prices', label: translate('nav.prices'), icon: '💰' },
        { to: '/farmer/weather', label: translate('nav.weather'), icon: '⛅' },
        { to: '/farmer/chatbot', label: translate('nav.chat'), icon: '🤖' },
        { to: '/farmer/schemes', label: translate('nav.schemes'), icon: '🏛️' },
        { to: '/farmer/equipment', label: translate('nav.equipment'), icon: '🚜' },
      ],
    },
    {
      heading: translate('nav.profile'),
      items: [{ to: '/farmer/profile', label: translate('nav.profile'), icon: '👤' }],
    },
  ];
  return <DashboardShell title={translate('farmer.title')} groups={groups} accent="green" />;
}
