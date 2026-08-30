import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { isValidMobile, isValidPassword } from '../../lib/validators';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import type { Role } from '../../lib/types';

const ROLE_META: { role: Role; icon: string; labelKey: string; hintKey: string }[] = [
  { role: 'farmer', icon: '🚜', labelKey: 'roles.farmer', hintKey: 'auth.farmerHint' },
  { role: 'customer', icon: '🛒', labelKey: 'roles.customer', hintKey: 'auth.customerHint' },
  { role: 'admin', icon: '🛡️', labelKey: 'roles.admin', hintKey: 'auth.adminHint' },
];

export function LoginPage() {
  const { login } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [role, setRole] = useState<Role>('farmer');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { mobile?: string; password?: string } = {};
    if (!isValidMobile(mobile)) next.mobile = translate('auth.invalidMobile');
    if (!isValidPassword(password)) next.password = translate('auth.invalidPassword');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await api.login({ role, mobile, password });
      login(res.token, res.role, res.user);
      successToast(translate('auth.welcomeBack').replace('{name}', res.user.name));
      navigate(from || (res.role === 'farmer' ? '/farmer' : res.role === 'customer' ? '/customer' : '/admin'), {
        replace: true,
      });
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('auth.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="p-7">
        <div className="mb-6 text-center">
          <ImageWithFallback src="/logo-symbol.svg" alt={translate('auth.logoAlt')} className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-xl font-bold text-ink-900">{translate('auth.loginTitle')}</h1>
          <p className="text-sm text-ink-500">{translate('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">{translate('auth.iam')}</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_META.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  className={[
                    'rounded-xl border px-2 py-2.5 text-center transition-colors',
                    role === r.role ? 'border-crop-600 bg-crop-50' : 'border-ink-200 bg-white hover:border-ink-300',
                  ].join(' ')}
                >
                  <span className="block text-xl">{r.icon}</span>
                  <span
                    className={`mt-1 block text-xs font-semibold ${role === r.role ? 'text-crop-800' : 'text-ink-600'}`}
                  >
                    {translate(r.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label={translate('common.mobile')}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ''))}
            error={errors.mobile}
          />
          <Input
            label={translate('common.password')}
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <Button type="submit" fullWidth size="lg" loading={submitting}>
            {translate('actions.login')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-500">
          {translate('auth.newHere')}{' '}
          <Link to="/register" className="font-semibold text-crop-700 hover:underline">
            {translate('actions.register')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
