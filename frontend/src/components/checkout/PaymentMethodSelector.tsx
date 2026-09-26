import { useI18n } from '../../contexts/I18nContext';
import { formatINR } from '../../lib/format';
import type { PaymentConfig, PaymentMethod } from '../../lib/types';

export interface PaymentMethodSelectorProps {
  config: PaymentConfig | null;
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  total: number;
  disabled?: boolean;
}

interface MethodOption {
  id: PaymentMethod;
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  available: boolean;
}

/**
 * Radio-card payment picker. The available options are driven by the server's
 * config, so a method that is not offered never appears here — and the server
 * re-checks it anyway before creating the order.
 */
export function PaymentMethodSelector({
  config,
  method,
  onChange,
  total,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const { translate } = useI18n();

  const onlineEnabled = Boolean(config?.enabled);
  const codEnabled = Boolean(config?.codEnabled) && total <= (config?.codMaxAmount ?? 0);
  const codBlockedByCap = Boolean(config?.codEnabled) && !codEnabled;

  const options: MethodOption[] = [
    {
      id: 'razorpay',
      icon: '💳',
      title: translate('pay.methodOnline'),
      subtitle: onlineEnabled
        ? translate('pay.onlineSubtitle')
        : translate('pay.onlineUnavailable'),
      badge: onlineEnabled ? translate('pay.recommended') : undefined,
      available: onlineEnabled,
    },
    {
      id: 'cod',
      icon: '💵',
      title: translate('pay.methodCod'),
      subtitle: codBlockedByCap
        ? translate('pay.codMaxReached').replace('{max}', formatINR(config?.codMaxAmount ?? 0))
        : translate('pay.codSubtitle'),
      available: codEnabled,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{translate('pay.chooseMethod')}</h3>
        {onlineEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-crop-50 px-2 py-0.5 text-[11px] font-medium text-crop-800">
            🔒 {translate('pay.secure')}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 space-y-2" role="radiogroup" aria-label={translate('pay.chooseMethod')}>
        {options.map((opt) => {
          const selected = method === opt.id && opt.available;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || !opt.available}
              onClick={() => onChange(opt.id)}
              className={[
                'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-crop-500 focus-visible:ring-offset-1',
                opt.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
                selected
                  ? 'border-crop-600 bg-crop-50 shadow-sm ring-1 ring-crop-600'
                  : 'border-ink-200 bg-white hover:border-ink-300',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg',
                  selected ? 'bg-crop-600' : 'bg-ink-100',
                ].join(' ')}
              >
                {opt.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-ink-900">{opt.title}</span>
                  {opt.badge ? (
                    <span className="rounded-full bg-crop-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {opt.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{opt.subtitle}</span>
              </span>

              <span
                aria-hidden
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  selected ? 'border-crop-600 bg-crop-600' : 'border-ink-300',
                ].join(' ')}
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {selectedMethodIsCod(method, codEnabled) ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <span aria-hidden>ℹ️</span>
          {translate('pay.codNotice')}
        </p>
      ) : null}

      {onlineEnabled || codEnabled ? null : (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
          <span aria-hidden>⚠️</span>
          {translate('pay.noneAvailable')}
        </p>
      )}
    </div>
  );
}

function selectedMethodIsCod(method: PaymentMethod, codEnabled: boolean): boolean {
  return method === 'cod' && codEnabled;
}
