import type { ReactNode } from 'react';
import { EmptyState, Skeleton } from './StateComponents';
import { useI18n } from '../../contexts/I18nContext';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  skeletonRows?: number;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle,
  emptyMessage,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const { translate } = useI18n();
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm">
      <table className="w-full min-w-full divide-y divide-ink-200 text-sm">
        <thead>
          <tr className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-semibold ${col.headerClassName || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-crop-50/40 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyTitle ?? translate('ui.noRecords')} message={emptyMessage} />
        </div>
      ) : null}
    </div>
  );
}
