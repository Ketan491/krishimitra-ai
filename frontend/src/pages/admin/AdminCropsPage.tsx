import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { CropRecord } from '../../lib/types';

interface CropForm {
  nameEn: string;
  scientificName: string;
  soilType: string;
  season: string;
  sowingMonth: string;
  harvestMonth: string;
  waterRequirement: string;
  avgYield: string;
  priceRange: string;
  description: string;
  commonDiseases: string;
  recommendedFertilizer: string;
}

const EMPTY: CropForm = {
  nameEn: '',
  scientificName: '',
  soilType: 'Alluvial',
  season: 'Kharif',
  sowingMonth: '',
  harvestMonth: '',
  waterRequirement: 'Irrigated',
  avgYield: '',
  priceRange: '',
  description: '',
  commonDiseases: '',
  recommendedFertilizer: '',
};

export function AdminCropsPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<CropRecord[]>(() => api.cropCatalog({}).then((r) => r.items), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CropRecord | null>(null);
  const [form, setForm] = useState<CropForm>(EMPTY);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CropRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setImage(null);
    setOpen(true);
  };

  const openEdit = (c: CropRecord) => {
    setEditing(c);
    setForm({
      nameEn: c.nameEn,
      scientificName: c.scientificName || '',
      soilType: c.soilType || 'Alluvial',
      season: c.season || 'Kharif',
      sowingMonth: c.sowingMonth || '',
      harvestMonth: c.harvestMonth || '',
      waterRequirement: c.waterRequirement || 'Irrigated',
      avgYield: c.avgYield || '',
      priceRange: c.priceRange || '',
      description: c.description || '',
      commonDiseases: c.commonDiseases || '',
      recommendedFertilizer: c.recommendedFertilizer || '',
    });
    setImage(null);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nameEn.trim().length < 2) {
      errorToast(translate('admin.validCropName'));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      (Object.keys(form) as (keyof CropForm)[]).forEach((k) => fd.append(k, form[k]));
      if (image) fd.append('image', image);
      if (editing) {
        await api.updateCrop(editing.id, fd);
        successToast(translate('admin.cropUpdated'));
      } else {
        await api.createCrop(fd);
        successToast(translate('admin.cropAdded'));
      }
      setOpen(false);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.cropSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCropCatalogEntry(deleteTarget.id);
      successToast(translate('admin.cropRemoved'));
      setDeleteTarget(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.cropDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('nav.process')}
        subtitle={translate('admin.manageCrops').replace('{count}', String(data?.length || 0))}
        icon="🌱"
        action={<Button onClick={openAdd}>{translate('admin.addCropHeader')}</Button>}
      />

      <DataTable<CropRecord>
        loading={loading}
        rows={data || []}
        rowKey={(r) => r.id}
        emptyTitle={translate('admin.noCrops')}
        emptyMessage={translate('admin.noCropsMessage')}
        columns={[
          {
            key: 'name',
            header: translate('admin.crop'),
            render: (r) => (
              <div>
                <p className="font-semibold text-ink-900">{r.nameEn}</p>
                <p className="text-xs italic text-ink-500">{r.scientificName}</p>
              </div>
            ),
          },
          {
            key: 'meta',
            header: translate('admin.soilSeason'),
            render: (r) => (
              <div className="flex flex-wrap gap-1.5">
                {r.soilType ? <Badge variant="soil">{r.soilType}</Badge> : null}
                {r.season ? <Badge variant="amber">{r.season}</Badge> : null}
                {r.waterRequirement ? <Badge variant="blue">{r.waterRequirement}</Badge> : null}
              </div>
            ),
          },
          { key: 'yield', header: translate('admin.avgYield'), render: (r) => r.avgYield || '—' },
          { key: 'price', header: translate('admin.priceRange'), render: (r) => r.priceRange || '—' },
          {
            key: 'actions',
            header: translate('admin.actions'),
            render: (r) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                  {translate('common.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteTarget(r)}>
                  🗑
                </Button>
              </div>
            ),
          },
        ]}
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing ? translate('admin.editCrop').replace('{name}', editing.nameEn) : translate('admin.addCropModal')
        }
        size="xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={translate('admin.cropName')}
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
            <Input
              label={translate('admin.scientificName')}
              value={form.scientificName}
              onChange={(e) => setForm({ ...form, scientificName: e.target.value })}
            />
            <Select
              label={translate('admin.soilType')}
              value={form.soilType}
              onChange={(e) => setForm({ ...form, soilType: e.target.value })}
            >
              {['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select
              label={translate('admin.season')}
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
            >
              {['Kharif', 'Rabi', 'Zaid'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Input
              label={translate('admin.sowingMonth')}
              value={form.sowingMonth}
              onChange={(e) => setForm({ ...form, sowingMonth: e.target.value })}
              placeholder={translate('admin.sowingMonthPlaceholder')}
            />
            <Input
              label={translate('admin.harvestMonth')}
              value={form.harvestMonth}
              onChange={(e) => setForm({ ...form, harvestMonth: e.target.value })}
              placeholder={translate('admin.harvestMonthPlaceholder')}
            />
            <Select
              label={translate('admin.waterRequirement')}
              value={form.waterRequirement}
              onChange={(e) => setForm({ ...form, waterRequirement: e.target.value })}
            >
              {['Irrigated', 'Rain-fed', 'Low', 'Medium', 'High'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Input
              label={translate('admin.averageYield')}
              value={form.avgYield}
              onChange={(e) => setForm({ ...form, avgYield: e.target.value })}
              placeholder={translate('admin.avgYieldPlaceholder')}
            />
          </div>
          <Input
            label={translate('admin.priceRange')}
            value={form.priceRange}
            onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
            placeholder={translate('admin.priceRangePlaceholder')}
          />
          <Textarea
            label={translate('admin.description')}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Textarea
            label={translate('admin.commonDiseases')}
            rows={2}
            value={form.commonDiseases}
            onChange={(e) => setForm({ ...form, commonDiseases: e.target.value })}
          />
          <Textarea
            label={translate('admin.recommendedFertilizer')}
            rows={2}
            value={form.recommendedFertilizer}
            onChange={(e) => setForm({ ...form, recommendedFertilizer: e.target.value })}
          />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-3 text-sm text-ink-600 hover:border-crop-400"
            >
              {image ? `📷 ${image.name}` : translate('admin.cropPhoto')}
            </button>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {translate('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? translate('admin.saveChanges') : translate('admin.addCrop')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={translate('admin.deleteCropTitle')}
        message={translate('admin.deleteCropMessage').replace('{name}', deleteTarget?.nameEn || '')}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel={translate('common.delete')}
      />
    </div>
  );
}
