import type { Language } from './i18n';

/**
 * Language-suffixed record fields for localized crop & scheme data.
 * Returns the best available localized value, falling back to the English
 * field so admin-created records (which only carry English data) render safely.
 */
export function localizedField<T extends object>(
  record: T,
  base: string,
  lang: Language,
): string {
  if (lang === 'en') return (record as Record<string, unknown>)[base] as string || '';
  const key = `${base}${lang === 'hi' ? 'Hi' : 'Mr'}`;
  const localized = (record as Record<string, unknown>)[key];
  const english = (record as Record<string, unknown>)[base];
  return (typeof localized === 'string' && localized.length > 0 ? localized : english) as string;
}

const SEASON_TOKENS: [string, string][] = [
  ['Kharif', 'Kharif'],
  ['Rabi', 'Rabi'],
  ['Zaid', 'Zaid'],
  ['Annual', 'Annual'],
  ['Perennial', 'Perennial'],
];

const SOIL_TOKENS: [string, string][] = [
  ['Alluvial', 'Alluvial'],
  ['Black', 'Black'],
  ['Red', 'Red'],
  ['Laterite', 'Laterite'],
  ['Sandy', 'Sandy'],
  ['Clay', 'Clay'],
  ['Loamy', 'Loamy'],
];

/**
 * Localize a comma-separated token string (e.g. soilType "black, loamy" or
 * season "Kharif, Rabi") by mapping each recognized token to its label key.
 * The caller passes a token -> i18n key map; unknown tokens pass through.
 */
export function localizeTokens(
  value: string | undefined,
  tokenMap: Record<string, string>,
  translate: (key: string) => string,
): string {
  if (!value) return '';
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (tokenMap[t] ? translate(tokenMap[t]) : t))
    .join(', ');
}

export const SEASON_TOKEN_KEYS: Record<string, string> = {
  Kharif: 'cropsDb.seasonKharif',
  Rabi: 'cropsDb.seasonRabi',
  Zaid: 'cropsDb.seasonZaid',
  Annual: 'cropsDb.seasonAnnual',
  Perennial: 'cropsDb.seasonPerennial',
};

export const SOIL_TOKEN_KEYS: Record<string, string> = {
  Alluvial: 'cropsDb.soilAlluvial',
  Black: 'cropsDb.soilBlack',
  Red: 'cropsDb.soilRed',
  Laterite: 'cropsDb.soilLaterite',
  Sandy: 'cropsDb.soilSandy',
  Clay: 'cropsDb.soilClay',
  Loamy: 'cropsDb.soilLoamy',
};

/** Water requirement is a single Low/Medium/High token. */
export const WATER_LABEL_KEYS: Record<string, string> = {
  Low: 'cropsDb.waterLow',
  Medium: 'cropsDb.waterMedium',
  High: 'cropsDb.waterHigh',
};

export function localizeWater(value: string | undefined, translate: (key: string) => string): string {
  if (!value) return '';
  const clean = value.replace(/_/g, ' ');
  return WATER_LABEL_KEYS[clean] ? translate(WATER_LABEL_KEYS[clean]) : clean;
}

export { SEASON_TOKENS, SOIL_TOKENS };
