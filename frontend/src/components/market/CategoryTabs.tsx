import { motion, useReducedMotion } from 'framer-motion';
import { useI18n } from '../../contexts/I18nContext';
import type { ProductCategory, ProductCategoriesResponse } from '../../lib/types';

const CATEGORY_ICON: Record<ProductCategory, string> = {
  crop: '🌾',
  vegetable: '🥬',
  fruit: '🍎',
};

const CATEGORY_LABEL_KEY: Record<ProductCategory, string> = {
  crop: 'market.categoryCrop',
  vegetable: 'market.categoryVegetable',
  fruit: 'market.categoryFruit',
};

const CATEGORY_ACTIVE_TINT: Record<ProductCategory, string> = {
  crop: 'border-amber-400 bg-amber-100 text-amber-900',
  vegetable: 'border-emerald-500 bg-emerald-100 text-emerald-900',
  fruit: 'border-rose-400 bg-rose-100 text-rose-900',
};

// Static strings so Tailwind can see every class at build time.
const CATEGORY_IDLE_TINT: Record<ProductCategory, string> = {
  crop: 'border-ink-200 bg-white text-ink-700 hover:border-amber-300 hover:bg-amber-50',
  vegetable: 'border-ink-200 bg-white text-ink-700 hover:border-emerald-300 hover:bg-emerald-50',
  fruit: 'border-ink-200 bg-white text-ink-700 hover:border-rose-300 hover:bg-rose-50',
};

export function CategoryTabs({
  value,
  onChange,
  data,
}: {
  /** Empty string = "All" (no category filter). */
  value: ProductCategory | '';
  onChange: (next: ProductCategory | '') => void;
  data?: ProductCategoriesResponse | null;
}) {
  const { translate } = useI18n();
  const reduced = useReducedMotion();

  const categories: ProductCategory[] = data?.categories?.length
    ? data.categories
    : (['crop', 'vegetable', 'fruit'] as ProductCategory[]);

  const allCount = data ? categories.reduce((sum, c) => sum + (data.counts[c] || 0), 0) : undefined;

  return (
    <div
      role="tablist"
      aria-label={translate('market.browseByCategory')}
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      <CategoryTab
        active={value === ''}
        onClick={() => onChange('')}
        icon="🧺"
        label={translate('market.categoryAll')}
        count={allCount}
        activeClass="border-ink-900 bg-ink-900 text-white"
        idleClass="border-ink-200 bg-white text-ink-700 hover:border-ink-400"
        reduced={!!reduced}
      />
      {categories.map((category) => (
        <CategoryTab
          key={category}
          active={value === category}
          onClick={() => onChange(category)}
          icon={CATEGORY_ICON[category]}
          label={translate(CATEGORY_LABEL_KEY[category])}
          count={data?.counts?.[category]}
          activeClass={CATEGORY_ACTIVE_TINT[category]}
          idleClass={CATEGORY_IDLE_TINT[category]}
          reduced={!!reduced}
        />
      ))}
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  icon,
  label,
  count,
  activeClass,
  idleClass,
  reduced,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
  activeClass: string;
  idleClass: string;
  reduced: boolean;
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className={[
        'flex shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-crop-500 focus-visible:ring-offset-1',
        active ? activeClass : idleClass,
      ].join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined ? (
        <span
          className={[
            'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
            active ? 'bg-white/25 text-current' : 'bg-ink-100 text-ink-600',
          ].join(' ')}
        >
          {count}
        </span>
      ) : null}
    </motion.button>
  );
}
