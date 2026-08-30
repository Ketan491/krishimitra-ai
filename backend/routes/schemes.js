const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const schemeService = require('../services/schemeService');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(schemeService.list());
  } catch (err) {
    next(err);
  }
});

router.get('/eligible', (req, res, next) => {
  try {
    res.json(schemeService.eligible(req.query.landSize));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.status(201).json(schemeService.create(req.body || {}, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(schemeService.update(req.params.id, req.body || {}, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(schemeService.remove(req.params.id, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
