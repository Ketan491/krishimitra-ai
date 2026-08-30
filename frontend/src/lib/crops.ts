export const CROP_NAME_KEYS: Record<string, string> = {
  'Rice (Paddy)': 'crops.rice',
  Rice: 'crops.rice',
  Wheat: 'crops.wheat',
  'Jowar (Sorghum)': 'crops.jowar',
  Jowar: 'crops.jowar',
  'Bajra (Pearl Millet)': 'crops.bajra',
  Bajra: 'crops.bajra',
  Maize: 'crops.maize',
  Tomato: 'crops.tomato',
  Onion: 'crops.onion',
  Sugarcane: 'crops.sugarcane',
  Cotton: 'crops.cotton',
  Grapes: 'crops.grapes',
  Grape: 'crops.grapes',
  'Pigeon Pea': 'crops.pigeonPea',
  'Pigeon Peas': 'crops.pigeonPea',
  'Tur (Pigeon Pea)': 'crops.pigeonPea',
  Tur: 'crops.pigeonPea',
  Peanut: 'crops.peanut',
  Groundnut: 'crops.peanut',
  Potato: 'crops.potato',
  Gram: 'crops.gram',
  Soybean: 'crops.soybean',
};

export function cropLocalizedKey(name: string): string | null {
  return CROP_NAME_KEYS[name] ?? null;
}