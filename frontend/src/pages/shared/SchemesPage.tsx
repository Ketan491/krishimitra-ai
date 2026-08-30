import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import type { Scheme } from '../../lib/types';

const CATEGORY_ICONS: Record<string, string> = {
  subsidy: '💵',
  insurance: '🛡️',
  irrigation: '💧',
  equipment: '🚜',
  crop: '🌾',
  default: '🏛️',
};

export function SchemesPage() {
  const { user, role } = useAuth();
  const { translate } = useI18n();
  const [schemes, setSchemes] = useState<Scheme[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const landSize = role === 'farmer' && user?.landSize ? Number(user.landSize) : undefined;

  useEffect(() => {
    let cancelled = false;
    api
      .schemes(landSize)
      .then((res) => {
        if (!cancelled) setSchemes(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : translate('schemes.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [landSize]);

  const filtered = useMemo(() => {
    if (!schemes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return schemes;
    return schemes.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q),
    );
  }, [schemes, search]);

  if (loading) return <PageLoader label={translate('schemes.loading')} />;
  if (error) return <ErrorState message={error} />;

  const sorted = [...filtered].sort((a, b) => {
    if (!landSize) return 0;
    const ea = a.min_land <= landSize && a.max_land >= landSize ? 1 : 0;
    const eb = b.min_land <= landSize && b.max_land >= landSize ? 1 : 0;
    return eb - ea;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={translate('schemes.title')}
        subtitle={
          role === 'farmer' && landSize
            ? translate('schemes.filteredSubtitle').replace('{acres}', String(landSize))
            : translate('schemes.discoverSubtitle')
        }
        icon="🏛️"
      />

      <div className="mb-6 max-w-md">
        <Input
          placeholder={translate('schemes.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={translate('schemes.noMatch')} message={translate('schemes.noMatchHint')} />
      ) : (
        <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => {
            const eligible = landSize ? s.min_land <= landSize && s.max_land >= landSize : null;
            return (
              <StaggerItem key={s.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-harvest-50 text-xl">
                      {CATEGORY_ICONS[s.category || 'default']}
                    </span>
                    {eligible !== null ? (
                      eligible ? (
                        <Badge variant="green">{translate('schemes.eligible')} ✓</Badge>
                      ) : (
                        <Badge variant="gray">{translate('schemes.checkCriteria')}</Badge>
                      )
                    ) : (
                      <Badge variant="blue">{s.category || translate('schemes.scheme')}</Badge>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold text-ink-900">{s.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-ink-600">{s.description}</p>
                  <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-xs text-ink-500">
                    <p>
                      🌾{' '}
                      {translate('schemes.landRange')
                        .replace('{min}', String(s.min_land))
                        .replace('{max}', String(s.max_land))}
                    </p>
                    {s.crop ? <p>🌱 {translate('schemes.crop').replace('{name}', s.crop)}</p> : null}
                    {s.equipmentType ? (
                      <p>🚜 {translate('schemes.equipment').replace('{name}', s.equipmentType)}</p>
                    ) : null}
                    {s.irrigationType ? (
                      <p>
                        💧{' '}
                        {translate('schemes.irrigation').replace(
                          '{list}',
                          Array.isArray(s.irrigationType) ? s.irrigationType.join(', ') : s.irrigationType,
                        )}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </div>
  );
}
