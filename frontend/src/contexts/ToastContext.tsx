import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  errorToast: (message: string) => void;
  successToast: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeouts.current.get(id);
    if (t) {
      clearTimeout(t);
      timeouts.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      const t = setTimeout(() => dismiss(id), 3800);
      timeouts.current.set(id, t);
    },
    [dismiss],
  );

  const errorToast = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const successToast = useCallback((message: string) => showToast(message, 'success'), [showToast]);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, showToast, errorToast, successToast, dismiss }),
    [toasts, showToast, errorToast, successToast, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function toastTypeStyles(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-crop-700 text-white';
    case 'error':
      return 'bg-red-700 text-white';
    case 'warning':
      return 'bg-harvest-500 text-ink-900';
    default:
      return 'bg-ink-800 text-white';
  }
}

export function toastTypeIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '!';
    default:
      return 'ℹ';
  }
}
