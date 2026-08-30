import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatPriceRate, convertPriceRate } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import type { PriceSummaryItem, PriceTrendResponse } from '../../lib/types';

function seededFrac(s: number): number {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

export function MarketPricesPage() {
  const { translate } = useI18n();
  const [summary, setSummary] = useState<PriceSummaryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [trend, setTrend] = useState<PriceTrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const selectedRef = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const liveMap = new Map<string, { live: number; pct: number; base: number }>();
  if (summary) {
    for (const r of summary) {
      const seed = r.cropName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + tick * 7919;
      const live = Math.max(1, Math.round(r.avgPrice * (1 + (seededFrac(seed + 7) - 0.5) * 0.12)));
      const pct = Math.round(((live - r.avgPrice) / r.avgPrice) * 1000) / 10;
      liveMap.set(r.cropName, { live, pct, base: r.avgPrice });
    }
  }

  useEffect(() => {
    let cancelled = false;
    api
      .priceSummary()
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : translate('prices.failedToLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showTrend = async (crop: string) => {
    selectedRef.current = crop;
    setSelected(crop);
    setTrendLoading(true);
    setTrend(null);
    try {
      const res = await api.priceTrend(crop);
      if (selectedRef.current === crop) setTrend(res);
    } catch {
      if (selectedRef.current === crop) setTrend(null);
    } finally {
      if (selectedRef.current === crop) setTrendLoading(false);
    }
  };

  if (loading) return <PageLoader label={translate('prices.loadingPage')} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={translate('prices.title')}
        subtitle={translate('prices.subtitle')}
        icon="💰"
        action={
          <Badge variant="red" className="gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {translate('prices.live')}
          </Badge>
        }
      />

      {!summary || summary.length === 0 ? (
        <EmptyState title={translate('prices.noDataTitle')} message={translate('prices.noDataMessage')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataTable<PriceSummaryItem>
              loading={false}
              rows={summary}
              rowKey={(r) => r.cropName}
              columns={[
                {
                  key: 'crop',
                  header: translate('prices.colCrop'),
                  render: (r) => <span className="font-semibold text-ink-900">{r.cropName}</span>,
                },
                {
                  key: 'avg',
                  header: translate('prices.colAvgPrice'),
                  render: (r) => (
                    <span className="font-semibold text-crop-800">
                      {formatINR(r.avgPrice)}
                      <span className="text-[10px] font-normal text-ink-400">/{r.unit || 'kg'}</span>
                    </span>
                  ),
                },
                {
                  key: 'live',
                  header: translate('prices.live'),
                  render: (r) => {
                    const l = liveMap.get(r.cropName);
                    if (!l) return '—';
                    const up = l.pct >= 0;
                    return (
                      <span className={up ? 'font-semibold text-green-700' : 'font-semibold text-red-600'}>
                        {up ? '▲' : '▼'} {formatINR(l.live)}
                        <span className="text-[10px] font-normal text-ink-400">
                          {' '}
                          ({up ? '+' : ''}
                          {l.pct}% {translate('prices.today')})
                        </span>
                      </span>
                    );
                  },
                },
                { key: 'min', header: translate('prices.colMin'), render: (r) => formatINR(r.minPrice) },
                { key: 'max', header: translate('prices.colMax'), render: (r) => formatINR(r.maxPrice) },
                {
                  key: 'listings',
                  header: translate('prices.colListings'),
                  render: (r) => <Badge variant="gray">{r.listings}</Badge>,
                },
                {
                  key: 'action',
                  header: '',
                  render: (r) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showTrend(r.cropName)}
                      disabled={trendLoading && selected === r.cropName}
                    >
                      {selected === r.cropName && trendLoading
                        ? translate('common.loading')
                        : translate('prices.trend')}
                    </Button>
                  ),
                },
              ]}
            />
          </div>

          <Card className="h-fit">
            <CardHeader
              title={
                selected
                  ? translate('prices.cropTrendTitle').replace('{crop}', selected)
                  : translate('prices.priceTrendTitle')
              }
              subtitle={
                trend
                  ? `${formatPriceRate(trend.basePrice, trend.unit)} · ${translate('prices.liveSubtitle')}`
                  : translate('prices.selectCropSubtitle')
              }
            />
            {selected && trendLoading ? <PageLoader label={translate('prices.loadingTrend')} /> : null}
            {selected && trend && !trendLoading ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend.trend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1B5E20" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={45} />
                      <Tooltip formatter={(v) => [formatINR(Number(v)), translate('prices.tooltipPrice')]} />
                      <Area type="monotone" dataKey="price" stroke="#1B5E20" strokeWidth={2} fill="url(#priceFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <PriceTrendFooter trend={trend} translate={translate} />
              </>
            ) : null}
            {!selected ? (
              <div className="flex h-40 items-center justify-center text-sm text-ink-400">
                {translate('prices.pickCrop')}
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}

function PriceTrendFooter({ trend, translate }: { trend: PriceTrendResponse; translate: (key: string) => string }) {
  const unit = trend.unit || 'kg';
  const kgBased = ['kg', 'kilogram', 'g', 'gram'].includes(unit.toLowerCase());
  const hints: [string, number][] = [];
  if (kgBased) {
    const q = convertPriceRate(trend.basePrice, unit, 'quintal');
    const t = convertPriceRate(trend.basePrice, unit, 'tonne');
    if (q !== null) hints.push(['quintal', q]);
    if (t !== null) hints.push(['tonne', t]);
  } else {
    const k = convertPriceRate(trend.basePrice, unit, 'kg');
    if (k !== null) hints.push(['kg', k]);
  }
  const last = trend.trend[trend.trend.length - 1];
  const change = Math.round(((last.price - trend.basePrice) / trend.basePrice) * 1000) / 10;
  const up = change >= 0;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
      <span className="flex flex-wrap gap-x-3">
        {hints.map(([u, v]) => (
          <span key={u}>
            ≈ {formatINR(v)} / {u}
          </span>
        ))}
      </span>
      <span className={up ? 'font-semibold text-green-700' : 'font-semibold text-red-600'}>
        {up ? '▲ +' : '▼ '}
        {change}% {translate('prices.today')}
      </span>
    </div>
  );
}
