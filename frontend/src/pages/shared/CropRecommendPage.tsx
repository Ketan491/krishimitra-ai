import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import type { AdvisoryOptions, RecommendResponse } from '../../lib/types';

const SOIL_LABEL_KEYS: Record<string, string> = {
  Alluvial: 'recommend.soilAlluvial',
  Black: 'recommend.soilBlack',
  Red: 'recommend.soilRed',
  Laterite: 'recommend.soilLaterite',
  Sandy: 'recommend.soilSandy',
  Clay: 'recommend.soilClay',
  Loamy: 'recommend.soilLoamy',
};

const SEASON_LABEL_KEYS: Record<string, string> = {
  Kharif: 'recommend.seasonKharif',
  Rabi: 'recommend.seasonRabi',
  Zaid: 'recommend.seasonZaid',
};

const WATER_LABEL_KEYS: Record<string, string> = {
  Irrigated: 'recommend.waterIrrigated',
  'Rain-fed': 'recommend.waterRainFed',
};

export function CropRecommendPage() {
  const { translate } = useI18n();
  const [soilType, setSoilType] = useState('Alluvial');
  const [season, setSeason] = useState('Kharif');
  const [waterLevel, setWaterLevel] = useState('Irrigated');
  const [location, setLocation] = useState('');
  const [options, setOptions] = useState<AdvisoryOptions | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api
      .advisoryOptions()
      .then(setOptions)
      .catch(() => {});
  }, []);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitted(true);
    try {
      const res = await api.recommend({ soilType, season, location: location || undefined });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('recommend.failedToGenerate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={translate('recommend.title')} subtitle={translate('recommend.subtitle')} icon="🧭" />

      <Card>
        <form onSubmit={run} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label={translate('recommend.soilTypeLabel')}
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
          >
            {(options?.soilTypes || ['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy']).map((s) => (
              <option key={s} value={s}>
                {translate(SOIL_LABEL_KEYS[s] ?? s)}
              </option>
            ))}
          </Select>
          <Select label={translate('recommend.seasonLabel')} value={season} onChange={(e) => setSeason(e.target.value)}>
            {(options?.seasons || ['Kharif', 'Rabi', 'Zaid']).map((s) => (
              <option key={s} value={s}>
                {translate(SEASON_LABEL_KEYS[s] ?? s)}
              </option>
            ))}
          </Select>
          <Select
            label={translate('recommend.waterLabel')}
            value={waterLevel}
            onChange={(e) => setWaterLevel(e.target.value)}
          >
            {(options?.waterLevels || ['Irrigated', 'Rain-fed']).map((s) => (
              <option key={s} value={s}>
                {translate(WATER_LABEL_KEYS[s] ?? s)}
              </option>
            ))}
          </Select>
          <Input
            label={translate('recommend.locationLabel')}
            placeholder={translate('recommend.locationPlaceholder')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={loading} size="lg" fullWidth>
              {translate('recommend.getRecommendations')}
            </Button>
          </div>
        </form>
      </Card>

      {submitted && loading ? (
        <div className="mt-6">
          <PageLoader label={translate('recommend.analyzing')} />
        </div>
      ) : null}
      {submitted && error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={run as unknown as () => void} />
        </div>
      ) : null}

      {result ? (
        <div className="mt-8">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-ink-900">
              {translate('recommend.soilSeasonTitle')
                .replace('{soil}', result.soilType)
                .replace('{season}', result.season)}
            </h3>
            {!result.exactMatch ? (
              <p className="text-sm text-harvest-600">{translate('recommend.noExactMatch')}</p>
            ) : null}
          </div>
          <StaggerGroup className="grid gap-5 sm:grid-cols-2">
            {result.recommendations.map((r) => (
              <StaggerItem key={r.crop}>
                <Card>
                  <CardHeader title={r.crop} subtitle={translate('recommend.fullGuidance')} />
                  <div className="space-y-2.5 text-sm">
                    {[
                      [translate('recommend.landPrep'), r.guidance.landPrep],
                      [translate('recommend.sowing'), r.guidance.sowing],
                      [translate('recommend.fertilizer'), r.guidance.fertilizer],
                      [translate('recommend.irrigation'), r.guidance.irrigation],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex gap-2.5 rounded-lg bg-ink-50 p-2.5">
                        <span className="shrink-0 font-medium text-crop-800">{k}</span>
                        <span className="text-ink-600">{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
          {result.recommendations.length === 0 ? (
            <EmptyState
              title={translate('recommend.noResultsTitle')}
              message={translate('recommend.noResultsMessage')}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
