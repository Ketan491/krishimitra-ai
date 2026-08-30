const db = require('../db');
const { sanitizeText } = require('../utils/validators');
const { AppError } = require('../middleware/errors');

const WATER_LEVELS = ['Low', 'Medium', 'High'];

function search({ search = '', season = '', soilType = '', waterRequirement = '' } = {}) {
  let results = db.all('cropCatalog');

  const q = sanitizeText(search, 60).toLowerCase();
  if (q) {
    results = results.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        (c.nameMr || '').toLowerCase().includes(q) ||
        (c.scientificName || '').toLowerCase().includes(q) ||
        (c.soilType || '').toLowerCase().includes(q) ||
        (c.season || '').toLowerCase().includes(q),
    );
  }
  if (season) {
    const s = sanitizeText(season, 30).toLowerCase();
    results = results.filter((c) => (c.season || '').toLowerCase().includes(s));
  }
  if (soilType) {
    const s = sanitizeText(soilType, 30).toLowerCase();
    results = results.filter((c) => (c.soilType || '').toLowerCase().includes(s));
  }
  if (waterRequirement) {
    const w = sanitizeText(waterRequirement, 20).toLowerCase();
    results = results.filter((c) => (c.waterRequirement || '').toLowerCase() === w);
  }

  results = [...results].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  return { items: results, total: results.length };
}

function getById(id) {
  const crop = db.find('cropCatalog', (c) => c.id === Number(id));
  if (!crop) throw new AppError(404, 'Crop not found');
  return crop;
}

function assertAdmin(reqUser) {
  if (!reqUser || reqUser.role !== 'admin') {
    throw new AppError(403, 'Only admins can modify the crop database.');
  }
}

function createFromForm(body, file, reqUser, actorName) {
  assertAdmin(reqUser);
  const cleanNameEn = sanitizeText(body.nameEn, 100);
  const cleanWater = sanitizeText(body.waterRequirement, 20);

  if (cleanNameEn.length < 2) throw new AppError(400, 'Please enter a valid English crop name');
  if (!WATER_LEVELS.includes(cleanWater)) throw new AppError(400, 'Water requirement must be Low, Medium or High');
  if (sanitizeText(body.soilType, 60).length < 2) throw new AppError(400, 'Please enter a soil type');
  if (sanitizeText(body.season, 40).length < 2)
    throw new AppError(400, 'Please enter a season (Kharif/Rabi/Zaid/etc.)');

  const crop = db.insert('cropCatalog', {
    nameEn: cleanNameEn,
    nameMr: sanitizeText(body.nameMr, 100),
    scientificName: sanitizeText(body.scientificName, 100),
    soilType: sanitizeText(body.soilType, 60),
    season: sanitizeText(body.season, 40),
    sowingMonth: sanitizeText(body.sowingMonth, 60),
    harvestMonth: sanitizeText(body.harvestMonth, 60),
    waterRequirement: cleanWater,
    avgYield: sanitizeText(body.avgYield, 60),
    priceRange: sanitizeText(body.priceRange, 60),
    description: sanitizeText(body.description, 1000),
    commonDiseases: sanitizeText(body.commonDiseases, 300),
    recommendedFertilizer: sanitizeText(body.recommendedFertilizer, 300),
    imageUrl: file ? `/uploads/crops/${file.filename}` : body.imageUrl || '',
  });

  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'CROP_CREATE',
    detail: `Added crop "${crop.nameEn}" to database`,
    createdAt: new Date().toISOString(),
  });
  return crop;
}

function updateById(id, body, file, reqUser, actorName) {
  assertAdmin(reqUser);
  const existing = getById(id);
  const patch = {};

  const fields = [
    ['nameEn', 100],
    ['nameMr', 100],
    ['scientificName', 100],
    ['soilType', 60],
    ['season', 40],
    ['sowingMonth', 60],
    ['harvestMonth', 60],
    ['avgYield', 60],
    ['priceRange', 60],
    ['description', 1000],
    ['commonDiseases', 300],
    ['recommendedFertilizer', 300],
  ];
  for (const [key, max] of fields) {
    if (body[key] !== undefined) patch[key] = sanitizeText(body[key], max);
  }
  if (body.waterRequirement !== undefined) {
    const cleanWater = sanitizeText(body.waterRequirement, 20);
    if (!WATER_LEVELS.includes(cleanWater)) throw new AppError(400, 'Water requirement must be Low, Medium or High');
    patch.waterRequirement = cleanWater;
  }
  if (file) {
    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads')) {
      const { removeFile } = require('./storage');
      removeFile(existing.imageUrl);
    }
    patch.imageUrl = `/uploads/crops/${file.filename}`;
  }

  if (patch.nameEn !== undefined && patch.nameEn.length < 2)
    throw new AppError(400, 'Please enter a valid English crop name');

  const updated = db.update('cropCatalog', existing.id, patch);
  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'CROP_UPDATE',
    detail: `Edited crop "${updated.nameEn}"`,
    createdAt: new Date().toISOString(),
  });
  return updated;
}

function removeById(id, reqUser, actorName) {
  assertAdmin(reqUser);
  const existing = getById(id);
  if (existing.imageUrl && existing.imageUrl.startsWith('/uploads')) {
    const { removeFile } = require('./storage');
    removeFile(existing.imageUrl);
  }
  db.remove('cropCatalog', existing.id);
  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'CROP_DELETE',
    detail: `Removed crop "${existing.nameEn}" from database`,
    createdAt: new Date().toISOString(),
  });
  return { success: true };
}

module.exports = { search, getById, createFromForm, updateById, removeById, WATER_LEVELS };
