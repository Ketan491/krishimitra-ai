const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, safeUser } = require('../middleware/auth');
const { AppError } = require('../middleware/errors');
const { uploader } = require('../services/storage');
const { sanitizeName, sanitizeText, isValidPassword } = require('../utils/validators');
const { hashPassword } = require('../services/authService');

const router = express.Router();

function ownCustomer(req, next, customerId) {
  const id = Number(customerId);
  if (req.user.role === 'admin' || (req.user.role === 'customer' && Number(req.user.id) === id)) return id;
  return next(new AppError(403, 'You can only manage your own profile.'));
}

router.get('/:id', (req, res, next) => {
  const customer = db.find('customers', (c) => c.id === Number(req.params.id));
  if (!customer) return next(new AppError(404, 'Customer not found'));
  res.json({
    id: customer.id,
    name: customer.name,
    avatarUrl: customer.avatarUrl || '',
    role: 'customer',
    address: customer.address || '',
    createdAt: customer.createdAt,
  });
});

router.put('/:id', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const patch = {};
    if (req.body.name !== undefined) {
      const cleanName = sanitizeName(req.body.name);
      if (cleanName.length < 2) return next(new AppError(400, 'Name must be at least 2 letters'));
      patch.name = cleanName;
    }
    if (req.body.address !== undefined) patch.address = sanitizeText(req.body.address, 255);
    if (req.body.location !== undefined) patch.location = sanitizeText(req.body.location, 100);
    if (req.body.password !== undefined) {
      if (!isValidPassword(req.body.password)) {
        return next(new AppError(400, 'Password must be between 4 and 72 characters.'));
      }
      patch.passwordHash = hashPassword(req.body.password);
    }

    const updated = db.update('customers', customerId, patch);
    if (!updated) return next(new AppError(404, 'Customer not found'));
    res.json(safeUser(updated));
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id/avatar',
  requireAuth,
  requireRole('customer', 'admin'),
  uploader('avatars', 'photo'),
  (req, res, next) => {
    try {
      const customerId = ownCustomer(req, next, req.params.id);
      if (!req.file) return next(new AppError(400, 'No image file uploaded'));
      const updated = db.update('customers', customerId, { avatarUrl: `/uploads/avatars/${req.file.filename}` });
      res.json(safeUser(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/addresses', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const customer = db.find('customers', (c) => c.id === customerId);
    res.json(customer?.addresses || []);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/addresses', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const customer = db.find('customers', (c) => c.id === customerId);
    if (!customer) return next(new AppError(404, 'Customer not found'));

    const fullAddress = sanitizeText(req.body.fullAddress, 255);
    if (fullAddress.length < 5) return next(new AppError(400, 'Please enter a valid full address'));

    const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
    const id = addresses.length ? Math.max(...addresses.map((a) => a.id)) + 1 : 1;
    const address = {
      id,
      label: sanitizeText(req.body.label, 30) || 'Home',
      fullAddress,
      pincode: sanitizeText(req.body.pincode, 10),
      phone: sanitizeText(req.body.phone, 15),
      isDefault: addresses.length === 0,
    };
    addresses.push(address);
    const updated = db.update('customers', customerId, { addresses });
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/addresses/:addressId', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const customer = db.find('customers', (c) => c.id === customerId);
    const addresses = (customer?.addresses || []).map((a) => {
      if (a.id !== Number(req.params.addressId)) return a;
      return {
        ...a,
        label: req.body.label !== undefined ? sanitizeText(req.body.label, 30) : a.label,
        fullAddress: req.body.fullAddress !== undefined ? sanitizeText(req.body.fullAddress, 255) : a.fullAddress,
        pincode: req.body.pincode !== undefined ? sanitizeText(req.body.pincode, 10) : a.pincode,
        phone: req.body.phone !== undefined ? sanitizeText(req.body.phone, 15) : a.phone,
        isDefault: req.body.isDefault !== undefined ? !!req.body.isDefault : a.isDefault,
      };
    });
    if (!addresses.some((a) => a.id === Number(req.params.addressId)))
      return next(new AppError(404, 'Address not found'));
    if (req.body.isDefault) {
      addresses.forEach((a) => (a.isDefault = a.id === Number(req.params.addressId)));
      const defaultAddress = addresses.find((a) => a.id === Number(req.params.addressId));
      if (defaultAddress && customer) db.update('customers', customerId, { address: defaultAddress.fullAddress });
    }
    const updated = db.update('customers', customerId, { addresses });
    res.json(addresses);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/addresses/:addressId', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const customer = db.find('customers', (c) => c.id === customerId);
    const addresses = (customer?.addresses || []).filter((a) => a.id !== Number(req.params.addressId));
    if (addresses.length === (customer?.addresses || []).length) return next(new AppError(404, 'Address not found'));
    const updated = db.update('customers', customerId, { addresses });
    res.json(updated.addresses);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/wishlist', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const items = db
      .filter('wishlist', (w) => w.customerId === customerId)
      .map((w) => {
        const product = db.find('products', (p) => p.id === w.productId);
        const reviews = db.filter('reviews', (r) => r.productId === w.productId);
        return {
          wishlistId: w.id,
          createdAt: w.createdAt,
          product: product
            ? {
                ...product,
                farmerName: db.find('farmers', (f) => f.id === product.farmerId)?.name || 'Unknown',
                avgRating: reviews.length
                  ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
                  : null,
                reviewCount: reviews.length,
              }
            : null,
        };
      })
      .filter((w) => w.product);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/wishlist', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const product = db.find('products', (p) => p.id === Number(req.body.productId));
    if (!product) return next(new AppError(404, 'Product not found'));
    if (db.find('wishlist', (w) => w.customerId === customerId && w.productId === product.id)) {
      return next(new AppError(409, 'Product is already in your wishlist'));
    }
    const entry = db.insert('wishlist', {
      customerId,
      productId: product.id,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/wishlist/:productId', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    const customerId = ownCustomer(req, next, req.params.id);
    const entry = db.find(
      'wishlist',
      (w) => w.customerId === customerId && w.productId === Number(req.params.productId),
    );
    if (!entry) return next(new AppError(404, 'Not in wishlist'));
    db.remove('wishlist', entry.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
