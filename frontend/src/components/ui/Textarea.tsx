import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, rows = 4, className = '', id, ...rest },
  ref,
) {
  const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-ink-700">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={[
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 transition-shadow',
          error ? 'border-red-500 focus:ring-red-400' : 'border-ink-300 focus:border-crop-500 focus:ring-crop-500/30',
          rest.disabled ? 'bg-ink-100 text-ink-500' : '',
        ].join(' ')}
        {...rest}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
});
