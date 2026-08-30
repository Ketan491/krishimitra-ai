import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import { useAsync } from '../../hooks/useAsync';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import type { WishlistItem } from '../../lib/types';

export function CustomerWishlistPage() {
  const { user } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { setLineQuantity, refresh, lines } = useCart();
  const { data, loading, error, reload } = useAsync<WishlistItem[]>(() => api.getWishlist(user!.id), [user?.id]);

  const remove = async (productId: number) => {
    try {
      await api.removeWishlist(user!.id, productId);
      successToast(translate('customer.wishlistRemoved'));
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('customer.wishlistRemoveError'));
    }
  };

  const moveToCart = (w: WishlistItem) => {
    const p = w.product;
    if (!p) return;
    const existing = lines.find((l) => l.productId === p.id)?.quantity || 0;
    const max = Math.max(1, Math.floor(Number(p.quantity) || 1));
    setLineQuantity(p.id, Math.min(max, existing + 1));
    refresh();
    successToast(translate('customer.addedToCart').replace('{name}', p.cropName));
  };

  if (loading) return <PageLoader label={translate('customer.wishlistLoading')} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const items = (data || []).filter((w) => w.product);

  return (
    <div>
      <PageHeader title={translate('nav.wishlist')} subtitle={translate('customer.wishlistSubtitle')} icon="❤️" />

      {items.length === 0 ? (
        <EmptyState
          title={translate('customer.wishlistEmpty')}
          message={translate('customer.wishlistEmptyMsg')}
          action={
            <Link to="/customer/market">
              <Button>{translate('customer.browseMarketplaceBtn')}</Button>
            </Link>
          }
        />
      ) : (
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => {
            const p = w.product!;
            return (
              <StaggerItem key={w.wishlistId}>
                <Card padded={false}>
                  <Link to={`/market/${p.id}`}>
                    <div className="aspect-[16/9] w-full bg-crop-50">
                      <ImageWithFallback src={p.photoUrl} alt={p.cropName} className="h-full w-full object-cover" />
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink-900">{p.cropName}</h3>
                      <p className="font-bold text-crop-800">{formatINR(p.price)}</p>
                    </div>
                    <p className="text-xs text-ink-500">
                      {p.farmerName || translate('roles.farmer')} · {p.location || '—'}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => moveToCart(w)}>
                        🛒 {translate('actions.addToCart')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(p.id)}>
                        🗑
                      </Button>
                    </div>
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
