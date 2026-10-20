'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { decodePayload, setSessionCookies, clearSessionCookies } = require('../shared/session');
const { proxyPublicToApi } = require('../shared/proxy');
const { SESSION_COOKIE, REFRESH_COOKIE, RATE_LIMIT_WINDOW_MS, LOGIN_RATE_LIMIT_MAX, REGISTRATION_RATE_LIMIT_MAX } = require('../config/constants');

const toUser = (payload) => ({
  id: payload.uid,
  username: payload.sub,
  firstname: payload.firstname,
  lastname: payload.lastname,
});

router.post(
  '/login',
  rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: LOGIN_RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false }),
  async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
      const result = await backbone.login(email, password);
      if (result.status === 200 && result.token) {
        setSessionCookies(res, result);
        return res.json({ authenticated: true, user: toUser(decodePayload(result.token) ?? {}) });
      }
      // 404 = no such user in the ZeroBound application: the caller is not told that apart from a wrong password
      if ([400, 401, 404, 406].includes(result.status)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (result.status === 429) {
        return res.status(429).json({ error: 'Too many attempts. Try again later' });
      }
      logger.error(`Login: unexpected backbone status ${result.status}`);
      return res.status(502).json({ error: 'Authentication service unavailable' });
    } catch (err) {
      logger.error(`Login error: ${err.message}`);
      return res.status(502).json({ error: 'Authentication service unavailable' });
    }
  }
);

// Public self-registration. Each route forwards only the fields REST documents, so an `applicationId`, `roleId` or
// `active` sent by the browser never travels; the API validates the values (its 400/409/422/429/503 reach the browser as they are).
const text = (v) => typeof v === 'string' && v.trim() !== '';
const optionalText = (v) => v === undefined || v === null || typeof v === 'string';
const pick = (source, names) => Object.fromEntries(names.filter((n) => source[n] !== undefined).map((n) => [n, source[n]]));
const registrationLimit = () => rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: REGISTRATION_RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false });
const bad = (res, error) => res.status(400).json({ error });

router.post('/register', registrationLimit(), (req, res) => {
  const body = req.body ?? {};
  const person = body.person;
  if (!['alias', 'email', 'password'].every((n) => text(body[n])) || !person || typeof person !== 'object' || Array.isArray(person)) {
    return bad(res, 'Alias, email, password and personal data are required');
  }
  if (![body.displayName, body.language, ...Object.values(pick(person, ['firstName', 'middleName', 'lastName', 'gender', 'birthdate']))].every(optionalText)) {
    return bad(res, 'Invalid data');
  }
  const forwarded = {
    ...pick(body, ['alias', 'displayName', 'email', 'password', 'language']),
    person: pick(person, ['firstName', 'middleName', 'lastName', 'gender', 'birthdate']),
  };
  return proxyPublicToApi({ method: 'POST', body: forwarded, ip: req.ip, trace: req.trace }, res, '/api/v1/auth/register');
});

router.post('/verify-email', registrationLimit(), (req, res) => {
  const { alias, code } = req.body ?? {};
  if (!text(alias) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return bad(res, 'Alias and a six-digit code are required');
  return proxyPublicToApi({ method: 'POST', body: { alias, code }, ip: req.ip, trace: req.trace }, res, '/api/v1/auth/verify-email');
});

router.post('/resend-verification', registrationLimit(), (req, res) => {
  const { alias, language } = req.body ?? {};
  if (!text(alias) || !optionalText(language)) return bad(res, 'Alias is required');
  return proxyPublicToApi({ method: 'POST', body: pick({ alias, language }, ['alias', 'language']), ip: req.ip, trace: req.trace }, res, '/api/v1/auth/resend-verification');
});

router.post('/logout', async (req, res) => {
  // revoke in backbone first (zerobound-rest reads its deny-list), then forget the cookies whatever backbone said
  await backbone.logout(req.cookies?.[SESSION_COOKIE], req.cookies?.[REFRESH_COOKIE]);
  clearSessionCookies(res);
  res.status(204).end();
});

router.get('/me', async (req, res) => {
  let token = req.cookies?.[SESSION_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  let payload = token ? decodePayload(token) : null;
  const expired = !payload?.exp || payload.exp * 1000 <= Date.now();

  if (expired && refreshToken) {
    try {
      const renewed = await backbone.refresh(refreshToken);
      if (renewed.status === 200 && renewed.token) {
        setSessionCookies(res, renewed);
        payload = decodePayload(renewed.token);
        token = renewed.token;
      } else {
        clearSessionCookies(res);
        payload = null;
      }
    } catch (err) {
      logger.error(`Session renew error: ${err.message}`);
      return res.status(502).json({ error: 'Authentication service unavailable' });
    }
  } else if (expired) {
    payload = null;
  }

  if (!token || !payload) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: toUser(payload) });
});

module.exports = router;
