const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errors');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmers');
const customerRoutes = require('./routes/customers');
const equipmentRoutes = require('./routes/equipment');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const advisoryRoutes = require('./routes/advisory');
const adminRoutes = require('./routes/admin');
const cropCatalogRoutes = require('./routes/crops');
const schemeRoutes = require('./routes/schemes');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', project: 'KrishiMitra AI', version: '3.0' }));

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crops', cropCatalogRoutes);
app.use('/api/schemes', schemeRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    if (req.path.includes('.')) return next();
    return res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use(notFound);

app.use(errorHandler);

module.exports = app;
