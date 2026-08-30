import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, joinUnit } from '../../lib/format';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import type { Product, ProductListResponse } from '../../lib/types';

const SORTS = [
  ['newest', 'market.sortNewest'],
  ['deal', 'market.sortDeal'],
  ['price_asc', 'market.sortPriceAsc'],
  ['price_desc', 'market.sortPriceDesc'],
  ['name', 'market.sortName'],
  ['rating', 'market.sortRating'],
];

export function MarketplacePage() {
  const { isLoggedIn, role } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();

  const [search, setSearch] = useState('');
  const [crop, setCrop] = useState('');
  const [organic, setOrganic] = useState('');
  const [sort, setSort] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('sort');
    return q || 'newest';
  });
  const [page, setPage] = useState(1);
  const [retryTick, setRetryTick] = useState(0);
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<Product[] | null>(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('sort');
    if (q) {
      setSort(q);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    api
      .getDeals()
      .then((res) => {
        if (!cancelled) setDeals(res);
      })
      .catch(() => {
        if (!cancelled) setDeals([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listProducts({
        search: search || undefined,
        crop: crop || undefined,
        organic: organic || undefined,
        sort,
        page,
        limit: 12,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : translate('market.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, crop, organic, sort, page, retryTick]);

  const toggleWishlist = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn || role !== 'customer') {
      errorToast(translate('market.loginToSave'));
      return;
    }
    try {
      const me = await api.me();
      await api.addWishlist(me.user.id, productId);
      successToast(translate('market.addedWishlist'));
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('market.wishlistError'));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title={translate('nav.marketplace')} subtitle={translate('market.subtitle')} icon="🧺" />

      {deals && deals.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink-900">🔥 {translate('market.todayDeals')}</span>
              <Badge variant="red">{deals.length}</Badge>
            </div>
            <Link
              to="/market?sort=deal"
              onClick={() => {
                setSearch('');
                setCrop('');
                setOrganic('');
                setPage(1);
              }}
              className="text-sm font-medium text-crop-700 hover:underline"
            >
              {translate('market.viewAll')} →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {deals.map((d) => (
              <Link
                key={d.id}
                to={`/market/${d.id}`}
                className="group relative w-52 shrink-0 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-crop-50">
                  <ImageWithFallback
                    src={d.photoUrl}
                    alt={d.cropName}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <Badge variant="red" className="absolute left-2.5 top-2.5">
                    −{d.discountPercent}%
                  </Badge>
                </div>
                <div className="p-3">
                  <h3 className="truncate font-semibold text-ink-900">{d.cropName}</h3>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="font-bold text-crop-800">{formatINR(d.price)}</span>
                    {d.compareToPrice ? (
                      <span className="text-xs text-ink-400 line-through">{formatINR(d.compareToPrice)}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-500">
                    {d.farmerName} · {d.location || '—'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-6 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder={translate('market.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder={translate('market.cropPlaceholder')}
          value={crop}
          onChange={(e) => {
            setCrop(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={organic}
          onChange={(e) => {
            setOrganic(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{translate('market.allFarmingTypes')}</option>
          <option value="true">{translate('market.organicOnly')}</option>
        </Select>
        <Select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          {SORTS.map(([v, k]) => (
            <option key={v} value={v}>
              {translate(k)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <PageLoader label={translate('market.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={translate('market.empty')} message={translate('market.emptyHint')} />
      ) : (
        <>
          <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((p) => (
              <StaggerItem key={p.id}>
                <Link
                  to={`/market/${p.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-crop-50">
                    <ImageWithFallback
                      src={p.photoUrl}
                      alt={p.cropName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(e, p.id)}
                      className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm hover:bg-white"
                      aria-label={translate('market.saveWishlist')}
                    >
                      🤍
                    </button>
                    <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
                      {p.discountPercent && p.discountPercent > 0 ? (
                        <Badge variant="red">−{p.discountPercent}%</Badge>
                      ) : null}
                      {p.organic ? <Badge variant="green">{translate('market.organic')}</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink-900">{p.cropName}</h3>
                      <p className="shrink-0 text-right">
                        <span className="font-bold text-crop-800">
                          {formatINR(p.price)}
                          <span className="text-[10px] font-medium text-ink-400">/{p.unit || 'kg'}</span>
                        </span>
                        {p.discountPercent && p.discountPercent > 0 && p.compareToPrice ? (
                          <span className="ml-1 block text-xs text-ink-400 line-through">
                            {formatINR(p.compareToPrice)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <p className="text-xs text-ink-500">
                      {p.farmerName || translate('roles.farmer')} · {p.location || '—'}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2 text-xs text-ink-500">
                      <span>{joinUnit(p.quantity, p.unit)}</span>
                      <span>⭐ {p.avgRating ? p.avgRating.toFixed(1) : translate('market.ratingNew')}</span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
          <Pagination page={data.page} pageSize={data.limit} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
