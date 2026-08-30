import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { localizedField, localizeTokens, localizeWater, SEASON_TOKEN_KEYS, SOIL_TOKEN_KEYS } from '../../lib/localize';
import type { CropCatalogResponse, CropRecord } from '../../lib/types';

const SOIL_OPTIONS = ['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy'];
const SEASON_OPTIONS = ['Kharif', 'Rabi', 'Zaid'];

const SOIL_LABEL_KEYS: Record<string, string> = {
  Alluvial: 'cropsDb.soilAlluvial',
  Black: 'cropsDb.soilBlack',
  Red: 'cropsDb.soilRed',
  Laterite: 'cropsDb.soilLaterite',
  Sandy: 'cropsDb.soilSandy',
  Clay: 'cropsDb.soilClay',
  Loamy: 'cropsDb.soilLoamy',
};

const SEASON_LABEL_KEYS: Record<string, string> = {
  Kharif: 'cropsDb.seasonKharif',
  Rabi: 'cropsDb.seasonRabi',
  Zaid: 'cropsDb.seasonZaid',
};

export function CropsDbPage() {
  const { translate, lang } = useI18n();
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('');
  const [soilType, setSoilType] = useState('');
  const [page, setPage] = useState(1);
  const [retryTick, setRetryTick] = useState(0);
  const [data, setData] = useState<CropCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CropRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .cropCatalog({ search: search || undefined, season: season || undefined, soilType: soilType || undefined })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : translate('cropsDb.failedToLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, season, soilType, retryTick]);

  const pageSize = 12;
  const items = useMemo(() => data?.items || [], [data]);
  const total = data?.total || 0;
  const paged = items.filter((_, i) => i >= (page - 1) * pageSize && i < page * pageSize);

  const cropName = (c: CropRecord) => localizedField(c, 'nameEn', lang) || c.nameEn;
  const cropDescription = (c: CropRecord) => localizedField(c, 'description', lang);
  const cropPrice = (c: CropRecord) => localizedField(c, 'priceRange', lang);
  const cropYield = (c: CropRecord) => localizedField(c, 'avgYield', lang);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const rec = await api.cropById(id);
      setDetail(rec);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title={translate('cropsDb.title')} subtitle={translate('cropsDb.subtitle')} icon="🌱" />

      <div className="mb-6 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <Input
          placeholder={translate('cropsDb.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={season}
          onChange={(e) => {
            setSeason(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{translate('cropsDb.allSeasons')}</option>
          {SEASON_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {translate(SEASON_LABEL_KEYS[s])}
            </option>
          ))}
        </Select>
        <Select
          value={soilType}
          onChange={(e) => {
            setSoilType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{translate('cropsDb.allSoilTypes')}</option>
          {SOIL_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {translate(SOIL_LABEL_KEYS[s])}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <PageLoader label={translate('cropsDb.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
      ) : paged.length === 0 ? (
        <EmptyState title={translate('cropsDb.noMatchTitle')} message={translate('cropsDb.noMatchMessage')} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paged.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openDetail(c.id)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-crop-50">
                  <ImageWithFallback
                    src={c.imageUrl}
                    alt={cropName(c)}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-ink-900">{cropName(c)}</h3>
                  <p className="mt-0.5 text-xs italic text-ink-500">{c.scientificName}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {c.season ? (
                      <Badge variant="amber">{localizeTokens(c.season, SEASON_TOKEN_KEYS, translate)}</Badge>
                    ) : null}
                    {c.waterRequirement ? (
                      <Badge variant="blue">{localizeWater(c.waterRequirement, translate)}</Badge>
                    ) : null}
                  </div>
                  {cropPrice(c) ? (
                    <p className="mt-2 text-sm font-semibold text-crop-800">{cropPrice(c)}</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(detail) || detailLoading}
        onClose={() => setDetail(null)}
        title={detail ? cropName(detail) : translate('cropsDb.detailsTitle')}
        size="lg"
      >
        {detailLoading ? (
          <PageLoader label={translate('cropsDb.loadingDetails')} />
        ) : detail ? (
          <div className="space-y-4">
            {detail.imageUrl ? (
              <ImageWithFallback
                src={detail.imageUrl}
                alt={cropName(detail)}
                className="h-52 w-full rounded-xl object-cover"
              />
            ) : null}
            <p className="text-sm italic text-ink-500">{detail.scientificName}</p>
            {cropDescription(detail) ? (
              <p className="text-sm text-ink-700">{cropDescription(detail)}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                [translate('cropsDb.soilLabel'), localizeTokens(detail.soilType, SOIL_TOKEN_KEYS, translate)],
                [translate('cropsDb.seasonLabel'), localizeTokens(detail.season, SEASON_TOKEN_KEYS, translate)],
                [translate('cropsDb.sowingLabel'), detail.sowingMonth],
                [translate('cropsDb.harvestLabel'), detail.harvestMonth],
                [translate('cropsDb.waterLabel'), localizeWater(detail.waterRequirement, translate)],
                [translate('cropsDb.avgYieldLabel'), cropYield(detail)],
                [translate('cropsDb.priceRangeLabel'), cropPrice(detail)],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-ink-50 px-3 py-2.5">
                    <p className="text-xs text-ink-500">{k}</p>
                    <p className="font-medium text-ink-800">{v}</p>
                  </div>
                ))}
            </div>
            {detail.commonDiseases ? (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-ink-900">{translate('cropsDb.commonDiseases')}</h4>
                <p className="text-sm text-ink-600">{detail.commonDiseases}</p>
              </div>
            ) : null}
            {detail.recommendedFertilizer ? (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-ink-900">
                  {translate('cropsDb.recommendedFertilizer')}
                </h4>
                <p className="text-sm text-ink-600">{detail.recommendedFertilizer}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
