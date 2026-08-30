import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../contexts/ToastContext';
import { formatINR } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { StaggerGroup, StaggerItem } from '../../components/motion/FadeIn';
import { useAsync } from '../../hooks/useAsync';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import type { Equipment } from '../../lib/types';

export function EquipmentPage() {
  const { role, user } = useAuth();
  const { translate } = useI18n();
  const { successToast, errorToast } = useToast();
  const { data, loading, error, reload } = useAsync<Equipment[]>(() => api.equipment(), []);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [rentPerDay, setRentPerDay] = useState('');
  const [availability, setAvailability] = useState(true);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFarmer = role === 'farmer';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (type.trim().length < 2) {
      errorToast(translate('equipment.typeError'));
      return;
    }
    if (!Number(rentPerDay) || Number(rentPerDay) <= 0) {
      errorToast(translate('equipment.rentError'));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('rentPerDay', rentPerDay);
      fd.append('availability', String(availability));
      fd.append('description', description);
      if (photo) fd.append('photo', photo);
      await api.createEquipment(fd);
      successToast(translate('equipment.listedSuccess'));
      setOpen(false);
      setType('');
      setRentPerDay('');
      setDescription('');
      setPhoto(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('equipment.listError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={translate('equipment.title')}
        subtitle={translate('equipment.subtitle')}
        icon="🚜"
        action={
          isFarmer ? <Button onClick={() => setOpen(true)}>+ {translate('actions.listEquipment')}</Button> : undefined
        }
      />

      {loading ? (
        <PageLoader label={translate('equipment.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={translate('equipment.emptyTitle')}
          message={isFarmer ? translate('equipment.emptyFarmer') : translate('equipment.emptySoon')}
        />
      ) : (
        <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((eq) => (
            <StaggerItem key={eq.id}>
              <Card className="flex h-full flex-col overflow-hidden p-0">
                <div className="aspect-[16/9] w-full bg-crop-50">
                  <ImageWithFallback src={eq.photoUrl} alt={eq.type} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink-900">{eq.type}</h3>
                    <Badge variant={eq.availability ? 'green' : 'red'}>
                      {eq.availability ? translate('equipment.available') : translate('equipment.rentedOut')}
                    </Badge>
                  </div>
                  {eq.description ? <p className="mt-1.5 flex-1 text-sm text-ink-600">{eq.description}</p> : null}
                  <div className="mt-3 flex items-end justify-between border-t border-ink-100 pt-3">
                    <p className="text-lg font-bold text-crop-800">
                      {formatINR(eq.rentPerDay)}
                      <span className="text-xs font-medium text-ink-500"> {translate('equipment.perDay')}</span>
                    </p>
                    <p className="text-xs text-ink-500">
                      {eq.farmerName} · {eq.farmerLocation || '—'}
                    </p>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={translate('equipment.modalTitle')} size="md">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={translate('equipment.typeLabel')}
            placeholder={translate('equipment.typePlaceholder')}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <Input
            label={translate('equipment.rentLabel')}
            type="number"
            min={0}
            value={rentPerDay}
            onChange={(e) => setRentPerDay(e.target.value)}
          />
          <Input
            label={translate('equipment.description')}
            placeholder={translate('equipment.descPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={availability}
              onChange={(e) => setAvailability(e.target.checked)}
              className="h-4 w-4 accent-crop-700"
            />
            {translate('equipment.availableNow')}
          </label>
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
              {photo ? `📷 ${photo.name}` : `📷 ${translate('equipment.addPhoto')}`}
            </button>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {translate('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {translate('actions.listEquipment')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
