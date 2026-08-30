import { useMemo } from 'react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const current = Math.min(page, pages);
  const range = useMemo(() => {
    const start = Math.max(1, current - 2);
    const end = Math.min(pages, current + 2);
    const arr: (number | '...')[] = [];
    if (start > 1) {
      arr.push(1);
      if (start > 2) arr.push('...');
    }
    for (let i = start; i <= end; i++) arr.push(i);
    if (end < pages) {
      if (end < pages - 1) arr.push('...');
      arr.push(pages);
    }
    return arr;
  }, [current, pages]);

  if (pages <= 1) return null;

  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Pagination">
      <p className="text-xs text-ink-500">
        Page {current} of {pages} · {total} items
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
          ‹ Prev
        </Button>
        <div className="flex items-center gap-1">
          {range.map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1 text-xs text-ink-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === current ? 'page' : undefined}
                className={[
                  'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                  p === current ? 'bg-crop-700 text-white' : 'text-ink-600 hover:bg-ink-100',
                ].join(' ')}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => onPageChange(current + 1)}>
          Next ›
        </Button>
      </div>
    </nav>
  );
}
