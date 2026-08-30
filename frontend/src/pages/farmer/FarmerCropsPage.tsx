import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate } from '../../lib/format';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/StateComponents';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Crop } from '../../lib/types';

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'blue'> = {
  Growing: 'green',
  Harvested: 'amber',
  Planted: 'blue',
};

export function FarmerCropsPage() {
  const { user } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Crop[]>(() => api.getFarmerCrops(user!.id), [user?.id]);

  const [open, setOpen] = useState(false);
  const [cropName, setCropName] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [expectedHarvest, setExpectedHarvest] = useState('');
  const [status, setStatus] = useState('Growing');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Crop | null>(null);
  const [deleting, setDeleting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (cropName.trim().length < 2) {
      errorToast(translate('farmer.enterCropName'));
      return;
    }
    setSaving(true);
    try {
      await api.addCrop(user.id, {
        cropName: cropName.trim(),
        sowingDate: sowingDate || undefined,
        harvestDate: expectedHarvest || undefined,
        status,
      });
      successToast(translate('farmer.cropAdded').replace('{cropName}', cropName.trim()));
      setOpen(false);
      setCropName('');
      setSowingDate('');
      setExpectedHarvest('');
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.addCropError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCrop(user.id, deleteTarget.id);
      successToast(translate('farmer.cropRemoved'));
      setDeleteTarget(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.deleteCropError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('nav.crops')}
        subtitle={translate('farmer.cropsSubtitle')}
        icon="🌱"
        action={<Button onClick={() => setOpen(true)}>{translate('farmer.addCrop')}</Button>}
      />

      {loading ? (
        <PageLoader label={translate('farmer.cropsLoading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={translate('farmer.noCrops')}
          message={translate('farmer.noCropsMsg')}
          action={<Button onClick={() => setOpen(true)}>{translate('farmer.addCrop')}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardHeader
                title={c.cropName}
                subtitle={
                  c.sowingDate
                    ? translate('farmer.sownOn').replace('{date}', formatDate(c.sowingDate))
                    : translate('farmer.sowingDateNotSet')
                }
                action={
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={translate('farmer.cropDeleteAria')}
                  >
                    🗑
                  </button>
                }
              />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={STATUS_COLORS[c.status || 'Growing'] || 'blue'}>
                  {translate('farmer.cropStatus' + (c.status || 'Growing'))}
                </Badge>
                {c.harvestDate ? (
                  <span className="text-ink-500">
                    {translate('farmer.harvestBy').replace('{date}', formatDate(c.harvestDate))}
                  </span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={translate('farmer.addCropModal')} size="md">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={translate('farmer.cropName')}
            placeholder={translate('farmer.cropNamePlaceholder')}
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={translate('farmer.sowingDate')}
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
            />
            <Input
              label={translate('farmer.expectedHarvest')}
              type="date"
              value={expectedHarvest}
              onChange={(e) => setExpectedHarvest(e.target.value)}
            />
          </div>
          <Select label={translate('farmer.cropStatus')} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Planted">{translate('farmer.cropStatusPlanted')}</option>
            <option value="Growing">{translate('farmer.cropStatusGrowing')}</option>
            <option value="Harvested">{translate('farmer.cropStatusHarvested')}</option>
          </Select>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {translate('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {translate('farmer.addCropSubmit')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={translate('farmer.deleteCropTitle')}
        message={translate('farmer.deleteCropMsg').replace('{cropName}', deleteTarget?.cropName || '')}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel={translate('common.delete')}
      />
    </div>
  );
}
