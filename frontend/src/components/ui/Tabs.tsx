export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1 ${className}`} role="tablist">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={[
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-white text-crop-800 shadow-sm' : 'text-ink-600 hover:text-ink-900',
            ].join(' ')}
          >
            {item.icon ? <span aria-hidden>{item.icon}</span> : null}
            {item.label}
            {item.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-crop-100 text-crop-800' : 'bg-ink-200 text-ink-600'}`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, activeId, children }: { id: string; activeId: string; children: React.ReactNode }) {
  if (id !== activeId) return null;
  return <div className="mt-5">{children}</div>;
}
