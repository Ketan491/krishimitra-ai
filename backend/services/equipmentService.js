const db = require('../db');
const { AppError } = require('../middleware/errors');
const { sanitizeText, isPositiveNumber } = require('../utils/validators');

function withOwner(eq) {
  const farmer = db.find('farmers', (f) => f.id === eq.farmerId);
  return { ...eq, farmerName: farmer ? farmer.name : 'Unknown', farmerLocation: farmer ? farmer.location : '' };
}

function listAll() {
  return db
    .all('equipment')
    .map(withOwner)
    .sort((a, b) => b.id - a.id);
}

function listForFarmer(farmerId) {
  return db.filter('equipment', (e) => e.farmerId === Number(farmerId)).map(withOwner);
}

function create(body, file, reqUser) {
  if (!reqUser) throw new AppError(401, 'Authentication required.');
  if (reqUser.role !== 'farmer') throw new AppError(403, 'Only farmers can list equipment for rent.');
  const cleanType = sanitizeText(body.type, 40);
  if (cleanType.length < 2) throw new AppError(400, 'Please select/enter a valid equipment type');
  if (!isPositiveNumber(body.rentPerDay)) throw new AppError(400, 'Rent per day must be a positive number');

  return db.insert('equipment', {
    farmerId: Number(reqUser.id),
    type: cleanType,
    rentPerDay: Number(body.rentPerDay),
    availability: !(body.availability === 'false' || body.availability === false),
    photoUrl: file ? `/uploads/equipment/${file.filename}` : '',
    description: sanitizeText(body.description, 300),
    createdAt: new Date().toISOString(),
  });
}

function assertAdmin(reqUser) {
  if (!reqUser || reqUser.role !== 'admin')
    throw new AppError(403, 'Only admins can manage equipment on the platform.');
}

function update(id, body, reqUser, actorName) {
  assertAdmin(reqUser);
  const eq = db.find('equipment', (e) => e.id === Number(id));
  if (!eq) throw new AppError(404, 'Equipment not found');

  const patch = {};
  if (body.type !== undefined) patch.type = sanitizeText(body.type, 40);
  if (body.rentPerDay !== undefined) {
    if (!isPositiveNumber(body.rentPerDay)) throw new AppError(400, 'Rent per day must be a positive number');
    patch.rentPerDay = Number(body.rentPerDay);
  }
  if (body.availability !== undefined) patch.availability = body.availability === 'true' || body.availability === true;
  if (body.description !== undefined) patch.description = sanitizeText(body.description, 300);

  const updated = db.update('equipment', eq.id, patch);
  if (actorName) {
    db.insert('auditLog', {
      admin: actorName,
      action: 'EQUIPMENT_UPDATE',
      detail: `Updated equipment "${updated.type}"`,
      createdAt: new Date().toISOString(),
    });
  }
  return withOwner(updated);
}

function remove(id, reqUser) {
  assertAdmin(reqUser);
  const eq = db.find('equipment', (e) => e.id === Number(id));
  if (!eq) throw new AppError(404, 'Equipment not found');
  db.remove('equipment', eq.id);
  return { success: true };
}

module.exports = { listAll, listForFarmer, create, update, remove, withOwner };
