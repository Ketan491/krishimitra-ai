const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const equipmentService = require('../services/equipmentService');
const { uploader } = require('../services/storage');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(equipmentService.listAll());
  } catch (err) {
    next(err);
  }
});

router.get('/farmer/:farmerId', (req, res, next) => {
  try {
    res.json(equipmentService.listForFarmer(req.params.farmerId));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('farmer'), uploader('equipment', 'photo'), (req, res, next) => {
  try {
    const eq = equipmentService.create(req.body, req.file, req.user);
    res.status(201).json(eq);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(equipmentService.update(req.params.id, req.body, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(equipmentService.remove(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
