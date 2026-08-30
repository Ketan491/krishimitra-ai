import { useState } from 'react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { formatNumber } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageLoader, ErrorState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import type { PredictYieldResponse } from '../../lib/types';

export function YieldPredictionPage() {
  const { translate } = useI18n();
  const [landSize, setLandSize] = useState('5');
  const [rainfall, setRainfall] = useState('850');
  const [fertilizer, setFertilizer] = useState('120');
  const [result, setResult] = useState<PredictYieldResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const area = Number(landSize);
    if (!area || area <= 0) {
      setError(translate('yield.invalidLandSize'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(
        await api.predictYield({
          landSize: area,
          rainfall: Number(rainfall) || undefined,
          fertilizer: Number(fertilizer) || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('yield.failedToPredict'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={translate('yield.title')} subtitle={translate('yield.subtitle')} icon="📈" />

      <Card>
        <form onSubmit={run} className="grid gap-4 sm:grid-cols-3">
          <Input
            label={translate('yield.landSizeLabel')}
            type="number"
            min={0.5}
            step="0.5"
            value={landSize}
            onChange={(e) => setLandSize(e.target.value)}
          />
          <Input
            label={translate('yield.rainfallLabel')}
            type="number"
            min={0}
            value={rainfall}
            onChange={(e) => setRainfall(e.target.value)}
          />
          <Input
            label={translate('yield.fertilizerLabel')}
            type="number"
            min={0}
            value={fertilizer}
            onChange={(e) => setFertilizer(e.target.value)}
          />
          <div className="sm:col-span-3">
            <Button type="submit" loading={loading} size="lg" fullWidth>
              {translate('yield.estimateButton')}
            </Button>
          </div>
        </form>
      </Card>

      {loading && !result ? (
        <div className="mt-6">
          <PageLoader label={translate('yield.runningMessage')} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={run as unknown as () => void} />
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader title={translate('yield.estimatedTitle').replace('{crop}', result.crop || 'mixed')} />
            <div className="flex items-end gap-6">
              <div>
                <p className="text-xs text-ink-500">{translate('yield.perAcre')}</p>
                <p className="text-3xl font-extrabold text-crop-800">
                  {formatNumber(result.predictedYieldPerAcre)}{' '}
                  <span className="text-sm font-medium">{result.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-500">{translate('yield.totalFor').replace('{acres}', landSize)}</p>
                <p className="text-2xl font-bold text-ink-900">
                  {formatNumber(result.totalEstimatedYield)} <span className="text-xs">{result.unit}</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-ink-500">
                <span>{translate('yield.modelConfidence')}</span>
                <span>{((result.modelInfo?.rSquared || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-ink-100">
                <div
                  className="h-2 rounded-full bg-crop-600"
                  style={{ width: `${Math.min(100, (result.modelInfo?.rSquared || 0) * 100)}%` }}
                />
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-400">{result.modelInfo?.note}</p>
          </Card>

          <Card>
            <CardHeader title={translate('yield.aboutModel')} subtitle={result.modelInfo?.type} />
            <div className="space-y-2.5 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {result.modelInfo?.features.map((f) => (
                  <Badge key={f} variant="blue">
                    {f}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-ink-500">
                {translate('yield.modelNote').replace('{count}', String(result.modelInfo?.trainingSize))}
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
