import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import type { AuditEntry } from '../../lib/types';

export function AdminAuditPage() {
  const { translate } = useI18n();
  const { errorToast } = useToast();
  const { data, loading, error } = useAsync<AuditEntry[]>(() => api.adminAudit(), []);

  const handleExport = async () => {
    try {
      await api.adminExport();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('admin.exportError'));
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('nav.audit')}
        subtitle={translate('admin.auditSubtitle')}
        icon="📋"
        action={
          <Button variant="outline" size="sm" onClick={handleExport}>
            {translate('admin.exportBtn')}
          </Button>
        }
      />

      <DataTable<AuditEntry>
        loading={loading}
        rows={data || []}
        rowKey={(r) => `${r.createdAt}_${r.action}_${r.detail}`}
        emptyTitle={translate('admin.noAuditEntries')}
        emptyMessage={translate('admin.noAuditMessage')}
        columns={[
          {
            key: 'admin',
            header: translate('roles.admin'),
            render: (r) => <span className="font-semibold text-ink-900">{r.admin}</span>,
          },
          { key: 'action', header: translate('admin.action'), render: (r) => <Badge variant="blue">{r.action}</Badge> },
          {
            key: 'detail',
            header: translate('admin.detail'),
            render: (r) => <span className="text-sm text-ink-600">{r.detail}</span>,
          },
          { key: 'when', header: translate('admin.when'), render: (r) => formatDateTime(r.createdAt) },
        ]}
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
