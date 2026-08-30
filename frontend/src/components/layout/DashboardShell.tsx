import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Avatar } from '../ui/Avatar';
import { LanguageSwitcher } from './LanguageSwitcher';

export interface SidebarItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

export interface DashboardShellProps {
  title: string;
  groups: { heading?: string; items: SidebarItem[] }[];
  accent?: 'green' | 'soil' | 'sky';
  children?: ReactNode;
}

const ACCENT_ACTIVE = {
  green: 'bg-crop-700 text-white shadow-sm',
  soil: 'bg-soil-600 text-white shadow-sm',
  sky: 'bg-sky-600 text-white shadow-sm',
};

export function DashboardShell({ title, groups, accent = 'green', children }: DashboardShellProps) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { translate } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleHome = role === 'farmer' ? '/farmer' : role === 'customer' ? '/customer' : '/admin';

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-ink-200">
      <div className="flex items-center px-5 py-5">
        <NavLink to={roleHome} className="flex items-center gap-3">
          <img src="/logo-light.svg" alt="KrishiMitra" className="h-9 w-auto" />
        </NavLink>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.heading ? (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {group.heading}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? ACCENT_ACTIVE[accent] : 'text-ink-300 hover:bg-ink-800 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-ink-800 p-3">
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-ink-800"
        >
          <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
            <span className="block text-[11px] capitalize text-crop-400">{role}</span>
          </span>
          <span className="text-ink-500">▾</span>
        </button>
        {userMenuOpen ? (
          <div className="mt-2 flex flex-col gap-1 rounded-lg border border-ink-700 bg-ink-800 p-1.5">
            <NavLink
              to={`/${role}/profile`}
              onClick={() => {
                setUserMenuOpen(false);
                setSidebarOpen(false);
              }}
              className="rounded-md px-3 py-2 text-sm text-ink-200 hover:bg-ink-700"
            >
              {translate('nav.profile')}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-left text-sm text-red-300 hover:bg-ink-700"
            >
              {translate('actions.logout')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      {}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            aria-label={translate('shell.openMenu')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="truncate text-base font-semibold text-ink-900 sm:text-lg">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher compact />
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full"
                aria-label={translate('shell.accountMenu')}
              >
                <Avatar name={user?.name} src={user?.avatarUrl} size="md" />
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">
          {children}
          <Outlet />
        </main>
        <footer className="px-6 pb-6 pt-2 text-center text-xs text-ink-400">{translate('shell.footerNote')}</footer>
      </div>
    </div>
  );
}
