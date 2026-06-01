require('dotenv').config();
console.log('Starting app.js');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const { initFirebase } = require('./config/firebase');
const routes = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize Firebase
initFirebase();

const app = express();

// ======= Security Middleware =======
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://firebasestorage.googleapis.com'],
    },
  },
}));

// CORS
app.use(cors());

// Rate Limiting (Bypassed in development mode to prevent local test blockages)
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Auth rate limit (stricter)
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS Protection
app.use(xss());

// ======= Trust Proxy (for deployment) =======
app.set('trust proxy', 1);

// ======= Routes =======
app.use('/api', routes);

// ======= 404 & Error Handlers =======
app.use(notFound);
app.use(errorHandler);

module.exports = app;
