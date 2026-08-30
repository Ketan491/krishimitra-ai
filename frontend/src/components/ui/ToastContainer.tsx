import { toastTypeIcon, toastTypeStyles, useToast } from '../../contexts/ToastContext';
import type { ToastType } from '../../contexts/ToastContext';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 print:hidden">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${toastTypeStyles(t.type)}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
            {toastTypeIcon(t.type)}
          </span>
          <span className="flex-1 text-left">{t.message}</span>
          <span aria-hidden className="text-white/70">
            ✕
          </span>
        </button>
      ))}
    </div>
  );
}

export function toastIcon(type: ToastType): string {
  return toastTypeIcon(type);
}
