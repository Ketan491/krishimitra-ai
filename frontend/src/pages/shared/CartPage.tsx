import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR } from '../../lib/format';
import { cartLinesWithCatalog } from '../../lib/cart';
import { useCheckout, usePreloadRazorpay, type CheckoutLine } from '../../hooks/useCheckout';
import { PaymentMethodSelector } from '../../components/checkout/PaymentMethodSelector';
import { OrderSuccessPanel } from '../../components/checkout/OrderSuccessPanel';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { Button } from '../../components/ui/Button';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import type { Address, Order, PaymentConfig, PaymentMethod, Product } from '../../lib/types';

export function CartPage() {
  const { user } = useAuth();
  const { lines, setLineQuantity, removeProduct, syncFromServer } = useCart();
  const { errorToast, successToast } = useToast();
  const { translate } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [catalog, setCatalog] = useState<Map<number, Product>>(new Map());
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | 'new' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('razorpay');
  const [placed, setPlaced] = useState<Order[]>([]);
  const [placedMethod, setPlacedMethod] = useState<PaymentMethod | null>(null);

  // "Buy Now" from a product page arrives as ?buyNow=<productId>&qty=<n> and
  // checks out just that line, leaving the rest of the cart alone.
  const buyNowId = Number(searchParams.get('buyNow')) || 0;
  const buyNowQty = Math.max(1, Number(searchParams.get('qty')) || 1);

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
  }, [user, lines, syncFromServer, translate]);

  useEffect(() => {
    let cancelled = false;
    api
      .paymentConfig()
      .then((cfg) => {
        if (cancelled) return;
        setPaymentConfig(cfg);
        // Default to online when it exists, otherwise the only option on offer.
        setMethod(cfg.enabled ? 'razorpay' : 'cod');
      })
      .catch(() => setPaymentConfig(null));
    return () => {
      cancelled = true;
    };
  }, []);

  usePreloadRazorpay(Boolean(paymentConfig?.enabled));

  const viewLines = useMemo(() => cartLinesWithCatalog(lines, catalog), [lines, catalog]);

  // Restrict the basket to the Buy Now item when that flow is active.
  const activeLines: CheckoutLine[] = useMemo(() => {
    if (buyNowId) {
      const product = catalog.get(buyNowId);
      if (!product) return [];
      return [{ productId: product.id, quantity: buyNowQty, productName: product.cropName }];
    }
    return viewLines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
      productName: l.product.cropName,
    }));
  }, [buyNowId, buyNowQty, catalog, viewLines]);

  const total = useMemo(
    () => (buyNowId ? buyNowQty * (catalog.get(buyNowId)?.price ?? 0) : viewLines.reduce((s, l) => s + l.lineTotal, 0)),
    [buyNowId, buyNowQty, catalog, viewLines],
  );

  const address = useMemo(() => {
    if (addressId === '' || addressId === 'new') return '';
    return addresses.find((a) => a.id === Number(addressId))?.fullAddress || '';
  }, [addressId, addresses]);

  const resolveAddress = useCallback((): string | null => {
    if (addressId === '' || addressId === 'new' || !addresses.length) {
      errorToast(translate('cart.addDeliveryAddress'));
      return null;
    }
    const found = addresses.find((a) => a.id === Number(addressId))?.fullAddress;
    if (!found) {
      errorToast(translate('cart.addDeliveryAddress'));
      return null;
    }
    return found;
  }, [addressId, addresses, errorToast, translate]);

  const onSuccess = useCallback(
    (result: { orders: Order[]; failed: string[]; method: PaymentMethod | null }) => {
      result.orders.forEach((o) => removeProduct(o.productId));
      setPlaced(result.orders);
      setPlacedMethod(result.method);
      successToast(translate('cart.orderPlaced').replace('{count}', String(result.orders.length)));
      if (result.failed.length) {
        errorToast(`${translate('cart.placeOrderError')}: ${result.failed.join(', ')}`);
      }
      setSearchParams({}, { replace: true });
    },
    [removeProduct, successToast, errorToast, translate, setSearchParams],
  );

  const onFailure = useCallback(
    (message: string) => {
      if (message === 'payment-unavailable') errorToast(translate('pay.onlineUnavailable'));
      else if (message === 'missing-address') errorToast(translate('cart.addDeliveryAddress'));
      else errorToast(message || translate('cart.placeOrderError'));
    },
    [errorToast, translate],
  );

  const { busy, activeLine, checkout } = useCheckout({
    lines: activeLines,
    address,
    config: paymentConfig,
    method,
    customerName: user?.name ?? '',
    onSuccess,
    onFailure,
  });

  const startCheckoutFlow = async (override?: PaymentMethod) => {
    if (!user) {
      navigate('/login', { state: { from: '/customer/cart' } });
      return;
    }
    if (activeLines.length === 0) return;
    if (!resolveAddress()) return;
    if (override) setMethod(override);
    await checkout(override);
  };

  const maxQtyFor = (productId: number) => {
    const p = catalog.get(productId);
    return Math.max(1, p ? Math.floor(Number(p.quantity) || 1) : 1);
  };

  const canQuickPay = Boolean(address) && activeLines.length > 0 && (method === 'cod' || paymentConfig?.enabled);
  const onlineChosen = method === 'razorpay' && Boolean(paymentConfig?.enabled);

  if (loading) return <PageLoader label={translate('cart.loading')} />;
  if (error) return <ErrorState message={error} />;

  if (placed.length) {
    return (
      <div className="space-y-6">
        <OrderSuccessPanel
          orders={placed}
          method={placedMethod}
          onContinueShopping={() => {
            setPlaced([]);
            navigate('/customer/market');
          }}
        />
        <div className="text-center">
          <button
            type="button"
            onClick={() => setPlaced([])}
            className="text-sm font-medium text-crop-700 hover:underline"
          >
            ← {translate('cart.backToCart')}
          </button>
        </div>
      </div>
    );
  }

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

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <PaymentMethodSelector
              config={paymentConfig}
              method={method}
              onChange={setMethod}
              total={total}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Button
              fullWidth
              size="lg"
              variant={onlineChosen ? 'primary' : 'success'}
              onClick={() => startCheckoutFlow()}
              loading={busy}
              disabled={activeLines.length === 0}
            >
              {busy && activeLine !== null
                ? translate('pay.paying')
                : onlineChosen
                  ? translate('pay.payNow').replace('{total}', formatINR(total))
                  : translate('pay.payNowCod').replace('{total}', formatINR(total))}
            </Button>

            {canQuickPay ? (
              <Button
                fullWidth
                variant="outline"
                onClick={() => startCheckoutFlow(onlineChosen ? 'cod' : 'razorpay')}
                disabled={busy}
              >
                ⚡ {translate('pay.quickPay')} · {onlineChosen ? translate('pay.methodCod') : translate('pay.methodOnline')}
              </Button>
            ) : null}

            <div className="flex items-center justify-center gap-4 pt-1 text-xs font-medium text-crop-700">
              <Link to="/customer/market" className="hover:underline">
                {translate('pay.continueShopping')}
              </Link>
              <Link to="/customer/orders" className="hover:underline">
                {translate('pay.myOrders')}
              </Link>
              <Link to="/customer/orders" className="hover:underline">
                {translate('pay.trackOrder')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
