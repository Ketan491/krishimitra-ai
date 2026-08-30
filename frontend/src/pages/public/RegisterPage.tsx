import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { validateFarmerForm, validateCustomerForm } from '../../lib/validators';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import type { Role } from '../../lib/types';

export function RegisterPage() {
  const { login } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>('farmer');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [landSize, setLandSize] = useState('');
  const [soilType, setSoilType] = useState('Alluvial');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form =
      role === 'farmer'
        ? { name, mobile, password, location, landSize: landSize || '', soilType }
        : { name, mobile, password, location };
    const result = role === 'farmer' ? validateFarmerForm(form) : validateCustomerForm(form);
    if (!result.valid) {
      setErrors({ [result.field || 'name']: result.message || translate('auth.invalidValue') });
      return;
    }

    const payload: { role: Role; name: string; mobile: string; password: string; [k: string]: unknown } = {
      role,
      name,
      mobile,
      password,
      location,
    };
    if (role === 'farmer') {
      payload.landSize = Number(landSize);
      payload.soilType = soilType;
    }

    setSubmitting(true);
    try {
      const res = await api.register(payload);
      login(res.token, res.role, res.user);
      successToast(translate('auth.accountCreated').replace('{name}', res.user.name));
      navigate(res.role === 'farmer' ? '/farmer' : '/customer', { replace: true });
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('auth.registrationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card className="p-7">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-ink-900">{translate('auth.registerTitle')}</h1>
          <p className="text-sm text-ink-500">{translate('auth.registerSubtitle')}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          {(
            [
              { role: 'farmer', icon: '🚜', labelKey: 'roles.farmer', hintKey: 'auth.farmerRoleHint' },
              { role: 'customer', icon: '🛒', labelKey: 'roles.customer', hintKey: 'auth.customerRoleHint' },
            ] as const
          ).map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setRole(r.role)}
              className={[
                'rounded-xl border p-3 text-left transition-colors',
                role === r.role ? 'border-crop-600 bg-crop-50' : 'border-ink-200 bg-white hover:border-ink-300',
              ].join(' ')}
            >
              <span className="text-sm font-semibold text-ink-800">
                {r.icon} {translate(r.labelKey)}
              </span>
              <span className="block text-xs text-ink-500">{translate(r.hintKey)}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label={translate('common.name')}
            placeholder="e.g. Ramesh Patil"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <Input
            label={translate('common.mobile')}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder={translate('common.mobile')}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ''))}
            error={errors.mobile}
          />
          <Input
            label={translate('common.password')}
            type="password"
            placeholder={translate('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Input
            label={translate('auth.locationLabel')}
            placeholder="e.g. Nasik, Maharashtra"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            error={errors.location}
          />
          {role === 'farmer' ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={translate('farmer.landSize')}
                type="number"
                min={0}
                step="0.5"
                placeholder="e.g. 5"
                value={landSize}
                onChange={(e) => setLandSize(e.target.value)}
                error={errors.landSize}
              />
              <Select
                label={translate('farmer.soilType')}
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
              >
                {['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy'].map((s) => (
                  <option key={s} value={s}>
                    {translate('auth.soilOption').replace('{name}', s)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <Button type="submit" fullWidth size="lg" loading={submitting}>
            {translate('actions.register')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-500">
          {translate('auth.alreadyHave')}{' '}
          <Link to="/login" className="font-semibold text-crop-700 hover:underline">
            {translate('actions.login')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
