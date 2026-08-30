import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { useI18n } from '../../contexts/I18nContext';

export function PageLoader({ label }: { label?: string }) {
  const { translate } = useI18n();
  const resolved = label ?? translate('common.loading');
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
      <Spinner size="lg" />
      <p className="text-sm">{resolved}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-200/60 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-20 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { translate } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">⚠</div>
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          {translate('ui.tryAgain')}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-crop-50 text-2xl">🌾</div>
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {message ? <p className="max-w-sm text-xs text-ink-500">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}
