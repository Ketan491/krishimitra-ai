// Marketplace product categories.
//
// Every listing belongs to exactly one category so the marketplace can offer
// Crops / Vegetables / Fruits sections. Older listings were created before
// categories existed, so a crop-name heuristic backfills them (see inferCategory)
// instead of forcing a manual re-save by each farmer.

const PRODUCT_CATEGORIES = ['crop', 'vegetable', 'fruit'];

// Name fragments used to categorise legacy listings that have no stored category.
// Substring matching is intentional: listings are free text ("Tomato (Hybrid)").
const CATEGORY_KEYWORDS = {
  vegetable: [
    'onion',
    'tomato',
    'potato',
    'brinjal',
    'eggplant',
    'carrot',
    'cabbage',
    'cauliflower',
    'capsicum',
    'bell pepper',
    'chilli',
    'chili',
    'pepper',
    'cucumber',
    'radish',
    'beetroot',
    'turnip',
    'spinach',
    'okra',
    'ladyfinger',
    'bhindi',
    'pumpkin',
    'gourd',
    'bottle gourd',
    'ridge gourd',
    'bitter gourd',
    'ash gourd',
    'snake gourd',
    'lauki',
    'tinda',
    'parwal',
    'beans',
    'cluster beans',
    'green pea',
    'cowpea',
    'garlic',
    'ginger',
    'turmeric',
    'radish',
    'amaranth',
    'methi',
    'fenugreek',
    'spring onion',
    'celery',
    'lettuce',
    'cabbage',
    'mool',
    'radish',
    'sweet corn',
    'maize',
  ],
  fruit: [
    'grape',
    'banana',
    'mango',
    'apple',
    'orange',
    'sweet lime',
    'mosambi',
    'lemon',
    'guava',
    'papaya',
    'pineapple',
    'watermelon',
    'muskmelon',
    'pomegranate',
    'sapodilla',
    'chikoo',
    'ber',
    'jackfruit',
    'lychee',
    'litchi',
    'custard apple',
    'sitaphal',
    'peach',
    'pear',
    'plum',
    'apricot',
    'fig',
    'ananas',
    'amrood',
    'strawberry',
    'blueberry',
    'avocado',
    'coconut',
    'dragon fruit',
    'kiwi',
    'sapodilla',
    'mulberry',
    'jamun',
    'mangoes',
  ],
};

// Listing names that would be mis-detected by the generic vegetable/fruit lists.
const CATEGORY_OVERRIDES = {
  'tur (pigeon pea)': 'crop',
  pigeonpea: 'crop',
  'pigeon pea': 'crop',
  tur: 'crop',
  'green gram': 'crop',
  'black gram': 'crop',
  urad: 'crop',
  'chana': 'crop',
  'chickpea': 'crop',
  gram: 'crop',
  'arhar': 'crop',
  moong: 'crop',
};

function isValidCategory(value) {
  return typeof value === 'string' && PRODUCT_CATEGORIES.includes(value.trim().toLowerCase());
}

function normalizeCategory(value) {
  if (!isValidCategory(value)) return null;
  return value.trim().toLowerCase();
}

function keywordHit(haystack, keyword) {
  return haystack.includes(keyword);
}

/**
 * Best-effort category for a free-text crop/product name.
 * Defaults to 'crop' so nothing is ever un-categorised.
 */
function inferCategory(cropName) {
  const raw = typeof cropName === 'string' ? cropName.trim().toLowerCase() : '';
  if (!raw) return 'crop';

  for (const [name, forced] of Object.entries(CATEGORY_OVERRIDES)) {
    if (raw === name || raw.startsWith(`${name} `) || raw.startsWith(`${name}(`)) return forced;
  }

  for (const keyword of CATEGORY_KEYWORDS.vegetable) {
    if (keywordHit(raw, keyword)) return 'vegetable';
  }
  for (const keyword of CATEGORY_KEYWORDS.fruit) {
    if (keywordHit(raw, keyword)) return 'fruit';
  }
  return 'crop';
}

/**
 * Category for a stored product row: honour the stored value, otherwise infer it.
 * Keeping this in one place means the API, the seed and the migration agree.
 */
function resolveCategory(product) {
  if (!product) return 'crop';
  const stored = normalizeCategory(product.category);
  if (stored) return stored;
  return inferCategory(product.cropName);
}

module.exports = {
  PRODUCT_CATEGORIES,
  CATEGORY_KEYWORDS,
  CATEGORY_OVERRIDES,
  isValidCategory,
  normalizeCategory,
  inferCategory,
  resolveCategory,
};
