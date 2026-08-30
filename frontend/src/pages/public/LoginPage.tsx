import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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
import type { AuthResponse, Role } from '../../lib/types';

type LoginMethod = 'mobile' | 'credential';

const ROLE_CARDS: { role: Role; icon: string; labelKey: string; hintKey: string }[] = [
  { role: 'farmer', icon: '🚜', labelKey: 'roles.farmer', hintKey: 'auth.farmerHint' },
  { role: 'customer', icon: '🛒', labelKey: 'roles.customer', hintKey: 'auth.customerHint' },
];

const ADMIN_CARD = { role: 'admin', icon: '🛡️', labelKey: 'roles.admin', hintKey: 'auth.adminHint' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dashboardFor(role: Role): string {
  return role === 'farmer' ? '/farmer' : role === 'customer' ? '/customer' : '/admin';
}

function defaultMethod(role: Role): LoginMethod {
  return role === 'farmer' ? 'mobile' : 'credential';
}

function methodsFor(role: Role): LoginMethod[] {
  return role === 'admin' ? ['credential'] : ['mobile', 'credential'];
}

export function LoginPage() {
  const { login } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [role, setRole] = useState<Role>('farmer');
  const [method, setMethod] = useState<LoginMethod>(() => defaultMethod('farmer'));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<'send' | 'verify' | 'login' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const secondsLeft = otpStep && expiresAt > 0 ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!otpStep) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [otpStep]);

  const resetFlow = () => {
    setIdentifier('');
    setPassword('');
    setOtp('');
    setOtpStep(false);
    setDevOtp(null);
    setExpiresAt(0);
    setErrors({});
  };

  const chooseRole = (next: Role) => {
    if (next !== role) {
      setRole(next);
      setMethod(defaultMethod(next));
      resetFlow();
    }
  };

  const chooseMethod = (next: LoginMethod) => {
    if (next !== method) {
      setMethod(next);
      resetFlow();
    }
  };

  const completeLogin = (res: AuthResponse) => {
    login(res.token, res.role, res.user);
    successToast(translate('auth.welcomeBack').replace('{name}', res.user.name));
    navigate(from || dashboardFor(res.role), { replace: true });
  };

  const verifyCredentialIdentifier = (value: string): string | null => {
    const v = value.trim();
    if (!v) return translate('auth.enterIdentifier');
    if (v.includes('@')) {
      return EMAIL_REGEX.test(v) ? null : translate('auth.invalidEmail');
    }
    if (role === 'admin') return v.length >= 2 ? null : translate('auth.enterIdentifier');
    if (/^\d+$/.test(v) && !isValidMobile(v)) return translate('auth.invalidMobile');
    return null;
  };

  const submitCredential = async () => {
    const next: Record<string, string> = {};
    const idErr = verifyCredentialIdentifier(identifier);
    if (idErr) next.identifier = idErr;
    if (!isValidPassword(password)) next.password = translate('auth.invalidPassword');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy('login');
    try {
      const res = await api.login({ role, identifier: identifier.trim(), password });
      completeLogin(res);
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('auth.loginFailed'));
    } finally {
      setBusy(null);
    }
  };

  const sendOtp = async () => {
    if (!isValidMobile(identifier)) {
      setErrors({ identifier: translate('auth.invalidMobile') });
      return;
    }
    setErrors({});
    setBusy('send');
    try {
      const res = await api.sendOtp({ role, mobile: identifier.trim() });
      setDevOtp(res.devOtp || null);
      setExpiresAt(Date.now() + (res.expiresInSec ?? 300) * 1000);
      setNow(Date.now());
      setOtp('');
      setOtpStep(true);
      successToast(translate('auth.otpSentToast').replace('{mobile}', identifier.trim()));
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('auth.loginFailed'));
    } finally {
      setBusy(null);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: translate('auth.otpInvalid') });
      return;
    }
    setErrors({});
    setBusy('verify');
    try {
      const res = await api.verifyOtp({ role, mobile: identifier.trim(), otp });
      completeLogin(res);
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('auth.otpExpired'));
      setOtp('');
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (method === 'mobile') {
      if (otpStep) void verifyOtp();
      else void sendOtp();
    } else {
      void submitCredential();
    }
  };

  const credential = (() => {
    switch (role) {
      case 'admin':
        return { label: translate('auth.labelAdminId'), placeholder: translate('auth.placeholderAdminId') };
      case 'customer':
        return { label: translate('auth.labelCustomerEmail'), placeholder: translate('auth.placeholderCustomerEmail') };
      default:
        return { label: translate('auth.labelFarmerEmail'), placeholder: translate('auth.placeholderFarmerEmail') };
    }
  })();

  const methods = methodsFor(role);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="p-7">
        <div className="mb-6 text-center">
          <ImageWithFallback src="/logo-symbol.svg" alt={translate('auth.logoAlt')} className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-xl font-bold text-ink-900">{translate('auth.loginTitle')}</h1>
          <p className="text-sm text-ink-500">{translate('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">{translate('auth.iam')}</p>
            <div className="flex gap-2">
              {ROLE_CARDS.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => chooseRole(r.role)}
                  aria-pressed={role === r.role}
                  className={[
                    'flex-1 rounded-xl border px-2 py-2.5 text-center transition-colors',
                    role === r.role
                      ? 'border-crop-600 bg-crop-50 shadow-sm'
                      : 'border-ink-200 bg-white hover:border-ink-300',
                  ].join(' ')}
                >
                  <span className="block text-2xl leading-none">{r.icon}</span>
                  <span
                    className={`mt-1.5 block text-sm font-semibold ${role === r.role ? 'text-crop-800' : 'text-ink-700'}`}
                  >
                    {translate(r.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-ink-500">{translate(r.hintKey)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => chooseRole('admin')}
                aria-pressed={role === 'admin'}
                className={[
                  'flex w-[4.5rem] flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-colors',
                  role === 'admin'
                    ? 'border-crop-500 bg-crop-50'
                    : 'border border-dashed border-ink-300 bg-white hover:border-ink-400',
                ].join(' ')}
              >
                <span className={`text-lg leading-none ${role === 'admin' ? 'text-crop-700' : 'text-ink-500'}`}>
                  {ADMIN_CARD.icon}
                </span>
                <span
                  className={`mt-1 block text-[10px] font-semibold uppercase tracking-wide ${
                    role === 'admin' ? 'text-crop-800' : 'text-ink-600'
                  }`}
                >
                  {translate('roles.admin')}
                </span>
              </button>
            </div>
          </div>

          <div
            className={['grid gap-1 rounded-xl bg-ink-100 p-1', methods.length === 1 ? 'grid-cols-1' : 'grid-cols-2'].join(
              ' ',
            )}
          >
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => chooseMethod(m)}
                aria-pressed={method === m}
                className={[
                  'rounded-lg py-1.5 text-sm font-medium transition-colors',
                  method === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
                ].join(' ')}
              >
                {m === 'mobile'
                  ? translate('auth.methodMobile')
                  : role === 'admin'
                    ? translate('auth.methodAdmin')
                    : translate('auth.methodEmailUser')}
              </button>
            ))}
          </div>

          {method === 'mobile' ? (
            otpStep ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-cream p-3 text-sm text-ink-600">
                  <p>{translate('auth.otpSentHint').replace('{mobile}', identifier)}</p>
                  {devOtp ? (
                    <p className="mt-1 text-xs font-medium text-crop-700">
                      {translate('auth.devOtpHint').replace('{otp}', devOtp)}
                    </p>
                  ) : null}
                </div>
                <Input
                  label={translate('auth.otpLabel')}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                  error={errors.otp}
                  hint={
                    secondsLeft > 0
                      ? translate('auth.otpExpiry').replace('{seconds}', String(secondsLeft))
                      : translate('auth.otpExpired')
                  }
                />
                <Button type="submit" fullWidth size="lg" loading={busy === 'verify'}>
                  {translate('auth.verifyOtp')}
                </Button>
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setDevOtp(null);
                      setOtp('');
                    }}
                    className="font-medium text-ink-500 hover:text-ink-700"
                  >
                    {translate('auth.changeMobile')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendOtp()}
                    disabled={busy === 'send'}
                    className="font-semibold text-crop-600 hover:underline disabled:text-ink-300"
                  >
                    {translate('auth.resendOtp')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label={translate('common.mobile')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.replace(/[^\d]/g, ''))}
                  error={errors.identifier}
                />
                <Button type="submit" fullWidth size="lg" loading={busy === 'send'}>
                  {translate('auth.sendOtp')}
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <Input
                label={credential.label}
                type="text"
                autoComplete={role === 'admin' ? 'username' : 'email'}
                placeholder={credential.placeholder}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                error={errors.identifier}
              />
              <Input
                label={translate('common.password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <Button type="submit" fullWidth size="lg" loading={busy === 'login'}>
                {translate('actions.login')}
              </Button>
            </div>
          )}
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