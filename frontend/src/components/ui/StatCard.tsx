import { AnimatedCounter } from '../motion/AnimatedCounter';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  accent?: 'green' | 'soil' | 'harvest' | 'sky' | 'ink';
  sub?: string;
  loading?: boolean;
}

const ACCENTS: Record<string, { bg: string; icon: string }> = {
  green: { bg: 'bg-crop-50 text-crop-700', icon: 'bg-crop-100' },
  soil: { bg: 'bg-soil-50 text-soil-600', icon: 'bg-soil-100' },
  harvest: { bg: 'bg-harvest-50 text-harvest-500', icon: 'bg-harvest-100' },
  sky: { bg: 'bg-sky-50 text-sky-500', icon: 'bg-sky-100' },
  ink: { bg: 'bg-ink-100 text-ink-700', icon: 'bg-ink-200' },
};

export function StatCard({ label, value, icon = '📊', accent = 'green', sub, loading }: StatCardProps) {
  const a = ACCENTS[accent] || ACCENTS.green;
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${a.bg}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          {loading ? (
            <div className="mt-1 h-5 w-16 animate-pulse rounded bg-ink-200/70" />
          ) : (
            <div className="text-xl font-bold text-ink-900">
              {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
            </div>
          )}
          {sub ? <p className="text-xs text-ink-400">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}
