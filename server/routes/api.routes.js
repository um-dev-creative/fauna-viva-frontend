'use strict';

const router = require('express').Router();
const { proxyToApi } = require('../shared/proxy');

// A path segment of `..` (also percent-encoded, even a slash hidden as %2F) would let a caller climb out of /api/v1 once the URL is resolved
// (`/api/v1/../actuator`): it never reaches the API.
const climbs = (path) => {
  try {
    return decodeURIComponent(path).split(/[/\\]/).includes('..');
  } catch {
    return true; // a malformed escape is no valid path either
  }
};

/**
 * Every call under /api/v1 that no BFF route answers itself goes to fauna-viva-rest as it is, so a new module needs no
 * change here: the BFF owns the session, the CSRF check, the limits and the trace, the API owns the business rules and
 * its own authorization. A screen that combines modules gets a route of its own, mounted before this one.
 */
router.use((req, res) => {
  const path = `${req.baseUrl}${req.path}`;
  if (climbs(path)) return res.status(400).json({ error: 'Invalid path' });
  return proxyToApi(req, res, path);
});

module.exports = router;
