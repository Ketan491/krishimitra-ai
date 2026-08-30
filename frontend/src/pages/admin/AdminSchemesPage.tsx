import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { Scheme } from '../../lib/types';

interface SchemeForm {
  name: string;
  category: string;
  min_land: string;
  max_land: string;
  crop: string;
  equipmentType: string;
  description: string;
}

const EMPTY: SchemeForm = {
  name: '',
  category: 'subsidy',
  min_land: '0',
  max_land: '999',
  crop: '',
  equipmentType: '',
  description: '',
};

export function AdminSchemesPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data, loading, error, reload } = useAsync<Scheme[]>(() => api.listSchemes(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Scheme | null>(null);
  const [form, setForm] = useState<SchemeForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Scheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (s: Scheme) => {
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category || 'subsidy',
      min_land: String(s.min_land),
      max_land: String(s.max_land),
      crop: s.crop || '',
      equipmentType: s.equipmentType || '',
      description: s.description || '',
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      errorToast(translate('admin.validSchemeName'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        min_land: Number(form.min_land) || 0,
        max_land: Number(form.max_land) || 999,
        crop: form.crop || undefined,
        equipmentType: form.equipmentType || undefined,
        description: form.description,
      };
      if (editing) {
        await api.updateScheme(editing.id, payload);
        successToast(translate('admin.schemeUpdated'));
      } else {
        await api.createScheme(payload);
        successToast(translate('admin.schemeAdded'));
      }
      setOpen(false);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.schemeSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteScheme(deleteTarget.id);
      successToast(translate('admin.schemeRemoved'));
      setDeleteTarget(null);
      reload();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.schemeDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('nav.schemes')}
        subtitle={translate('admin.schemesSubtitle')}
        icon="🏛️"
        action={<Button onClick={openAdd}>{translate('admin.addSchemeHeader')}</Button>}
      />

      <DataTable<Scheme>
        loading={loading}
        rows={data || []}
        rowKey={(r) => r.id}
        emptyTitle={translate('admin.noSchemes')}
        emptyMessage={translate('admin.noSchemesMessage')}
        columns={[
          {
            key: 'name',
            header: translate('admin.scheme'),
            render: (r) => <p className="font-semibold text-ink-900">{r.name}</p>,
          },
          {
            key: 'cat',
            header: translate('admin.category'),
            render: (r) => <Badge variant="blue">{r.category || 'scheme'}</Badge>,
          },
          {
            key: 'land',
            header: translate('admin.landEligibility'),
            render: (r) =>
              translate('admin.landRange').replace('{min}', String(r.min_land)).replace('{max}', String(r.max_land)),
          },
          { key: 'crop', header: translate('admin.crop'), render: (r) => r.crop || '—' },
          {
            key: 'desc',
            header: translate('admin.description'),
            render: (r) => <span className="text-sm text-ink-600">{r.description}</span>,
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
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing ? translate('admin.editScheme').replace('{name}', editing.name) : translate('admin.addSchemeModal')
        }
        size="md"
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={translate('admin.schemeName')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={translate('admin.category')}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder={translate('admin.categoryPlaceholder')}
            />
            <Input
              label={translate('admin.cropOptional')}
              value={form.crop}
              onChange={(e) => setForm({ ...form, crop: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={translate('admin.minLand')}
              type="number"
              value={form.min_land}
              onChange={(e) => setForm({ ...form, min_land: e.target.value })}
            />
            <Input
              label={translate('admin.maxLand')}
              type="number"
              value={form.max_land}
              onChange={(e) => setForm({ ...form, max_land: e.target.value })}
            />
          </div>
          <Input
            label={translate('admin.equipmentType')}
            value={form.equipmentType}
            onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}
            placeholder={translate('admin.equipmentTypePlaceholder')}
          />
          <Textarea
            label={translate('admin.description')}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {translate('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? translate('admin.saveChanges') : translate('admin.addScheme')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={translate('admin.deleteSchemeTitle')}
        message={translate('admin.deleteSchemeMessage').replace('{name}', deleteTarget?.name || '')}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel={translate('common.delete')}
      />
    </div>
  );
}
