const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const catalogService = require('../services/catalogService');
const { uploader } = require('../services/storage');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(catalogService.search(req.query));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    res.json(catalogService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('admin'), uploader('crops', 'photo'), (req, res, next) => {
  try {
    const crop = catalogService.createFromForm(req.body, req.file, req.user, req.user.username);
    res.status(201).json(crop);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), uploader('crops', 'photo'), (req, res, next) => {
  try {
    res.json(catalogService.updateById(req.params.id, req.body, req.file, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(catalogService.removeById(req.params.id, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
