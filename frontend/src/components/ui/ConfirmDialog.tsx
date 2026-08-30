import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { useI18n } from '../../contexts/I18nContext';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [armed, setArmed] = useState(false);
  const { translate } = useI18n();
  const resolvedConfirm = confirmLabel ?? translate('common.confirm');
  const resolvedCancel = cancelLabel ?? translate('common.cancel');

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <div className="text-sm text-ink-700">{message}</div>
        {danger && !armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            {translate('ui.cannotUndo')}
          </button>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {resolvedCancel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={danger && !armed}
          >
            {loading ? <Spinner size="sm" light /> : resolvedConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
