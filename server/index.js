/**
 * PsyWebNote — Express Server
 *
 * Production-ready with:
 * - Helmet security headers
 * - CORS configuration
 * - Rate limiting (auth: 5/15min, API: 100/15min)
 * - Cookie parser (for refresh tokens)
 * - Request size limits
 * - Graceful error handling
 * - Graceful shutdown
 *
 * Usage:
 *   cd server
 *   npm install
 *   cp ../.env .env   (or create .env with required vars)
 *   npm start         (production)
 *   npm run dev        (development with auto-restart)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { router } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Security Headers ────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ────────────────────────────────────────────────────

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ───────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts
  message: { error: 'Слишком много попыток. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Превышен лимит запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body Parsing ────────────────────────────────────────────

app.use(express.json({ limit: '5mb' })); // 5MB for avatar uploads
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ── Request Logging (development) ───────────────────────────

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ── Routes ──────────────────────────────────────────────────

// Auth endpoints with stricter rate limiting
app.use('/api/auth', authLimiter);

// All API endpoints
app.use('/api', apiLimiter, router);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: NODE_ENV,
  });
});

// ── Serve Frontend (production) ─────────────────────────────

if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ── Error Handling ──────────────────────────────────────────

// 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Эндпоинт не найден' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't expose internal errors in production
  const message = NODE_ENV === 'production'
    ? 'Внутренняя ошибка сервера'
    : err.message || 'Внутренняя ошибка сервера';

  res.status(err.status || 500).json({ error: message });
});

// ── Start Server ────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`\n🧠 PsyWebNote API Server`);
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   Port:        ${PORT}`);
  console.log(`   URL:         http://localhost:${PORT}`);
  console.log(`   API:         http://localhost:${PORT}/api`);
  console.log(`   Health:      http://localhost:${PORT}/api/health`);
  if (NODE_ENV === 'production') {
    console.log(`   Frontend:    http://localhost:${PORT}`);
  }
  console.log('');
});

// ── Graceful Shutdown ───────────────────────────────────────

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    // Close database
    try {
      const { db } = require('./db');
      db.close();
      console.log('Database closed.');
    } catch (e) { /* ignore */ }
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
