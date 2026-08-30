const db = require('../db');
const { AppError } = require('../middleware/errors');
const { sanitizeText, isValidMobile } = require('../utils/validators');

function strip(row) {
  const { passwordHash, ...safe } = row;
  return safe;
}

function listUsers({ role = '', search = '' } = {}) {
  const q = sanitizeText(search, 60).toLowerCase();
  const collect = (rows, r) =>
    rows
      .map((u) => ({ ...strip(u), role: r }))
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          (u.mobile || '').includes(q) ||
          (u.location || '').toLowerCase().includes(q) ||
          (u.address || '').toLowerCase().includes(q),
      );

  if (role === 'farmer') return collect(db.all('farmers'), 'farmer');
  if (role === 'customer') return collect(db.all('customers'), 'customer');
  return [...collect(db.all('farmers'), 'farmer'), ...collect(db.all('customers'), 'customer')];
}

function assertAdmin(reqUser) {
  if (!reqUser || reqUser.role !== 'admin') throw new AppError(403, 'Only admins can manage users.');
}

function updateUser(role, id, body, reqUser, actorName) {
  assertAdmin(reqUser);
  const table = role === 'farmer' ? 'farmers' : role === 'customer' ? 'customers' : null;
  if (!table) throw new AppError(400, 'role must be farmer or customer');

  const existing = db.find(table, (r) => r.id === Number(id));
  if (!existing) throw new AppError(404, 'User not found');

  const patch = {};
  if (body.name !== undefined) {
    const clean = sanitizeText(body.name, 100);
    if (clean.length < 2) throw new AppError(400, 'Name must be at least 2 characters');
    patch.name = clean;
  }
  if (body.mobile !== undefined) {
    if (!isValidMobile(body.mobile)) throw new AppError(400, 'Please enter a valid 10-digit Indian mobile number');
    patch.mobile = body.mobile.trim();
  }
  if (role === 'farmer') {
    if (body.location !== undefined) patch.location = sanitizeText(body.location, 100);
    if (body.soilType !== undefined) patch.soilType = sanitizeText(body.soilType, 30);
    if (body.landSize !== undefined) {
      const n = Number(body.landSize);
      if (Number.isNaN(n) || n < 0) throw new AppError(400, 'Invalid land size');
      patch.landSize = n;
    }
  }
  if (role === 'customer' && body.address !== undefined) patch.address = sanitizeText(body.address, 255);

  const updated = db.update(table, existing.id, patch);
  if (!updated) throw new AppError(404, 'User not found');

  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'USER_UPDATE',
    detail: `Updated ${role} account "${updated.name}" (#${updated.id})`,
    createdAt: new Date().toISOString(),
  });
  return strip(updated);
}

function removeUser(role, id, reqUser, actorName) {
  assertAdmin(reqUser);
  const table = role === 'farmer' ? 'farmers' : role === 'customer' ? 'customers' : null;
  if (!table) throw new AppError(400, 'role must be farmer or customer');
  const user = db.find(table, (r) => r.id === Number(id));
  if (!user) throw new AppError(404, 'User not found');

  if (role === 'farmer') {
    db.filter('products', (p) => p.farmerId === user.id).forEach((p) => db.remove('products', p.id));
    db.filter('equipment', (e) => e.farmerId === user.id).forEach((e) => db.remove('equipment', e.id));
    db.filter('orders', (o) => o.farmerId === user.id).forEach((o) => db.remove('orders', o.id));
    db.filter('crops', (c) => c.farmerId === user.id).forEach((c) => db.remove('crops', c.id));
  } else {
    db.filter('orders', (o) => o.customerId === user.id).forEach((o) => db.remove('orders', o.id));
    db.filter('reviews', (r) => r.customerId === user.id).forEach((r) => db.remove('reviews', r.id));
    db.filter('wishlist', (w) => w.customerId === user.id).forEach((w) => db.remove('wishlist', w.id));
  }

  db.remove(table, user.id);
  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: 'USER_DELETE',
    detail: `Deleted ${role} account "${user.name}" (#${user.id})`,
    createdAt: new Date().toISOString(),
  });
  return { success: true };
}

module.exports = { listUsers, updateUser, removeUser };
