'use strict';

const bool = (v) => String(v).toLowerCase() === 'true';

/**
 * Express 'trust proxy': how many proxies in front of the BFF (`1` behind nginx) or which addresses
 * ("loopback, 172.16.0.0/12"). Off when empty, so a client cannot fake its IP with X-Forwarded-For.
 * `true` (trust every hop) is refused by settings-check: it would let anyone pick the IP the rate limit sees.
 */
const trustProxy = (v) => {
  const value = String(v ?? '').trim();
  if (value === '' || value.toLowerCase() === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value.toLowerCase() === 'true' ? true : value;
};

module.exports = {
  FAUNA_VIVA_API_URL: process.env['FAUNA_VIVA_API_URL'] || 'http://localhost:8130',
  BACKBONE_BASE_URL: process.env['BACKBONE_BASE_URL'] || 'http://localhost:8443',
  BACKBONE_APPLICATION_ID: process.env['BACKBONE_APPLICATION_ID'] || '',
  // The application client of this front end in backbone-rest (managed client, M2M): the BFF authenticates itself with
  // it and backbone only opens Fauna Viva sessions for it. The secret comes from the secret store, never from a file in git.
  BACKBONE_CLIENT_ID: process.env['BACKBONE_CLIENT_ID'] || '',
  BACKBONE_CLIENT_SECRET: process.env['BACKBONE_CLIENT_SECRET'] || '',
  BACKBONE_CLIENT_SCOPES: (process.env['BACKBONE_CLIENT_SCOPES'] || 'session:manage').split(',').map((s) => s.trim()).filter(Boolean),
  BACKBONE_TLS_INSECURE: bool(process.env['BACKBONE_TLS_INSECURE']),
  COOKIE_SECURE: bool(process.env['COOKIE_SECURE']),
  PORT: parseInt(process.env['PORT'] || '7006', 10),
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  CORS_ORIGIN: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
  TRUST_PROXY: trustProxy(process.env['TRUST_PROXY']),
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  // per client IP; a screen fires several calls, so this is generous (login has its own, stricter limit)
  RATE_LIMIT_MAX: parseInt(process.env['RATE_LIMIT_MAX'] || '1200', 10),
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env['LOGIN_RATE_LIMIT_MAX'] || '10', 10),
  // the public registration routes, per client IP and window (the API has its own, stricter, limits behind this one)
  REGISTRATION_RATE_LIMIT_MAX: parseInt(process.env['REGISTRATION_RATE_LIMIT_MAX'] || '20', 10),
  SSL_CERT_PATH: process.env['SSL_CERT_PATH'] || '',
  SSL_KEY_PATH: process.env['SSL_KEY_PATH'] || '',
  SESSION_COOKIE: 'fv_session',
  REFRESH_COOKIE: 'fv_refresh',
  CSRF_HEADER: 'x-fv-csrf',
  // W3C trace context towards fauna-viva-rest (off with TRACING_ENABLED=false); share of new traces marked as sampled
  TRACING_ENABLED: String(process.env['TRACING_ENABLED'] ?? 'true').toLowerCase() !== 'false',
  TRACE_SAMPLE_RATE: Math.min(1, Math.max(0, parseFloat(process.env['TRACE_SAMPLE_RATE'] || '0.1') || 0)),
};
