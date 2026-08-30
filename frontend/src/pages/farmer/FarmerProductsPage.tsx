import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR, formatDate } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { ApprovalBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageLoader, ErrorState, EmptyState, InlineError } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import { validateProductForm } from '../../lib/validators';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import type { Product } from '../../lib/types';

export function FarmerProductsPage() {
  const { user } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Product[]>(() => api.getFarmerProducts(user!.id), [user?.id]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    cropName: '',
    price: '',
    quantity: '',
    unit: 'kg',
    organic: false,
    compareToPrice: '',
    description: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ cropName: '', price: '', quantity: '', unit: 'kg', organic: false, compareToPrice: '', description: '' });
    setPhoto(null);
    setFieldError(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      cropName: p.cropName,
      price: String(p.price),
      quantity: String(p.quantity),
      unit: p.unit || 'kg',
      organic: Boolean(p.organic),
      compareToPrice: p.compareToPrice ? String(p.compareToPrice) : '',
      description: p.description || '',
    });
    setPhoto(null);
    setFieldError(null);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const check = validateProductForm(form);
    if (!check.valid) {
      setFieldError(check.message || translate('farmer.checkForm'));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('cropName', form.cropName.trim());
      fd.append('price', form.price);
      fd.append('quantity', form.quantity);
      fd.append('unit', form.unit);
      fd.append('organic', String(form.organic));
      fd.append('compareToPrice', form.compareToPrice);
      fd.append('description', form.description);
      if (photo) fd.append('photo', photo);
      if (editing) {
        await api.updateProduct(editing.id, fd);
        successToast(translate('farmer.productUpdated'));
      } else {
        await api.createProduct(fd);
        successToast(translate('farmer.productListed'));
      }
      setOpen(false);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.saveProductError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteTarget.id);
      successToast(translate('farmer.productRemoved'));
      setDeleteTarget(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.deleteProductError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('nav.products')}
        subtitle={translate('farmer.productsSubtitle')}
        icon="🧺"
        action={<Button onClick={openAdd}>{translate('farmer.listProduct')}</Button>}
      />

      {fieldError ? (
        <div className="mb-4">
          <InlineError message={fieldError} />
        </div>
      ) : null}

      {loading ? (
        <PageLoader label={translate('farmer.productsLoading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={translate('farmer.noProducts')}
          message={translate('farmer.noProductsMsg')}
          action={<Button onClick={openAdd}>{translate('farmer.listProduct')}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} padded={false}>
              <div className="flex gap-3 p-4">
                <ImageWithFallback
                  src={p.photoUrl}
                  alt={p.cropName}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold text-ink-900">{p.cropName}</h3>
                    <ApprovalBadge approved={p.approved} />
                  </div>
                  <p className="text-xs text-ink-500">
                    {p.quantity} {p.unit} · {translate('farmer.listedOn').replace('{date}', formatDate(p.createdAt))}
                  </p>
                  <p className="mt-1 font-bold text-crop-800">
                    {formatINR(p.price)} / {p.unit}
                    {p.compareToPrice ? (
                      <span className="ml-2 text-xs font-normal text-ink-400 line-through">
                        {formatINR(p.compareToPrice)}
                      </span>
                    ) : null}
                    {p.discountPercent && p.discountPercent > 0 ? (
                      <span className="ml-2 text-xs font-semibold text-red-600">−{p.discountPercent}%</span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-ink-100 p-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                  ✏️ {translate('common.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>
                  🗑 {translate('common.delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `${translate('common.edit')} ${editing.cropName}` : translate('farmer.listProductModal')}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={translate('farmer.cropNameRequired')}
              placeholder={translate('farmer.productCropNamePlaceholder')}
              value={form.cropName}
              onChange={(e) => setForm({ ...form, cropName: e.target.value })}
            />
            <Input
              label={translate('farmer.unit')}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder={translate('farmer.unitPlaceholder')}
            />
            <Input
              label={translate('farmer.priceRequired')}
              type="number"
              min={0}
              placeholder={translate('farmer.pricePlaceholder')}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label={translate('farmer.mrp')}
              hint={translate('farmer.mrpHint')}
              type="number"
              min={0}
              placeholder={translate('farmer.mrpPlaceholder')}
              value={form.compareToPrice}
              onChange={(e) => setForm({ ...form, compareToPrice: e.target.value })}
            />
            <Input
              label={translate('farmer.quantityRequired')}
              type="number"
              min={0}
              placeholder={translate('farmer.quantityPlaceholder')}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.organic}
              onChange={(e) => setForm({ ...form, organic: e.target.checked })}
              className="h-4 w-4 accent-crop-700"
            />
            {translate('farmer.organic')}
          </label>
          <Textarea
            label={translate('farmer.description')}
            placeholder={translate('farmer.descriptionPlaceholder')}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              {photo
                ? `📷 ${photo.name}`
                : editing && editing.photoUrl
                  ? translate('farmer.replacePhoto')
                  : translate('farmer.addPhoto')}
            </button>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {translate('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? translate('farmer.saveChanges') : translate('farmer.listProductSubmit')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={translate('farmer.deleteProductTitle')}
        message={translate('farmer.deleteProductMsg').replace('{cropName}', deleteTarget?.cropName || '')}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel={translate('common.delete')}
      />
    </div>
  );
}
