import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatINR } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Equipment } from '../../lib/types';

export function AdminEquipmentPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Equipment[]>(() => api.equipment(), []);

  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState({ rentPerDay: '', availability: true, description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEdit = (eq: Equipment) => {
    setEditing(eq);
    setForm({ rentPerDay: String(eq.rentPerDay), availability: eq.availability, description: eq.description || '' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!Number(form.rentPerDay) || Number(form.rentPerDay) <= 0) {
      errorToast(translate('admin.validDailyRent'));
      return;
    }
    setSaving(true);
    try {
      await api.updateEquipment(editing.id, {
        rentPerDay: Number(form.rentPerDay),
        availability: form.availability,
        description: form.description || undefined,
      });
      successToast(translate('admin.equipmentUpdated'));
      setEditing(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.equipmentUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEquipment(deleteTarget.id);
      successToast(translate('admin.equipmentRemoved'));
      setDeleteTarget(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.equipmentDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title={translate('nav.equipment')} subtitle={translate('admin.equipmentSubtitle')} icon="🚜" />

      <DataTable<Equipment>
        loading={loading}
        rows={data || []}
        rowKey={(r) => r.id}
        emptyTitle={translate('admin.noEquipment')}
        emptyMessage={translate('admin.noEquipmentMessage')}
        columns={[
          {
            key: 'type',
            header: translate('nav.equipment'),
            render: (r) => <p className="font-semibold text-ink-900">{r.type}</p>,
          },
          {
            key: 'owner',
            header: translate('admin.owner'),
            render: (r) => `${r.farmerName || `F#${r.farmerId}`} · ${r.farmerLocation || '—'}`,
          },
          {
            key: 'rent',
            header: translate('admin.rentPerDay'),
            render: (r) => <span className="font-semibold text-crop-800">{formatINR(r.rentPerDay)}</span>,
          },
          {
            key: 'avail',
            header: translate('admin.availability'),
            render: (r) =>
              r.availability ? (
                <Badge variant="green">{translate('admin.available')}</Badge>
              ) : (
                <Badge variant="red">{translate('admin.rented')}</Badge>
              ),
          },
          {
            key: 'actions',
            header: translate('admin.actions'),
            render: (r) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                  ✏️
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={translate('admin.editEquipment').replace('{name}', editing?.type || '')}
        size="sm"
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={translate('admin.rentPerDayLabel')}
            type="number"
            min={0}
            value={form.rentPerDay}
            onChange={(e) => setForm({ ...form, rentPerDay: e.target.value })}
          />
          <Input
            label={translate('admin.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.checked })}
              className="h-4 w-4 accent-crop-700"
            />
            {translate('admin.availableForRent')}
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
              {translate('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {translate('admin.saveChanges')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={translate('admin.deleteEquipmentTitle')}
        message={translate('admin.deleteEquipmentMessage').replace('{name}', deleteTarget?.type || '')}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel={translate('common.delete')}
      />
    </div>
  );
}
