import type { Language } from './i18n';

export function formatINR(amount: number | string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatNumber(n: number | string): string {
  const num = Number(n);
  if (Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const seconds = Math.floor((Date.now() - d) / 1000);
  if (seconds < 45) return 'just now';
  const intervals: [number, string][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
    [2629746, 'month'],
    [31556952, 'year'],
  ];
  for (let i = intervals.length - 1; i >= 0; i--) {
    const [secondsPer, unit] = intervals[i];
    if (seconds >= secondsPer) {
      const count = Math.floor(seconds / secondsPer);
      return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function joinUnit(quantity: number, unit?: string): string {
  return `${formatNumber(quantity)} ${unit || 'kg'}`;
}

const RATE_TO_KG: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  '100g': 0.1,
  g: 0.001,
  gram: 0.001,
  quintal: 100,
  q: 100,
  '100kg': 100,
  tonne: 1000,
  ton: 1000,
  mt: 1000,
  metricton: 1000,
};

export function convertPriceRate(price: number | string, fromUnit?: string, toUnit?: string): number | null {
  const rate = Number(price);
  const from = (fromUnit || 'kg').trim().toLowerCase();
  const to = (toUnit || 'kg').trim().toLowerCase();
  const a = RATE_TO_KG[from];
  const b = RATE_TO_KG[to];
  if (Number.isNaN(rate) || !a || !b) return null;
  const converted = (rate * a) / b;
  return Math.round(converted * 100) / 100;
}

export function formatPriceRate(price: number | string, unit?: string): string {
  return `${formatINR(price)} / ${unit || 'kg'}`;
}

export interface OfferedProduct {
  price: number;
  compareToPrice?: number;
}

export function getDiscountPercent(p: OfferedProduct): number {
  const mrp = p.compareToPrice;
  if (typeof mrp !== 'number' || !(mrp > p.price)) return 0;
  return Math.min(95, Math.round(((mrp - p.price) / mrp) * 100));
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function weatherConditionIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sun')) return '☀️';
  if (c.includes('thunder')) return '⛈️';
  if (c.includes('rain')) return '🌧️';
  if (c.includes('cloud')) return '☁️';
  return '🌤️';
}

export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};
