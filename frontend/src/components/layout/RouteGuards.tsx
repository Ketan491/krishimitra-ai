import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { PageLoader } from '../ui/StateComponents';
import type { Role } from '../../lib/types';

export function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth();
  const { translate } = useI18n();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <PageLoader label={translate('ui.checkingSession')} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const { role, isLoggedIn, loading } = useAuth();
  const { translate } = useI18n();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <PageLoader label={translate('ui.checkingSession')} />
      </div>
    );
  }
  if (!isLoggedIn || !role) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!roles.includes(role)) {
    const home = role === 'farmer' ? '/farmer' : role === 'customer' ? '/customer' : '/admin';
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}

export function RedirectToRole() {
  const { role, isLoggedIn, loading } = useAuth();
  const { translate } = useI18n();
  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <PageLoader label={translate('common.loading')} />
      </div>
    );
  }
  if (!isLoggedIn || !role) return <Navigate to="/login" replace />;
  const home = role === 'farmer' ? '/farmer' : role === 'customer' ? '/customer' : '/admin';
  return <Navigate to={home} replace />;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { isLoggedIn, role, loading } = useAuth();
  const { translate } = useI18n();
  if (loading) return <PageLoader label={translate('common.loading')} />;
  if (isLoggedIn && role) {
    const home = role === 'farmer' ? '/farmer' : role === 'customer' ? '/customer' : '/admin';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}
