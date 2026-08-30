import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { FadeIn, SlideIn, StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import type { PriceSummaryItem } from '../../lib/types';

function seededFrac(s: number): number {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

const FEATURES = [
  { icon: '🧭', titleKey: 'landing.featureCropTitle', descKey: 'landing.featureCropDesc' },
  { icon: '🔬', titleKey: 'landing.featureDiseaseTitle', descKey: 'landing.featureDiseaseDesc' },
  { icon: '💰', titleKey: 'landing.featurePriceTitle', descKey: 'landing.featurePriceDesc' },
  { icon: '💧', titleKey: 'landing.featureWeatherTitle', descKey: 'landing.featureWeatherDesc' },
  { icon: '🏛️', titleKey: 'landing.featureSchemesTitle', descKey: 'landing.featureSchemesDesc' },
  { icon: '📦', titleKey: 'landing.featureMarketplaceTitle', descKey: 'landing.featureMarketplaceDesc' },
];

const STEPS = [
  { n: '1', titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { n: '2', titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { n: '3', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
];

export function LandingPage() {
  const { isLoggedIn, role } = useAuth();
  const { translate } = useI18n();
  const cta = isLoggedIn && role ? `/${role}` : '/register';
  const [summary, setSummary] = useState<PriceSummaryItem[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .priceSummary()
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch(() => {
        if (!cancelled) setSummary([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const tickerItems = (summary || []).map((r) => {
    const seed = r.cropName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + tick * 7919;
    const jitter = seededFrac(seed + 7) - 0.5;
    const price = Math.max(1, Math.round(r.avgPrice * (1 + jitter * 0.12)));
    return { name: r.cropName, price, unit: r.unit || 'kg', pct: Math.round(jitter * 100) / 10 };
  });

  return (
    <div>
      {}
      <section className="relative overflow-hidden bg-crop-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-crop-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full bg-crop-100 px-3 py-1 text-xs font-semibold text-crop-800">
              🇮🇳 {translate('landing.heroBadge')}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
              {translate('landing.growSmarter')} <span className="text-crop-700">{translate('landing.brandName')}</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-ink-600 sm:text-lg">
              {translate('landing.heroDesc1')} {translate('landing.langNames')}, {translate('landing.langEnglish')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={cta}>
                <Button size="lg">
                  {isLoggedIn ? translate('landing.openDashboard') : translate('landing.getStarted')}
                </Button>
              </Link>
              <Link to="/market">
                <Button variant="outline" size="lg">
                  {translate('landing.browseMarketplace')}
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-center">
              {[
                ['10k+', 'landing.statFarmers', '10k+'],
                ['120+', 'landing.statCrops', '120+'],
                ['₹4Cr+', 'landing.statTrade', '₹4Cr+'],
              ].map(([v, _l, k]) => (
                <div key={k}>
                  <p className="text-xl font-bold text-crop-800">{v}</p>
                  <p className="text-xs text-ink-500">
                    {translate('landing.statFarmers')} · {translate(_l)}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
          <SlideIn from="right" className="hidden lg:block">
            <div className="relative">
              <div className="rounded-3xl bg-crop-700 p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 text-sm">
                  <span>📋</span>
                  <span className="font-semibold">{translate('landing.todayAdvisory')}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ['landing.advisorySow', 'Sorghum — ideal this season', '🌾'],
                    ['landing.advisorySpray', 'Neem oil for aphid control', '🧴'],
                    ['landing.advisorySell', 'Onion up 12% at mandi', '📈'],
                  ].map(([a, t, i]) => (
                    <div key={t} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
                      <span className="text-xl">{i}</span>
                      <div className="flex-1">
                        <p className="text-xs text-crop-200">{translate(a)}</p>
                        <p className="text-sm font-medium">{t}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-lg">
                <p className="text-xs font-medium text-ink-500">{translate('landing.onionApmcPrice')}</p>
                <p className="text-lg font-bold text-crop-800">₹1,850 / quintal</p>
              </div>
            </div>
          </SlideIn>
        </div>
      </section>

      {tickerItems.length > 0 ? (
        <section className="border-y border-crop-100 bg-crop-900 text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <div className="flex shrink-0 items-center gap-2 text-sm font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span>{translate('landing.liveMandi')}</span>
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="km-marquee flex w-max gap-10 whitespace-nowrap text-sm">
                {[...tickerItems, ...tickerItems].map((it, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="font-semibold">{it.name}</span>
                    <span className="text-crop-200">
                      {formatINR(it.price)}/{it.unit}
                    </span>
                    <span className={it.pct >= 0 ? 'text-harvest-200' : 'text-harvest-500'}>
                      {it.pct >= 0 ? '▲' : '▼'} {Math.abs(it.pct)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <Link to="/prices" className="hidden shrink-0 text-xs font-medium text-crop-200 underline sm:block">
              {translate('market.viewAll')} →
            </Link>
          </div>
        </section>
      ) : null}

      {}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{translate('landing.featuresTitle')}</h2>
          <p className="mt-2 text-sm text-ink-500">{translate('landing.featuresSubtitle')}</p>
        </div>
        <StaggerGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.titleKey}>
              <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-crop-50 text-2xl">
                  {f.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{translate(f.titleKey)}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{translate(f.descKey)}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{translate('landing.howTitle')}</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <FadeIn key={s.n} delay={Number(s.n) * 0.1}>
                <div className="text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-crop-700 text-lg font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold text-ink-900">{translate(s.titleKey)}</h3>
                  <p className="mt-1 text-sm text-ink-500">{translate(s.descKey)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/register">
              <Button size="lg">{translate('landing.startGrowing')}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
