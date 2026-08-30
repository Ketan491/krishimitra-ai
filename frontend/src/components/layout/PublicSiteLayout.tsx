import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavLinkItem = { to: string; key: string };

const NAV_LINKS: NavLinkItem[] = [
  { to: '/crops-db', key: 'site.navCropsDb' },
  { to: '/market', key: 'site.navMarketplace' },
  { to: '/schemes', key: 'site.navSchemes' },
  { to: '/weather', key: 'site.navWeather' },
  { to: '/disease', key: 'site.navDisease' },
];

function navLinks(items: NavLinkItem[], translate: (key: string) => string) {
  return items.map((l) => ({ to: l.to, label: translate(l.key) }));
}

export function PublicSiteLayout() {
  const { isLoggedIn, role } = useAuth();
  const { translate } = useI18n();
  const homeHref = isLoggedIn && role ? `/${role}` : '/';
  const links = navLinks(NAV_LINKS, translate);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="KrishiMitra" className="h-9 w-auto" />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-crop-50 text-crop-800' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher compact />
            {isLoggedIn ? (
              <Link to={homeHref}>
                <Button size="md">{translate('nav.dashboard')}</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="md">
                    {translate('actions.login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="md">{translate('actions.register')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-200 bg-ink-900 py-10 text-ink-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-white">KrishiMitra AI</p>
            <p className="text-sm text-ink-400">{translate('site.footerTagline')}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-white">{translate('site.footerPlatform')}</p>
            <ul className="space-y-1.5 text-sm">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-ink-400 hover:text-crop-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-ink-800 pt-5 text-center text-xs text-ink-500">
          {translate('site.copyright').replace('{year}', String(new Date().getFullYear()))}
        </div>
      </footer>
    </div>
  );
}
