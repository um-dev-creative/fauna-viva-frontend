'use strict';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
const { existsSync } = require('node:fs');

const {
  CORS_ORIGIN,
  TRUST_PROXY,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  CSRF_HEADER,
  TRACING_ENABLED,
  TRACE_SAMPLE_RATE,
} = require('./config/constants');
const { traceMiddleware } = require('./shared/trace');
const { requireCsrfHeader } = require('./shared/csrf');

/** @param {{distPath?: string}} [options] where the built Angular app lives (overridable for tests) */
function createApp({ distPath = path.join(__dirname, '../dist/fauna-viva-frontend/browser') } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Behind nginx the client IP is in X-Forwarded-For; without this every user shares nginx's IP in the rate limits
  app.set('trust proxy', TRUST_PROXY);
  app.use(compression());
  app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', CSRF_HEADER, 'If-Match', 'Idempotency-Key', 'X-Clinic-Id'],
    exposedHeaders: ['ETag', 'X-Total-Count', 'Link', 'Idempotent-Replayed', 'X-Trace-Id'],
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false }));

  app.use(traceMiddleware({ enabled: TRACING_ENABLED, sampleRate: TRACE_SAMPLE_RATE }));

  app.get('/health', (_req, res) => res.json({ status: 'UP' }));

  app.use('/api', requireCsrfHeader);
  // an unknown API path is a 404, not the SPA's index.html (which would answer 200 to a typo'd endpoint)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*splat', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    app.get('*splat', (_req, res) => res.status(503).send('Application not built. Run: pnpm build'));
  }

  return app;
}

module.exports = { createApp };
