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
      nameHi: 'प्रधानमंत्री किसान सम्मान निधि',
      nameMr: 'पंतप्रधान किसान सन्मान निधी',
      min_land: 0,
      max_land: 5,
      crop: 'any',
      description: 'Income support of ₹6,000/year to small and marginal farmer families.',
      descriptionHi: 'छोटे और सीमांत किसान परिवारों को प्रति वर्ष ₹6,000 की आय सहायता।',
      descriptionMr: 'लहान व अल्पभूधारक शेतकरी कुटुंबांना दरवर्षी ₹6,000 चे उत्पन्न सहाय्य.',
      category: 'Income Support',
      icon: 'kisan',
    },
    {
      id: 2,
      name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      nameHi: 'प्रधानमंत्री फसल बीमा योजना (पीएमएफबीवाई)',
      nameMr: 'पंतप्रधान पीक विमा योजना (पीएमएफबीवाय)',
      min_land: 0,
      max_land: 1000,
      crop: 'any',
      description: 'Crop insurance scheme covering losses due to natural calamities, pests and diseases.',
      descriptionHi: 'प्राकृतिक आपदाओं, कीटों और बीमारियों से होने वाले नुकसान को कवर करने वाली फसल बीमा योजना।',
      descriptionMr: 'नैसर्गिक आपत्ती, कीड व रोगांमुळे होणाऱ्या नुकसानाचे संरक्षण देणारी पीक विमा योजना.',
      category: 'Insurance',
      icon: 'fasal',
    },
    {
      id: 3,
      name: 'Kisan Credit Card (KCC)',
      nameHi: 'किसान क्रेडिट कार्ड (केसीसी)',
      nameMr: 'किसान क्रेडिट कार्ड (केसीसी)',
      min_land: 0,
      max_land: 1000,
      crop: 'any',
      description: 'Short-term credit at subsidised interest rates for crop, equipment and post-harvest needs.',
      descriptionHi: 'फसल, उपकरण और कटाई-उपरांत आवश्यकताओं के लिए रियायती ब्याज दरों पर अल्पकालिक ऋण।',
      descriptionMr: 'पीक, अवजारे व काढणीनंतरच्या गरजांसाठी अनुदानित व्याजदराने अल्पमुदतीचे कर्ज.',
      category: 'Credit',
      icon: 'credit',
    },
    {
      id: 4,
      name: 'Soil Health Card Scheme',
      nameHi: 'मृदा स्वास्थ्य कार्ड योजना',
      nameMr: 'माती आरोग्य कार्ड योजना',
      min_land: 0,
      max_land: 1000,
      crop: 'any',
      description: 'Free soil testing every 2 years with fertiliser-use recommendations per field.',
      descriptionHi: 'हर 2 साल में मुफ्त मिट्टी परीक्षण और प्रत्येक खेत के लिए उर्वरक-उपयोग सिफारिशें।',
      descriptionMr: 'दर 2 वर्षांनी मोफत माती चाचणी व प्रत्येक शेतासाठी खत-वापर शिफारसी.',
      category: 'Advisory',
      icon: 'soil',
    },
    {
      id: 5,
      name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
      nameHi: 'कृषि यंत्रीकरण उप-मिशन (एसएमएएम)',
      nameMr: 'कृषी यांत्रिकीकरण उप-अभियान (एसएमएएम)',
      min_land: 0.5,
      max_land: 1000,
      crop: 'any',
      description: 'Subsidy (up to 50%) on purchase of tractors, tillers and other farm equipment.',
      descriptionHi: 'ट्रैक्टर, टिलर और अन्य कृषि उपकरणों की खरीद पर 50% तक सब्सिडी।',
      descriptionMr: 'ट्रॅक्टर, टिलर व इतर कृषी अवजारांच्या खरेदीवर 50% पर्यंत अनुदान.',
      category: 'Mechanization',
      equipmentType: 'tractor',
      icon: 'mechanization',
    },
    {
      id: 6,
      name: 'PM-KUSUM (Solar Pumps)',
      nameHi: 'पीएम-कुसुम (सौर पंप)',
      nameMr: 'पीएम-कुसुम (सौर पंप)',
      min_land: 0.5,
      max_land: 1000,
      crop: 'any',
      description: 'Subsidy for solar-powered irrigation pumps to cut diesel dependence.',
      descriptionHi: 'डीजल निर्भरता कम करने के लिए सौर ऊर्जा से चलने वाले सिंचाई पंपों पर सब्सिडी।',
      descriptionMr: 'डिझेलवरील अवलंबित्व कमी करण्यासाठी सौरऊर्जेवर चालणाऱ्या सिंचन पंपांवर अनुदान.',
      category: 'Energy',
      irrigationType: ['Drip', 'Sprinkler', 'Flood'],
      icon: 'solar',
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

// Migrate old Wikimedia crop images and backfill localized crop fields from the seed.
function healCrops(data) {
  const byName = new Map(CROP_CATALOG_SEED.map((c) => [c.nameEn, c]));
  for (const row of data.cropCatalog || []) {
    const seed = byName.get(row.nameEn);
    if (!seed) continue;
    if (typeof row.imageUrl === 'string' && row.imageUrl.includes('commons.wikimedia.org')) row.imageUrl = seed.imageUrl;
    for (const f of ['nameHi', 'descriptionHi', 'descriptionMr', 'priceRangeHi', 'priceRangeMr', 'avgYieldHi', 'avgYieldMr']) {
      if (row[f] === undefined || row[f] === '') row[f] = seed[f];
    }
  }
}

// Backfill localized scheme fields + icon from the seed defaults.
function healSchemes(data) {
  const byName = new Map(DEFAULT_DATA.schemes.map((s) => [s.name, s]));
  for (const row of data.schemes || []) {
    const seed = byName.get(row.name);
    if (!seed) continue;
    for (const f of ['nameHi', 'nameMr', 'descriptionHi', 'descriptionMr', 'icon']) {
      if (row[f] === undefined || row[f] === '') row[f] = seed[f];
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
    healCrops(data);
    healSchemes(data);
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
