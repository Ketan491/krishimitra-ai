import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { formatDate, initials } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import type { AdminUser, Role } from '../../lib/types';

const ROLE_STYLE: Record<Role, 'green' | 'amber' | 'sky'> = {
  farmer: 'green',
  customer: 'amber',
  admin: 'sky',
};

export function AdminUsersPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [data, setData] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .adminUsers(role === '' ? undefined : (role as Role), search || undefined)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : translate('admin.loadUsersError')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [role]);

  const searchNow = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteUser(deleteTarget.role as Role, deleteTarget.id);
      successToast(translate('admin.userRemoved').replace('{name}', deleteTarget.name));
      setDeleteTarget(null);
      load();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.deleteUserError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title={translate('nav.users')} subtitle={translate('admin.usersSubtitle')} icon="👥" />

      <Card className="mb-5">
        <form onSubmit={searchNow} className="grid gap-3 sm:grid-cols-3">
          <Input placeholder={translate('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">{translate('admin.allRoles')}</option>
            <option value="farmer">{translate('roles.farmer')}</option>
            <option value="customer">{translate('roles.customer')}</option>
          </Select>
          <Button type="submit" variant="outline">
            {translate('common.search')}
          </Button>
        </form>
      </Card>

      <DataTable<AdminUser>
        loading={loading}
        rows={data || []}
        rowKey={(r) => `${r.role}-${r.id}`}
        emptyTitle={translate('admin.noUsers')}
        emptyMessage={translate('admin.tryDifferentFilter')}
        columns={[
          {
            key: 'user',
            header: translate('admin.user'),
            render: (r) => (
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-crop-800 bg-crop-100`}
                >
                  {initials(r.name)}
                </span>
                <div>
                  <p className="font-semibold text-ink-900">{r.name}</p>
                  <p className="text-xs text-ink-500">+91 {r.mobile}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: translate('admin.role'),
            render: (r) => <Badge variant={ROLE_STYLE[r.role]}>{translate(`roles.${r.role}`)}</Badge>,
          },
          { key: 'location', header: translate('common.location'), render: (r) => r.location || r.address || '—' },
          {
            key: 'farm',
            header: translate('admin.farm'),
            render: (r) => (r.role === 'farmer' && r.landSize ? `${r.landSize} ac · ${r.soilType || '—'}` : '—'),
          },
          {
            key: 'joined',
            header: translate('admin.joined'),
            render: (r) => (r.createdAt ? formatDate(r.createdAt) : '—'),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <Button variant="danger" size="sm" onClick={() => setDeleteTarget(r)} disabled={r.role === 'admin'}>
                {translate('admin.remove')}
              </Button>
            ),
          },
        ]}
      />

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={translate('admin.removeUserTitle')}
        message={translate('admin.removeUserMessage')
          .replace('{name}', deleteTarget?.name || '')
          .replace('{role}', deleteTarget ? translate(`roles.${deleteTarget.role}`) : '')}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel={translate('admin.removeUserConfirm')}
      />
    </div>
  );
}
