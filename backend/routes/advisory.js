const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errors');
const { validateBody } = require('../middleware/validate');
const { uploader } = require('../services/storage');
const schemeService = require('../services/schemeService');
const { recommendCrops, SOIL_TYPES, SEASONS } = require('../knowledge/cropData');
const { getForecast } = require('../knowledge/weather');
const chatbot = require('../knowledge/chatbot');
const yieldPredictor = require('../ml/yieldPredictor');
const diseaseData = require('../knowledge/diseaseData');
const { sanitizeText, isNonNegativeNumber, isPositiveNumber } = require('../utils/validators');

const router = express.Router();

router.get('/options', (req, res) => {
  res.json({ soilTypes: SOIL_TYPES, seasons: SEASONS, waterLevels: ['Low', 'Medium', 'High'] });
});

router.post(
  '/recommend',
  optionalAuth,
  validateBody([
    {
      field: 'soilType',
      test: (v) => SOIL_TYPES.includes(v),
      message: `soilType must be one of: ${SOIL_TYPES.join(', ')}`,
    },
    { field: 'season', test: (v) => SEASONS.includes(v), message: `season must be one of: ${SEASONS.join(', ')}` },
  ]),
  (req, res, next) => {
    try {
      const { soilType, season, farmerId, location } = req.body;
      const { exactMatch, results } = recommendCrops({ soilType, season });

      if (farmerId) {
        const ownerOk = req.user && req.user.role === 'farmer' && Number(req.user.id) === Number(farmerId);
        if (!ownerOk) {
          return next(new AppError(403, 'You can only save recommendations to your own farmer profile.'));
        }
        db.insert('recommendations', {
          farmerId: Number(farmerId),
          location: sanitizeText(location, 100),
          soilType,
          season,
          recommendedCrops: results.map((r) => r.crop).join(', '),
          createdAt: new Date().toISOString(),
        });
      }
      res.json({ soilType, season, exactMatch, recommendations: results });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/schemes', (req, res, next) => {
  try {
    if (req.query.landSize === undefined) return res.json(schemeService.list());
    res.json(schemeService.eligible(req.query.landSize));
  } catch (err) {
    next(err);
  }
});

router.get('/weather', (req, res) => {
  res.json(getForecast(sanitizeText(req.query.location, 60)));
});

router.post(
  '/chatbot',
  validateBody([
    {
      field: 'message',
      test: (v) => sanitizeText(v, 300).length > 0,
      message: 'message is required',
      sanitize: (v) => sanitizeText(v, 300),
    },
  ]),
  (req, res) => {
    res.json({ reply: chatbot.answer(req.body.message) });
  },
);

router.get('/yield-model-info', (req, res) => {
  res.json(yieldPredictor.modelInfo);
});

router.post(
  '/predict-yield',
  validateBody([
    {
      field: 'rainfall',
      test: (v) => v === undefined || isNonNegativeNumber(v),
      message: 'rainfall (mm) must be a positive number',
    },
    {
      field: 'fertilizer',
      test: (v) => v === undefined || isNonNegativeNumber(v),
      message: 'fertilizer (kg/acre) must be a positive number',
    },
    { field: 'landSize', test: isPositiveNumber, message: 'landSize (acres) must be a positive number' },
  ]),
  (req, res) => {
    const { rainfall = 0, fertilizer = 0, landSize } = req.body;
    const predictedYieldPerAcre = yieldPredictor.predictYield({ rainfall, fertilizer, landSize });
    const totalEstimatedYield = Math.round(predictedYieldPerAcre * Number(landSize) * 10) / 10;

    res.json({
      predictedYieldPerAcre,
      totalEstimatedYield,
      unit: yieldPredictor.modelInfo.unit,
      crop: 'General (Kharif mix)',
      modelInfo: yieldPredictor.modelInfo,
    });
  },
);

router.post('/diagnose', requireAuth, uploader('diagnoses', 'photo'), (req, res, next) => {
  try {
    const symptoms = sanitizeText(req.body.symptoms, 500);
    const cropName = sanitizeText(req.body.cropName, 60) || 'General';
    const result = diseaseData.diagnose({ cropName, symptoms });

    if (!result.exactMatch && !symptoms) {
      result.confidence = 'N/A';
    }

    const diagnosis = db.insert('diagnoses', {
      farmerId: Number(req.user.id),
      cropName,
      symptoms,
      photoUrl: req.file ? `/uploads/diagnoses/${req.file.filename}` : '',
      result: result.diagnosis,
      severity: result.severity,
      confidence: result.confidence,
      engine: result.engine,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ diagnosis, result });
  } catch (err) {
    next(err);
  }
});

router.get('/diagnoses', requireAuth, requireRole('farmer'), (req, res) => {
  res.json(
    db
      .filter('diagnoses', (d) => d.farmerId === Number(req.user.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  );
});

module.exports = router;
