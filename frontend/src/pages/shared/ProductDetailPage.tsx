import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDate, joinUnit, getDiscountPercent, convertPriceRate } from '../../lib/format';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { Badge, ApprovalBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { RatingStars } from '../../components/ui/RatingStars';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader, ErrorState } from '../../components/ui/StateComponents';
import { useAsync } from '../../hooks/useAsync';
import type { Product } from '../../lib/types';

export function ProductDetailPage() {
  const { id } = useParams();
  const { isLoggedIn, role } = useAuth();
  const { setLineQuantity } = useCart();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const { data: product, loading, error, refetch } = useAsync<Product>(() => api.getProduct(id!), [id]);

  if (loading) return <PageLoader label={translate('product.loading')} />;
  if (error || !product)
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <ErrorState message={error || translate('product.notFound')} onRetry={refetch} />
      </div>
    );

  const maxQty = Math.max(1, Math.floor(Number(product.quantity) || 1));
  const effectiveQty = Math.min(qty, maxQty);

  const unit = product.unit || 'kg';
  const dealPct = getDiscountPercent(product);
  const savingsAmount =
    dealPct > 0 && product.compareToPrice ? formatINR(product.compareToPrice - product.price) : null;
  const rateHints: [string, number][] = [];
  if (['kg', 'kilogram', 'g', 'gram'].includes(unit.toLowerCase())) {
    const q = convertPriceRate(product.price, unit, 'quintal');
    const t = convertPriceRate(product.price, unit, 'tonne');
    if (q !== null) rateHints.push(['quintal', q]);
    if (t !== null) rateHints.push(['tonne', t]);
  } else {
    const k = convertPriceRate(product.price, unit, 'kg');
    if (k !== null) rateHints.push(['kg', k]);
  }

  const requireCustomer = () => {
    if (!isLoggedIn || role !== 'customer') {
      errorToast(translate('product.loginToContinue'));
      navigate('/login', { state: { from: `/market/${product.id}` } });
      return false;
    }
    return true;
  };

  const addToCart = () => {
    if (!requireCustomer()) return;
    setLineQuantity(product.id, effectiveQty);
    successToast(
      translate('product.addToCartToast')
        .replace('{qty}', String(effectiveQty))
        .replace('{unit}', product.unit || translate('cart.unit'))
        .replace('{name}', product.cropName),
    );
  };

  const buyNow = () => {
    if (!requireCustomer()) return;
    setLineQuantity(product.id, effectiveQty);
    navigate('/customer/cart');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/market" className="mb-4 text-sm font-medium text-crop-700 hover:underline">
        {translate('product.back')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white">
          <div className="aspect-[4/3] w-full">
            <ImageWithFallback src={product.photoUrl} alt={product.cropName} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <ApprovalBadge approved={product.approved} />
            {product.organic ? <Badge variant="green">{translate('product.organic')}</Badge> : null}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">{product.cropName}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink-500">
            <RatingStars value={product.avgRating} showValue />
            <span>{translate('product.reviewCount').replace('{count}', String(product.reviewCount))}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-3xl font-extrabold text-crop-800">
              {formatINR(product.price)}
              <span className="text-base font-medium text-ink-500">
                {translate('product.perUnit').replace('{unit}', unit)}
              </span>
            </p>
            {product.compareToPrice && product.compareToPrice > product.price ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg text-ink-400 line-through">{formatINR(product.compareToPrice)}</span>
                {dealPct > 0 ? <Badge variant="red">−{dealPct}%</Badge> : null}
              </div>
            ) : null}
          </div>
          {savingsAmount ? (
            <p className="mt-1 text-sm font-medium text-crop-700">
              {translate('product.savings').replace('{amount}', savingsAmount)}
            </p>
          ) : null}
          {rateHints.length > 0 ? (
            <p className="mt-1 text-xs text-ink-500">
              {rateHints
                .map(([u, v]) => translate('product.rateHint').replace('{rate}', formatINR(v)).replace('{unit}', u))
                .join(' · ')}
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[
              [translate('product.stock'), joinUnit(product.quantity, product.unit)],
              [translate('product.grower'), product.farmerName || '—'],
              [translate('common.location'), product.location || '—'],
              [translate('product.harvested'), product.harvestDate ? formatDate(product.harvestDate) : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-ink-50 px-3 py-2.5">
                <p className="text-xs text-ink-500">{k}</p>
                <p className="font-semibold text-ink-800">{v}</p>
              </div>
            ))}
          </div>

          {product.description ? (
            <div className="mt-5">
              <h3 className="font-semibold text-ink-900">{translate('product.about')}</h3>
              <p className="mt-1 text-sm text-ink-600">{product.description}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-ink-300">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-ink-600 hover:bg-ink-100"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold">{effectiveQty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="px-3 py-2 text-ink-600 hover:bg-ink-100"
              >
                +
              </button>
            </div>
            <Button variant="secondary" onClick={addToCart}>
              {translate('actions.addToCart')}
            </Button>
            <Button variant="success" onClick={buyNow}>
              {translate('product.buyNow').replace('{price}', formatINR(product.price * effectiveQty))}
            </Button>
          </div>

          {isLoggedIn && role === 'farmer' ? (
            <p className="mt-3 text-xs text-ink-400">{translate('product.farmerManageNote')}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-12">
        <CardHeader
          title={translate('product.reviewsTitle').replace('{count}', String(product.reviewCount))}
          subtitle={translate('product.reviewsSubtitle')}
        />
        {!product.reviews || product.reviews.length === 0 ? (
          <Card className="text-sm text-ink-500">{translate('product.noReviews')}</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {product.reviews.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start gap-3">
                  <Avatar name={r.customerName} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-900">
                        {r.customerName || translate('product.customerLabel').replace('{id}', String(r.customerId))}
                      </p>
                      <span className="text-xs text-ink-400">{formatDate(r.createdAt)}</span>
                    </div>
                    <RatingStars value={r.rating} size="sm" />
                    {r.comment ? <p className="mt-2 text-sm text-ink-600">{r.comment}</p> : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
