import { useI18n } from '../contexts/I18nContext';
import { DashboardShell, SidebarItem } from '../components/layout/DashboardShell';

export function AdminLayout() {
  const { translate } = useI18n();
  const groups: { heading?: string; items: SidebarItem[] }[] = [
    {
      items: [
        { to: '/admin', label: translate('admin.summary'), icon: '🏠', end: true },
        { to: '/admin/users', label: translate('nav.users'), icon: '👥' },
        { to: '/admin/products', label: translate('nav.products'), icon: '🧺' },
        { to: '/admin/orders', label: translate('nav.orders'), icon: '📦' },
        { to: '/admin/reviews', label: translate('nav.reviews'), icon: '⭐' },
      ],
    },
    {
      heading: translate('nav.marketplace'),
      items: [
        { to: '/admin/crops', label: translate('nav.process'), icon: '🌱' },
        { to: '/admin/schemes', label: translate('nav.schemes'), icon: '🏛️' },
        { to: '/admin/equipment', label: translate('nav.equipment'), icon: '🚜' },
      ],
    },
    {
      heading: translate('nav.audit'),
      items: [{ to: '/admin/audit', label: translate('nav.audit'), icon: '📋' }],
    },
  ];
  return <DashboardShell title={translate('admin.title')} groups={groups} accent="sky" />;
}
