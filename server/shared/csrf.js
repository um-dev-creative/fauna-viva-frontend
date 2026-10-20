'use strict';

const { CSRF_HEADER } = require('../config/constants');

/**
 * State-changing requests must carry a custom header. A cross-site form/fetch cannot add it
 * without a CORS preflight, which the BFF only grants to CORS_ORIGIN.
 */
function requireCsrfHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.headers[CSRF_HEADER] === '1') return next();
  return res.status(403).json({ error: 'Missing CSRF header' });
}

module.exports = { requireCsrfHeader };
