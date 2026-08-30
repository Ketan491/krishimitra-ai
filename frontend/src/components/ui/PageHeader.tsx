import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon ? <span className="text-2xl">{icon}</span> : null}
        <div>
          <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">{title}</h2>
          {subtitle ? <p className="text-sm text-ink-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
