import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR } from '../../lib/format';
import { cartLinesWithCatalog } from '../../lib/cart';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { Button } from '../../components/ui/Button';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import type { Address, Product } from '../../lib/types';

export function CartPage() {
  const { user } = useAuth();
  const { lines, setLineQuantity, removeProduct, syncFromServer } = useCart();
  const { errorToast, successToast } = useToast();
  const { translate } = useI18n();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<Map<number, Product>>(new Map());
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | 'new' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      api.getAddresses(user.id),
      Promise.all(
        lines.map((l) =>
          api
            .getProduct(l.productId)
            .then((p) => ({ ok: true as const, p }))
            .catch(() => ({ ok: false as const })),
        ),
      ),
    ])
      .then(([addrs, fetched]) => {
        if (cancelled) return;
        setAddresses(addrs);
        const products = fetched.filter((f): f is { ok: true; p: Product } => f.ok).map((f) => f.p);
        const map = new Map<number, Product>();
        products.forEach((p) => map.set(p.id, p));
        setCatalog(map);
        syncFromServer(products);
        setAddressId((prev) => (prev === '' ? (addrs.length ? addrs[0].id : 'new') : prev));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : translate('cart.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, lines, syncFromServer]);

  const viewLines = useMemo(() => cartLinesWithCatalog(lines, catalog), [lines, catalog]);
  const total = useMemo(() => viewLines.reduce((s, l) => s + l.lineTotal, 0), [viewLines]);

  const maxQtyFor = (productId: number) => {
    const p = catalog.get(productId);
    return Math.max(1, p ? Math.floor(Number(p.quantity) || 1) : 1);
  };

  const placeOrder = async () => {
    if (!user || viewLines.length === 0) return;
    if (addressId === '' || addressId === 'new' || !addresses.length) {
      errorToast(translate('cart.addDeliveryAddress'));
      return;
    }
    const address = addresses.find((a) => a.id === Number(addressId))?.fullAddress;
    if (!address) {
      errorToast(translate('cart.addDeliveryAddress'));
      return;
    }
    setPlacing(true);
    try {
      const placedIds: number[] = [];
      const failedNames: string[] = [];
      for (const line of lines) {
        const product = catalog.get(line.productId);
        if (!product) {
          failedNames.push(`#${line.productId}`);
          continue;
        }
        try {
          await api.placeOrder({ productId: line.productId, quantity: line.quantity, address });
          placedIds.push(line.productId);
        } catch {
          failedNames.push(product.cropName);
        }
      }
      if (placedIds.length) {
        placedIds.forEach((id) => removeProduct(id));
        successToast(translate('cart.orderPlaced').replace('{count}', String(placedIds.length)));
        if (failedNames.length) {
          errorToast(`${translate('cart.placeOrderError')}: ${failedNames.join(', ')}`);
        } else {
          navigate('/customer/orders');
        }
      } else {
        errorToast(translate('cart.placeOrderError'));
      }
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <PageLoader label={translate('cart.loading')} />;
  if (error) return <ErrorState message={error} />;
  if (viewLines.length === 0)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={translate('cart.title')} icon="🧺" />
        <EmptyState
          title={translate('cart.empty')}
          message={translate('cart.emptyHint')}
          action={
            <Link to="/customer/market">
              <Button>{translate('cart.browse')}</Button>
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={translate('cart.title')}
        subtitle={translate('cart.ready').replace('{count}', String(viewLines.length))}
        icon="🧺"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {viewLines.map((line) => (
            <div
              key={line.product.id}
              className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm"
            >
              <Link to={`/market/${line.product.id}`} className="shrink-0">
                <ImageWithFallback
                  src={line.product.photoUrl}
                  alt={line.product.cropName}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{line.product.cropName}</p>
                <p className="text-xs text-ink-500">
                  {formatINR(line.product.price)} / {line.product.unit || translate('cart.unit')} ·{' '}
                  {translate('cart.available').replace('{qty}', String(line.product.quantity))}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLineQuantity(line.product.id, Math.max(1, line.quantity - 1))}
                    className="h-7 w-7 rounded-md border border-ink-300 text-ink-600 hover:bg-ink-100"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineQuantity(line.product.id, Math.min(maxQtyFor(line.product.id), line.quantity + 1))
                    }
                    className="h-7 w-7 rounded-md border border-ink-300 text-ink-600 hover:bg-ink-100"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProduct(line.product.id)}
                    className="ml-auto text-xs font-medium text-red-600 hover:underline"
                  >
                    {translate('cart.remove')}
                  </button>
                </div>
              </div>
              <p className="shrink-0 font-bold text-crop-800">{formatINR(line.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="h-fit space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-ink-900">{translate('cart.orderSummary')}</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>{translate('cart.items')}</span>
                <span>{viewLines.reduce((s, l) => s + l.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>{translate('cart.subtotal')}</span>
                <span>{formatINR(total)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-bold text-ink-900">
                <span>{translate('cart.total')}</span>
                <span className="text-crop-800">{formatINR(total)}</span>
              </div>
              <p className="text-xs text-ink-400">{translate('cart.deliveryNote')}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-ink-900">{translate('cart.deliverTo')}</h3>
            {addresses.length ? (
              <select
                value={addressId === 'new' ? 'new' : Number(addressId)}
                onChange={(e) => setAddressId(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                className="mt-3 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}: {a.fullAddress}
                  </option>
                ))}
                <option value="new">{translate('cart.useDifferent')}</option>
              </select>
            ) : (
              <p className="mt-3 text-sm text-amber-600">{translate('cart.noAddress')}</p>
            )}
            <Link to="/customer/profile" className="mt-2 block text-xs font-medium text-crop-700 hover:underline">
              {translate('cart.manageAddresses')}
            </Link>
          </div>

          <Button fullWidth size="lg" onClick={placeOrder} loading={placing}>
            {translate('cart.placeOrder').replace('{total}', formatINR(total))}
          </Button>
        </div>
      </div>
    </div>
  );
}
