export interface RatingStarsProps {
  value: number | null;
  size?: 'sm' | 'md' | 'lg';
  max?: number;
  showValue?: boolean;
}

export function RatingStars({ value, size = 'md', max = 5, showValue = false }: RatingStarsProps) {
  const dims = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }[size];
  const rounded = value == null ? 0 : Math.round(value * 2) / 2;
  if (rounded === 0) {
    return <span className="text-xs text-ink-400">No ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1;
        const fill = rounded >= idx ? 'full' : rounded >= idx - 0.5 ? 'half' : 'empty';
        return (
          <svg
            key={i}
            className={`${dims} ${fill === 'empty' ? 'text-ink-300' : 'text-harvest-500'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <defs>
              <linearGradient id={`half-${idx}-${size}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            {fill === 'half' ? (
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                fill={`url(#half-${idx}-${size})`}
              />
            ) : (
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            )}
          </svg>
        );
      })}
      {showValue && value != null ? <span className="text-xs font-medium text-ink-600">{value.toFixed(1)}</span> : null}
    </span>
  );
}
