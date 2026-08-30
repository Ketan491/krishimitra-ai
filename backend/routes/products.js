const express = require('express');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const productService = require('../services/productService');
const statsService = require('../services/statsService');
const { uploader } = require('../services/storage');
const { AppError } = require('../middleware/errors');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(productService.publicList(req.query));
  } catch (err) {
    next(err);
  }
});

router.get('/market-prices/summary', (req, res) => {
  res.json(statsService.priceSummary());
});

router.get('/market-prices/trend/:cropName', (req, res, next) => {
  try {
    res.json(productService.priceTrend(req.params.cropName));
  } catch (err) {
    next(err);
  }
});

router.get('/deals', (req, res, next) => {
  try {
    res.json(productService.getDeals(req.query.limit));
  } catch (err) {
    next(err);
  }
});

router.get('/farmer/:farmerId', optionalAuth, (req, res, next) => {
  try {
    const isOwner =
      req.user &&
      (req.user.role === 'admin' ||
        (req.user.role === 'farmer' && Number(req.user.id) === Number(req.params.farmerId)));
    res.json(productService.listForFarmer(req.params.farmerId, isOwner));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, (req, res, next) => {
  try {
    res.json(productService.getById(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('farmer'), uploader('products', 'photo'), (req, res, next) => {
  try {
    const product = productService.createFromForm(req.body, req.file, req.user);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('farmer', 'admin'), uploader('products', 'photo'), (req, res, next) => {
  try {
    res.json(productService.updateById(req.params.id, req.body, req.file, req.user));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('farmer', 'admin'), (req, res, next) => {
  try {
    res.json(productService.removeById(req.params.id, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
