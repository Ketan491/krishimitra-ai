import type { ReactNode } from 'react';
import { useI18n } from '../../contexts/I18nContext';

export type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple' | 'soil' | 'sky';

const STYLES: Record<BadgeVariant, string> = {
  green: 'bg-crop-100 text-crop-900 border-crop-200',
  amber: 'bg-harvest-100 text-harvest-600 border-harvest-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-sky-100 text-sky-600 border-sky-200',
  gray: 'bg-ink-100 text-ink-700 border-ink-200',
  purple: 'bg-violet-100 text-violet-700 border-violet-200',
  soil: 'bg-soil-100 text-soil-700 border-soil-200',
  sky: 'bg-sky-200 text-sky-700 border-sky-300',
};

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
}

export function Badge({ children, variant = 'gray', className = '', title }: BadgeProps) {
  return (
    <span
      title={title}
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { translate } = useI18n();
  const map: Record<string, BadgeVariant> = {
    Pending: 'amber',
    Confirmed: 'blue',
    Packed: 'purple',
    Shipped: 'blue',
    Delivered: 'green',
    Reviewed: 'green',
    Cancelled: 'red',
  };
  const variant = map[status] || 'gray';
  const variantLabel = status === 'Delivered' || status === 'Reviewed' ? translate('ui.deliveredCheck') : status;
  return <Badge variant={variant}>{variantLabel}</Badge>;
}

export function ApprovalBadge({ approved }: { approved: boolean | null }) {
  const { translate } = useI18n();
  if (approved === true) return <Badge variant="green">{translate('ui.approvalListed')}</Badge>;
  if (approved === false) return <Badge variant="red">{translate('ui.approvalRejected')}</Badge>;
  return <Badge variant="amber">{translate('ui.approvalPending')}</Badge>;
}
