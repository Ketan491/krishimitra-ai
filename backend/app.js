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
const paymentRoutes = require('./routes/payments');
const advisoryRoutes = require('./routes/advisory');
const adminRoutes = require('./routes/admin');
const cropCatalogRoutes = require('./routes/crops');
const schemeRoutes = require('./routes/schemes');

const app = express();

app.disable('x-powered-by');

// Render terminates TLS and forwards the request, so every incoming request
// carries X-Forwarded-For. Without this, Express ignores that header and
// req.ip resolves to Render's internal proxy address - which means all visitors
// on the live site share a single rate-limit bucket, so one abuser can lock
// everyone out of /api/auth.
//
// 1 means "trust the first hop only", which is correct for exactly one reverse
// proxy in front of us. `true` would let a client send its own
// X-Forwarded-For and bypass the limiters entirely, so it is deliberately not
// used.
app.set('trust proxy', 1);

// Razorpay Checkout cannot work under helmet's default policy: checkout.js is
// served from checkout.razorpay.com, the payment modal is an iframe on
// api.razorpay.com, and the script calls api.razorpay.com from the browser.
// With the defaults (script-src 'self', default-src 'self') the script is
// blocked outright, the browser fires its error event, and the customer sees
// "Could not load the payment window" with nothing left to debug. Only these
// three directives are widened - everything else stays on helmet's strict
// defaults, and no 'unsafe-inline' is added to script-src.
const RAZORPAY_SCRIPT_ORIGIN = 'https://checkout.razorpay.com';
const RAZORPAY_API_ORIGIN = 'https://api.razorpay.com';

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Razorpay's checkout runs in a popup/iframe flow that COOP and
    // origin-agent-cluster interfere with.
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    frameguard: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        scriptSrc: ["'self'", RAZORPAY_SCRIPT_ORIGIN],
        // The modal is a Razorpay-hosted iframe, so frame-src must allow it.
        frameSrc: ["'self'", RAZORPAY_API_ORIGIN, RAZORPAY_SCRIPT_ORIGIN],
        // checkout.js talks to the Razorpay API directly from the browser.
        connectSrc: ["'self'", RAZORPAY_API_ORIGIN],
        // Payment method logos (UPI, cards, net banking) come from Razorpay.
        imgSrc: ["'self'", 'data:', 'https://*.razorpay.com'],
        frameAncestors: null,
      },
    },
  }),
);
app.use(
  cors({
    // Allowlist, not `origin: true`. Reflecting arbitrary origins would let any
    // website read API responses from a visitor's browser.
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
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
app.use('/api/payments', paymentRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crops', cropCatalogRoutes);
app.use('/api/schemes', schemeRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  // If an old build's JS or CSS bundle is requested by a cached index.html,
  // redirect to the latest current asset so the browser never 404s on script loading.
  app.get('/assets/index-:hash.js', (req, res, next) => {
    const requestedFile = path.join(FRONTEND_DIST, 'assets', `index-${req.params.hash}.js`);
    if (fs.existsSync(requestedFile)) return next();
    const assetsDir = path.join(FRONTEND_DIST, 'assets');
    const currentJs = fs.readdirSync(assetsDir).find((f) => f.startsWith('index-') && f.endsWith('.js'));
    if (currentJs) {
      return res.redirect(`/assets/${currentJs}`);
    }
    next();
  });

  app.get('/assets/index-:hash.css', (req, res, next) => {
    const requestedFile = path.join(FRONTEND_DIST, 'assets', `index-${req.params.hash}.css`);
    if (fs.existsSync(requestedFile)) return next();
    const assetsDir = path.join(FRONTEND_DIST, 'assets');
    const currentCss = fs.readdirSync(assetsDir).find((f) => f.startsWith('index-') && f.endsWith('.css'));
    if (currentCss) {
      return res.redirect(`/assets/${currentCss}`);
    }
    next();
  });

  app.use(
    express.static(FRONTEND_DIST, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    if (req.path.includes('.')) return next();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use(notFound);

app.use(errorHandler);

module.exports = app;
