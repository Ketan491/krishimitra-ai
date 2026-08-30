const fs = require('fs');
const path = require('path');
const config = require('./config');
const { CROP_CATALOG_SEED } = require('./knowledge/cropCatalogSeed');
const { buildDemoSeed } = require('./knowledge/demoSeed');

const DB_FILE = path.resolve(__dirname, config.dbFile.replace(/^\.\//, ''));
const DEMO = buildDemoSeed();

const DEFAULT_DATA = {
  farmers: [DEMO.farmer, DEMO.farmer2],
  customers: [DEMO.customer, DEMO.customer2],

  products: DEMO.products,
  crops: [],
  cropCatalog: CROP_CATALOG_SEED.map((c, i) => ({ id: i + 1, ...c })),
  orders: DEMO.orders,
  equipment: DEMO.equipment,
  recommendations: DEMO.recommendations,
  schemes: [
    {
      id: 1,
      name: 'PM-KISAN Samman Nidhi',
      min_land: 0,
      max_land: 5,
      crop: 'any',
      description: 'Income support of ₹6,000/year to small and marginal farmer families.',
      category: 'Income Support',
    },
    {
      id: 2,
      name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      min_land: 0,
      max_land: 1000,
      crop: 'any',
      description: 'Crop insurance scheme covering losses due to natural calamities, pests and diseases.',
      category: 'Insurance',
    },
    {
      id: 3,
      name: 'Kisan Credit Card (KCC)',
      min_land: 0,
      max_land: 1000,
      crop: 'any',
      description: 'Short-term credit at subsidised interest rates for crop, equipment and post-harvest needs.',
      category: 'Credit',
    },
    {
      id: 4,
      name: 'Soil Health Card Scheme',
      min_land: 0,
      max_land: 1000,
      crop: 'any',
      description: 'Free soil testing every 2 years with fertiliser-use recommendations per field.',
      category: 'Advisory',
    },
    {
      id: 5,
      name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
      min_land: 0.5,
      max_land: 1000,
      crop: 'any',
      description: 'Subsidy (up to 50%) on purchase of tractors, tillers and other farm equipment.',
      category: 'Mechanization',
      equipmentType: 'tractor',
    },
    {
      id: 6,
      name: 'PM-KUSUM (Solar Pumps)',
      min_land: 0.5,
      max_land: 1000,
      crop: 'any',
      description: 'Subsidy for solar-powered irrigation pumps to cut diesel dependence.',
      category: 'Energy',
      irrigationType: ['Drip', 'Sprinkler', 'Flood'],
    },
  ],
  reviews: DEMO.reviews,
  wishlist: DEMO.wishlist,
  diagnoses: [],
  auditLog: [],
};

const PRODUCT_PHOTO_MAP = {
  'Onions.jpg': '/products/onion.jpg',
  'Grapes.jpg': '/products/grapes.jpg',
  'Tomatoes.jpg': '/products/tomato.jpg',
  'Sugarcane_farm,_Bhuinj_02.jpg': '/products/sugarcane.jpg',
  'Cotton_plant.jpg': '/products/cotton.jpg',
  'A_field_of_wheat.JPG': '/products/wheat.jpg',
  'Maize.jpg': '/products/maize.jpg',
  'Pigeon_peas_in_threshing.jpg': '/products/pigeonpea.jpg',
  'Peanuts.jpg': '/products/peanut.jpg',
};

// Old seed rows referenced Wikimedia Commons files that no longer resolve; point them at bundled local images.
function healProductPhotos(data) {
  for (const table of ['products', 'orders']) {
    for (const row of data[table] || []) {
      if (typeof row.photoUrl !== 'string' || !row.photoUrl.includes('commons.wikimedia.org')) continue;
      const name = row.photoUrl.split('/').pop().replace(/\?.*$/, '');
      if (PRODUCT_PHOTO_MAP[name]) row.photoUrl = PRODUCT_PHOTO_MAP[name];
    }
  }
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    healProductPhotos(data);
    return data;
  } catch {
    const backup = `${DB_FILE}.corrupt-${Date.now()}`;
    try {
      fs.renameSync(DB_FILE, backup);
    } catch {}
    console.warn(`database file was corrupt; backed it up to ${path.basename(backup)} and reseeded defaults.`);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function save(data) {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function nextId(table) {
  const data = load();
  const rows = data[table] || [];
  let max = 0;
  for (const row of rows) {
    if (typeof row.id === 'number' && row.id > max) max = row.id;
  }
  return max + 1;
}

function insert(table, row) {
  const data = load();
  if (!data[table]) data[table] = [];
  row.id = nextId(table);
  data[table].push(row);
  save(data);
  return row;
}

function all(table) {
  return load()[table] || [];
}

function find(table, predicate) {
  return all(table).find(predicate);
}

function filter(table, predicate) {
  return all(table).filter(predicate);
}

function update(table, id, patch) {
  const data = load();
  const idx = (data[table] || []).findIndex((r) => r.id === id);
  if (idx === -1) return null;
  data[table][idx] = { ...data[table][idx], ...patch };
  save(data);
  return data[table][idx];
}

function remove(table, id) {
  const data = load();
  data[table] = (data[table] || []).filter((r) => r.id !== id);
  save(data);
}

module.exports = { DEFAULT_DATA, load, save, insert, all, find, filter, update, remove };
