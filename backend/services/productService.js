const db = require('../db');
const { removeFile } = require('./storage');
const { AppError } = require('../middleware/errors');
const { isPositiveNumber, isNonNegativeNumber, sanitizeText } = require('../utils/validators');

const SORTS = {
  newest: (a, b) => b.id - a.id,
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  rating: (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.id - a.id,
  name: (a, b) => a.cropName.localeCompare(b.cropName) || b.id - a.id,
  deal: (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0) || a.price - b.price,
};

function ratingFor(productId) {
  const reviews = db.filter('reviews', (r) => r.productId === productId);
  return {
    avgRating: reviews.length ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)) : null,
    reviewCount: reviews.length,
  };
}

function discountPercent(p) {
  const mrp = p.compareToPrice;
  if (typeof mrp !== 'number' || !(mrp > p.price)) return 0;
  return Math.min(95, Math.round(((mrp - p.price) / mrp) * 100));
}

function withSeller(p) {
  const farmer = db.find('farmers', (f) => f.id === p.farmerId);
  const { farmerId, farmerName, farmerLocation, ...rest } = p;
  return {
    ...rest,
    farmerId,
    farmerName: farmerName || (farmer ? farmer.name : 'Unknown'),
    farmerLocation: farmerLocation || (farmer ? farmer.location : ''),
    discountPercent: discountPercent(p),
    ...ratingFor(p.id),
  };
}

function publicList({
  search = '',
  crop = '',
  organic,
  minPrice,
  maxPrice,
  sort = 'newest',
  page = 1,
  limit = 9,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));

  let items = db.all('products').filter((p) => p.approved === true);

  const q = sanitizeText(search, 60).toLowerCase();
  if (q)
    items = items.filter(
      (p) => p.cropName.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q),
    );

  const cropQ = sanitizeText(crop, 60).toLowerCase();
  if (cropQ) items = items.filter((p) => p.cropName.toLowerCase().includes(cropQ));

  if (organic === 'true' || organic === '1') items = items.filter((p) => p.organic === true);

  if (minPrice !== undefined && minPrice !== '') items = items.filter((p) => p.price >= Number(minPrice));
  if (maxPrice !== undefined && maxPrice !== '') items = items.filter((p) => p.price <= Number(maxPrice));

  const enriched = items.map(withSeller);
  enriched.sort(SORTS[sort] || SORTS.newest);

  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const pageItems = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return { items: pageItems, page: pageNum, limit: limitNum, total, totalPages, sort };
}

function getById(id, reqUser) {
  const product = db.find('products', (p) => p.id === Number(id));
  if (!product) throw new AppError(404, 'Product not found');

  const canSeeUnapproved =
    reqUser &&
    (reqUser.role === 'admin' || (reqUser.role === 'farmer' && Number(reqUser.id) === product.farmerId));
  if (product.approved !== true && !canSeeUnapproved) {
    throw new AppError(404, 'Product not found');
  }

  const farmer = db.find('farmers', (f) => f.id === product.farmerId);
  const reviews = db
    .filter('reviews', (r) => r.productId === product.id)
    .map((r) => {
      const cust = db.find('customers', (c) => c.id === r.customerId);
      return { ...r, customerName: cust ? cust.name : 'Customer' };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    ...product,
    farmerName: farmer?.name || 'Unknown',
    farmerLocation: farmer?.location || '',
    farmerAvatar: farmer?.avatarUrl || '',
    reviews,
    avgRating: reviews.length ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)) : null,
    reviewCount: reviews.length,
  };
}

function listForFarmer(farmerId, includeUnapproved = false) {
  const visible = (p) => p.farmerId === Number(farmerId) && (includeUnapproved || p.approved === true);
  return db
    .filter('products', visible)
    .map(withSeller)
    .sort((a, b) => b.id - a.id);
}

function listAll() {
  return db
    .all('products')
    .map(withSeller)
    .sort((a, b) => b.id - a.id);
}

function assertOwnership(product, reqUser) {
  if (!reqUser) throw new AppError(401, 'Authentication required.');
  if (reqUser.role === 'admin') return;
  if (reqUser.role !== 'farmer') throw new AppError(403, 'Only farmers can manage product listings.');
  if (Number(reqUser.id) !== product.farmerId) throw new AppError(403, 'You can only manage your own products.');
}

function parseCompareTo(value, sellingPrice) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!isPositiveNumber(value)) throw new AppError(400, 'MRP (comparison price) must be a positive number');
  const mrp = Number(value);
  if (mrp <= sellingPrice) throw new AppError(400, 'MRP must be higher than the selling price');
  return mrp;
}

function getDeals(limit = 6) {
  const count = Math.max(1, Math.min(50, parseInt(limit, 10) || 6));
  return db
    .all('products')
    .filter((p) => p.approved === true)
    .map(withSeller)
    .filter((p) => (p.discountPercent || 0) > 0)
    .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0) || a.price - b.price)
    .slice(0, count);
}

function createFromForm(body, file, reqUser) {
  const { cropName, price, quantity, unit, organic, harvestDate, location, description, compareToPrice } = body;
  if (!reqUser) throw new AppError(401, 'Authentication required.');
  if (reqUser.role !== 'farmer') throw new AppError(403, 'Only farmers can list products.');

  const cleanCropName = sanitizeText(cropName, 60);
  if (cleanCropName.length < 2) throw new AppError(400, 'Please enter a valid crop name');
  if (!isPositiveNumber(price)) throw new AppError(400, 'Price must be a positive number');
  if (!isPositiveNumber(quantity)) throw new AppError(400, 'Quantity must be a positive number');

  const sellingPrice = Number(price);
  const mrp = parseCompareTo(compareToPrice, sellingPrice);
  const photoUrl = file ? `/uploads/products/${file.filename}` : '';

  const record = {
    farmerId: Number(reqUser.id),
    cropName: cleanCropName,
    price: sellingPrice,
    quantity: Number(quantity),
    unit: sanitizeText(unit, 10) || 'kg',
    organic: organic === 'true' || organic === '1' || organic === true,
    harvestDate: sanitizeText(harvestDate, 20),
    location: sanitizeText(location, 100) || '',
    description: sanitizeText(description, 500),
    photoUrl,
    approved: null,
    createdAt: new Date().toISOString(),
  };
  if (mrp !== undefined) record.compareToPrice = mrp;
  return db.insert('products', record);
}

function updateById(id, body, file, reqUser) {
  const product = db.find('products', (p) => p.id === Number(id));
  if (!product) throw new AppError(404, 'Product not found');
  assertOwnership(product, reqUser);

  const patch = {};
  const { cropName, price, quantity, unit, organic, harvestDate, location, description, compareToPrice } = body;
  if (cropName !== undefined) {
    const clean = sanitizeText(cropName, 60);
    if (clean.length < 2) throw new AppError(400, 'Please enter a valid crop name');
    patch.cropName = clean;
  }
  if (price !== undefined) {
    if (!isPositiveNumber(price)) throw new AppError(400, 'Price must be a positive number');
    patch.price = Number(price);
  }
  if (quantity !== undefined) {
    if (!isPositiveNumber(quantity)) throw new AppError(400, 'Quantity must be a positive number');
    patch.quantity = Number(quantity);
  }
  if (unit !== undefined) patch.unit = sanitizeText(unit, 10) || 'kg';
  if (organic !== undefined) patch.organic = organic === 'true' || organic === '1' || organic === true;
  if (harvestDate !== undefined) patch.harvestDate = sanitizeText(harvestDate, 20);
  if (location !== undefined) patch.location = sanitizeText(location, 100);
  if (description !== undefined) patch.description = sanitizeText(description, 500);
  if (file) {
    if (product.photoUrl && product.photoUrl.startsWith('/uploads')) removeFile(product.photoUrl);
    patch.photoUrl = `/uploads/products/${file.filename}`;
  }
  if ('compareToPrice' in body) {
    const finalSellingPrice = patch.price !== undefined ? patch.price : product.price;
    const mrp = parseCompareTo(compareToPrice, finalSellingPrice);
    patch.compareToPrice = mrp;
  }

  const updated = db.update('products', product.id, patch);
  return withSeller(updated);
}

function setApproval(id, approved, reqUser, actorName) {
  if (!reqUser || reqUser.role !== 'admin') throw new AppError(403, 'Only admins can approve or reject products.');
  const product = db.find('products', (p) => p.id === Number(id));
  if (!product) throw new AppError(404, 'Product not found');

  const status = approved === true ? true : approved === false ? false : null;
  const updated = db.update('products', product.id, { approved: status });
  db.insert('auditLog', {
    admin: actorName || 'admin',
    action: approved === true ? 'PRODUCT_APPROVE' : approved === false ? 'PRODUCT_REJECT' : 'PRODUCT_UNLIST',
    detail: `Product #${id} (${product.cropName}) ${approved === true ? 'approved' : approved === false ? 'rejected' : 'unlisted'}`,
    createdAt: new Date().toISOString(),
  });
  return withSeller(updated);
}

function removeById(id, reqUser, actorName) {
  const product = db.find('products', (p) => p.id === Number(id));
  if (!product) throw new AppError(404, 'Product not found');

  if (!reqUser) throw new AppError(401, 'Authentication required.');
  if (reqUser.role !== 'admin' && (reqUser.role !== 'farmer' || Number(reqUser.id) !== product.farmerId)) {
    throw new AppError(403, 'You can only delete your own product listings.');
  }

  if (product.photoUrl && product.photoUrl.startsWith('/uploads')) removeFile(product.photoUrl);
  db.all('reviews').forEach((r) => r.productId === product.id && db.remove('reviews', r.id));
  db.all('wishlist').forEach((w) => w.productId === product.id && db.remove('wishlist', w.id));

  db.remove('products', product.id);

  if (reqUser.role === 'admin') {
    db.insert('auditLog', {
      admin: actorName || 'admin',
      action: 'PRODUCT_DELETE',
      detail: `Deleted product #${id} (${product.cropName})`,
      createdAt: new Date().toISOString(),
    });
  }
  return { success: true };
}

function seededRandom(s) {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

function modeUnit(products) {
  if (!products.length) return 'kg';
  const counts = {};
  products.forEach((p) => {
    const u = (p.unit || 'kg').toLowerCase();
    counts[u] = (counts[u] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || 'kg';
}

function priceTrend(cropName) {
  const clean = sanitizeText(cropName, 60);
  const matching = db
    .all('products')
    .filter((p) => p.approved === true && p.cropName.toLowerCase() === clean.toLowerCase());
  const basePrice = matching.length ? Math.round(matching.reduce((a, p) => a + p.price, 0) / matching.length) : 2000;
  const unit = modeUnit(matching);

  const seed = clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const DAYS = 14;
  const today = new Date();
  const trend = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const wobble = seededRandom(seed + i) - 0.5;
    const price = Math.max(1, Math.round(basePrice * (1 + wobble * 0.15)));
    trend.push({ date: d.toISOString().split('T')[0], price });
  }
  return { cropName: clean, basePrice, unit, trend };
}

module.exports = {
  publicList,
  getById,
  listForFarmer,
  listAll,
  getDeals,
  createFromForm,
  updateById,
  setApproval,
  removeById,
  withSeller,
  priceTrend,
};
