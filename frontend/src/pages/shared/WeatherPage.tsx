import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate, weatherConditionIcon } from '../../lib/format';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PageLoader, ErrorState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import type { Weather as WeatherData } from '../../lib/types';

const CONDITION_BG: Record<string, string> = {
  Clear: 'from-sky-400 to-sky-600',
  Sunny: 'from-amber-300 to-harvest-500',
  'Partly Cloudy': 'from-sky-400 to-sky-200',
  Cloudy: 'from-ink-400 to-ink-600',
  'Patchy rain possible': 'from-sky-500 to-ink-400',
  'Light rain': 'from-sky-600 to-ink-500',
  Rainy: 'from-sky-700 to-ink-700',
  Storm: 'from-ink-700 to-ink-900',
  default: 'from-sky-300 to-sky-500',
};

export function WeatherPage() {
  const { translate } = useI18n();
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [retryTick, setRetryTick] = useState(0);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .weather(query)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : translate('weather.failedToLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, retryTick]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(location.trim() || undefined);
  };

  if (loading) return <PageLoader label={translate('weather.fetching')} />;
  if (error) return <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />;

  const current = data?.current;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title={translate('weather.title')} subtitle={translate('weather.subtitle')} icon="⛅" />

      <form onSubmit={submit} className="mb-6 flex max-w-md gap-2">
        <Input
          placeholder={translate('weather.locationPlaceholder')}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Button type="submit">{translate('weather.update')}</Button>
      </form>

      {data && current ? (
        <>
          <div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${CONDITION_BG[current.condition] || CONDITION_BG.default} p-8 text-white shadow-lg`}
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-sm capitalize text-white/80">{data.location}</p>
                <p className="mt-1 text-xs text-white/70">{formatDate(current.date)}</p>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-6xl">{weatherConditionIcon(current.condition)}</span>
                  <div>
                    <p className="text-5xl font-extrabold">{current.temp_max}°C</p>
                    <p className="text-white/85">{current.condition}</p>
                    <p className="text-sm text-white/75">
                      {translate('weather.lowTemp')
                        .replace('{temp}', String(current.temp_min))
                        .replace('{humidity}', String(current.humidity))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 px-6 py-4 backdrop-blur">
                <p className="text-xs text-white/80">{translate('weather.rainProbability')}</p>
                <p className="text-3xl font-bold">{current.rainfall_probability}%</p>
                {current.rainfall_probability >= 50 ? (
                  <p className="mt-1 text-xs text-white/85">{translate('weather.seedCovers')}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <CardHeader title={translate('weather.forecastTitle')} subtitle={translate('weather.forecastSubtitle')} />
            <StaggerGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {data.forecast.map((d) => (
                <StaggerItem key={d.date}>
                  <Card padded={false} className="h-full p-3 text-center">
                    <p className="text-[11px] font-medium uppercase text-ink-500">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                    </p>
                    <p className="mt-1 text-2xl">{weatherConditionIcon(d.condition)}</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">{d.temp_max}°</p>
                    <p className="text-xs text-ink-500">{d.temp_min}°</p>
                    <p className="mt-1 text-[11px] text-sky-600">💧 {d.rainfall_probability}%</p>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>

          <p className="mt-6 text-xs text-ink-400">{translate('weather.demoNote')}</p>
        </>
      ) : null}
    </div>
  );
}
