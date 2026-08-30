const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, safeUser } = require('../middleware/auth');
const { AppError } = require('../middleware/errors');
const { validateBody } = require('../middleware/validate');
const { uploader } = require('../services/storage');
const statsService = require('../services/statsService');
const { hashPassword } = require('../services/authService');
const { sanitizeName, sanitizeText, isNonNegativeNumber, isValidPassword } = require('../utils/validators');

const router = express.Router();

function ownFarmerOrAdmin(req, next, farmerId) {
  const id = Number(farmerId);
  if (req.user.role === 'admin' || (req.user.role === 'farmer' && Number(req.user.id) === id)) return id;
  return next(new AppError(403, 'You can only manage your own profile.'));
}

router.get('/:id', (req, res, next) => {
  const farmer = db.find('farmers', (f) => f.id === Number(req.params.id));
  if (!farmer) return next(new AppError(404, 'Farmer not found'));
  res.json({
    id: farmer.id,
    name: farmer.name,
    avatarUrl: farmer.avatarUrl || '',
    role: 'farmer',
    location: farmer.location || '',
    createdAt: farmer.createdAt,
  });
});

router.put(
  '/:id',
  requireAuth,
  requireRole('farmer', 'admin'),
  validateBody([
    {
      field: 'landSize',
      test: (v) => v === undefined || isNonNegativeNumber(v),
      message: 'Land size must be a positive number',
      optional: true,
    },
  ]),
  (req, res, next) => {
    try {
      const farmerId = ownFarmerOrAdmin(req, next, req.params.id);
      const patch = {};
      if (req.body.name !== undefined) {
        const cleanName = sanitizeName(req.body.name);
        if (cleanName.length < 2) return next(new AppError(400, 'Name must be at least 2 letters'));
        patch.name = cleanName;
      }
      if (req.body.location !== undefined) patch.location = sanitizeText(req.body.location, 100);
      if (req.body.soilType !== undefined) patch.soilType = sanitizeText(req.body.soilType, 30);
      if (req.body.landSize !== undefined) patch.landSize = Number(req.body.landSize);
      if (req.body.irrigationType !== undefined) patch.irrigationType = sanitizeText(req.body.irrigationType, 30);
      if (req.body.language !== undefined) patch.language = sanitizeText(req.body.language, 10);
      if (req.body.bio !== undefined) patch.bio = sanitizeText(req.body.bio, 300);
      if (req.body.preferredCrops !== undefined)
        patch.preferredCrops = Array.isArray(req.body.preferredCrops) ? req.body.preferredCrops.slice(0, 8) : [];
      if (req.body.password !== undefined) {
        if (!isValidPassword(req.body.password)) {
          return next(new AppError(400, 'Password must be between 4 and 72 characters.'));
        }
        patch.passwordHash = hashPassword(req.body.password);
      }

      const updated = db.update('farmers', farmerId, patch);
      if (!updated) return next(new AppError(404, 'Farmer not found'));
      res.json(safeUser(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id/avatar',
  requireAuth,
  requireRole('farmer', 'admin'),
  uploader('avatars', 'photo'),
  (req, res, next) => {
    try {
      const farmerId = ownFarmerOrAdmin(req, next, req.params.id);
      if (!req.file) return next(new AppError(400, 'No image file uploaded'));
      const updated = db.update('farmers', farmerId, { avatarUrl: `/uploads/avatars/${req.file.filename}` });
      res.json(safeUser(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/dashboard', requireAuth, requireRole('farmer', 'admin'), (req, res, next) => {
  try {
    const farmerId = ownFarmerOrAdmin(req, next, req.params.id);
    const farmer = db.find('farmers', (f) => f.id === farmerId);
    if (!farmer) return next(new AppError(404, 'Farmer not found'));
    res.json(statsService.farmerDashboard(farmer));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/crops', requireAuth, requireRole('farmer', 'admin'), (req, res, next) => {
  try {
    const farmerId = ownFarmerOrAdmin(req, next, req.params.id);
    res.json(db.filter('crops', (c) => c.farmerId === farmerId));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/crops',
  requireAuth,
  requireRole('farmer', 'admin'),
  validateBody([
    { field: 'cropName', test: (v) => sanitizeText(v, 60).length >= 2, message: 'Please enter a valid crop name' },
  ]),
  (req, res, next) => {
    try {
      const farmerId = ownFarmerOrAdmin(req, next, req.params.id);
      const crop = db.insert('crops', {
        farmerId,
        cropName: sanitizeText(req.body.cropName, 60),
        sowingDate: sanitizeText(req.body.sowingDate, 20) || null,
        harvestDate: sanitizeText(req.body.harvestDate, 20) || null,
        status: sanitizeText(req.body.status, 30) || 'Sown',
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(crop);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id/crops/:cropId', requireAuth, requireRole('farmer', 'admin'), (req, res, next) => {
  try {
    const farmerId = ownFarmerOrAdmin(req, next, req.params.id);
    const crop = db.find('crops', (c) => c.id === Number(req.params.cropId) && c.farmerId === farmerId);
    if (!crop) return next(new AppError(404, 'Crop not found'));
    db.remove('crops', crop.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
