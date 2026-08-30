import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { DiseaseResult, DiagnosisRecord } from '../../lib/types';

const SEVERITY_VARIANT = { Low: 'green', Medium: 'amber', High: 'red' } as const;

export function DiseaseDiagnosisPage() {
  const { role } = useAuth();
  const { translate } = useI18n();
  const [cropName, setCropName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: history, refetch: refetchHistory } = useAsync<DiagnosisRecord[]>(
    () => (role === 'farmer' ? api.myDiagnoses() : Promise.resolve([])),

    [],
  );

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.trim().length < 4) {
      setError(translate('disease.symptomsError'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let resp;
      if (photo) {
        const fd = new FormData();
        fd.append('cropName', cropName);
        fd.append('symptoms', symptoms);
        fd.append('photo', photo);
        resp = await api.diagnose(fd);
      } else {
        resp = await api.diagnoseJson({ cropName: cropName || undefined, symptoms });
      }
      setResult(resp.result);
      refetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('disease.runError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={translate('nav.disease')} subtitle={translate('disease.subtitle')} icon="🔬" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={translate('disease.describeProblem')}
            subtitle={translate('disease.describeProblemHint')}
          />
          <form onSubmit={run} className="space-y-4">
            <Input
              label={translate('disease.cropName')}
              placeholder={translate('disease.cropPlaceholder')}
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
            />
            <Textarea
              label={translate('disease.symptoms')}
              placeholder={translate('disease.symptomsPlaceholder')}
              rows={5}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-3 text-sm text-ink-600 hover:border-crop-400"
              >
                {photo ? `📷 ${photo.name}` : `📷 ${translate('disease.uploadPhoto')}`}
              </button>
            </div>
            <Button type="submit" fullWidth size="lg" loading={loading}>
              {translate('disease.diagnoseNow')}
            </Button>
          </form>
        </Card>

        {loading ? (
          <Card>
            <PageLoader label={translate('disease.analyzing')} />
          </Card>
        ) : error ? (
          <Card>
            <ErrorState message={error} />
          </Card>
        ) : result ? (
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-ink-500">{translate('disease.likelyDiagnosis')}</p>
                <h3 className="text-lg font-bold text-ink-900">{result.diagnosis}</h3>
              </div>
              <Badge variant={SEVERITY_VARIANT[result.severity as keyof typeof SEVERITY_VARIANT] || 'amber'}>
                {translate('disease.severity')}: {result.severity}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-500">{translate('disease.confidence')}:</span>
              <span className="font-semibold text-crop-800">{result.confidence}</span>
              {result.engine ? (
                <Badge variant="gray">
                  {translate('disease.engine')}: {result.engine}
                </Badge>
              ) : null}
            </div>
            {result.matchedKeywords?.length ? (
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-semibold text-ink-900">{translate('disease.matchedSignals')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matchedKeywords.map((k) => (
                    <Badge key={k} variant="blue">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {result.causes?.length ? (
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-semibold text-ink-900">{translate('disease.possibleCauses')}</p>
                <ul className="space-y-1 text-sm text-ink-600">
                  {result.causes.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.management?.length ? (
              <div className="mt-4 rounded-xl bg-crop-50 p-4">
                <p className="mb-1.5 text-sm font-semibold text-crop-900">{translate('disease.management')}</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-crop-800">
                  {result.management.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-harvest-50 p-3 text-xs text-harvest-600">
              <span>⚠️</span>
              <p>{result.disclaimer || translate('disease.disclaimer')}</p>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center text-sm text-ink-400">
            {translate('disease.emptyResults')}
          </Card>
        )}
      </div>

      {role === 'farmer' && history && history.length > 0 ? (
        <div className="mt-10">
          <h3 className="mb-3 text-lg font-bold text-ink-900">{translate('disease.historyTitle')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((d) => (
              <Card key={d.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{d.cropName || translate('disease.crop')}</p>
                    <p className="text-sm text-ink-600">{d.result}</p>
                  </div>
                  <Badge variant={SEVERITY_VARIANT[d.severity as keyof typeof SEVERITY_VARIANT] || 'amber'}>
                    {d.severity}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-400">
                  {formatDate(d.createdAt)} · {d.engine}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ) : role === 'farmer' && !loading && history && history.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={translate('disease.noHistory')} message={translate('disease.historyEmptyHint')} />
        </div>
      ) : null}
    </div>
  );
}
