const db = require('../db');
const { AppError } = require('../middleware/errors');
const { sanitizeText, isNonNegativeNumber } = require('../utils/validators');

function assertAdmin(reqUser) {
  if (!reqUser || reqUser.role !== 'admin') throw new AppError(403, 'Only admins can manage government schemes.');
}

function list() {
  return db.all('schemes');
}

function eligible(landSize) {
  if (landSize === undefined || !isNonNegativeNumber(landSize)) {
    throw new AppError(400, 'landSize must be a positive number');
  }
  const size = Number(landSize);
  return db.all('schemes').filter((s) => size >= s.min_land && size <= s.max_land);
}

function create(body, reqUser, actorName) {
  assertAdmin(reqUser);
  const cleanName = sanitizeText(body.name, 150);
  const cleanDesc = sanitizeText(body.description, 1000);

  if (cleanName.length < 3) throw new AppError(400, 'Scheme name must be at least 3 characters');
  if (cleanDesc.length < 10) throw new AppError(400, 'Please add a short description (10+ characters)');
  if (!isNonNegativeNumber(body.min_land ?? 0)) throw new AppError(400, 'min_land must be a positive number');
  if (!isNonNegativeNumber(body.max_land ?? 1000)) throw new AppError(400, 'max_land must be a positive number');

  const scheme = db.insert('schemes', {
    name: cleanName,
    min_land: Number(body.min_land) || 0,
    max_land: Number(body.max_land) || 1000,
    crop: sanitizeText(body.crop, 50) || 'any',
    description: cleanDesc,
    category: sanitizeText(body.category, 40) || 'General',
  });

  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'SCHEME_CREATE',
    detail: `Added scheme "${scheme.name}"`,
    createdAt: new Date().toISOString(),
  });
  return scheme;
}

function update(id, body, reqUser, actorName) {
  assertAdmin(reqUser);
  const patch = {};
  if (body.name !== undefined) patch.name = sanitizeText(body.name, 150);
  if (body.description !== undefined) patch.description = sanitizeText(body.description, 1000);
  if (body.crop !== undefined) patch.crop = sanitizeText(body.crop, 50);
  if (body.category !== undefined) patch.category = sanitizeText(body.category, 40);
  if (body.min_land !== undefined) {
    if (!isNonNegativeNumber(body.min_land)) throw new AppError(400, 'min_land must be a positive number');
    patch.min_land = Number(body.min_land);
  }
  if (body.max_land !== undefined) {
    if (!isNonNegativeNumber(body.max_land)) throw new AppError(400, 'max_land must be a positive number');
    patch.max_land = Number(body.max_land);
  }

  const updated = db.update('schemes', Number(id), patch);
  if (!updated) throw new AppError(404, 'Scheme not found');

  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'SCHEME_UPDATE',
    detail: `Edited scheme "${updated.name}"`,
    createdAt: new Date().toISOString(),
  });
  return updated;
}

function remove(id, reqUser, actorName) {
  assertAdmin(reqUser);
  const scheme = db.find('schemes', (s) => s.id === Number(id));
  if (!scheme) throw new AppError(404, 'Scheme not found');
  db.remove('schemes', scheme.id);
  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'SCHEME_DELETE',
    detail: `Removed scheme "${scheme.name}"`,
    createdAt: new Date().toISOString(),
  });
  return { success: true };
}

module.exports = { list, eligible, create, update, remove };
