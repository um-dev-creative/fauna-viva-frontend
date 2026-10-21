'use strict';

const axios = require('axios');
const logger = require('../config/logger');
const { FAUNA_VIVA_API_URL, SESSION_COOKIE, REFRESH_COOKIE } = require('../config/constants');
const backbone = require('./backbone');
const { setSessionCookies, clearSessionCookies } = require('./session');
const { toTraceparent } = require('./trace');

// fauna-viva-rest authenticates like the rest of the UMDC services (security-oauth's SessionJwtInterceptor): the Backbone
// session JWT travels as-is in the `session-token` header, not as `Authorization: Bearer`.
const SESSION_TOKEN_HEADER = 'session-token';

// What the API answers in headers and the browser needs: the totals and links of a listing, the version of a resource
// (`If-Match` carries the one a client read, so a stale update is refused with 412), a download's name, and whether a POST
// with an `Idempotency-Key` was answered from the stored response.
const PASSED_BACK_HEADERS = ['etag', 'x-total-count', 'link', 'content-disposition', 'idempotent-replayed'];

// What a public route hands back besides the body (the API's 429 says when to retry).
const PUBLIC_PASSED_BACK_HEADERS = ['retry-after'];

const forward = (req, url, token) =>
  axios({
    method: req.method,
    url,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [SESSION_TOKEN_HEADER]: token,
      ...(req.get('x-clinic-id') ? { 'X-Clinic-Id': req.get('x-clinic-id') } : {}),
      ...(req.get('if-match') ? { 'If-Match': req.get('if-match') } : {}),
      ...(req.get('idempotency-key') ? { 'Idempotency-Key': req.get('idempotency-key') } : {}),
      // the API continues the trace the BFF is in (nothing is sent when tracing is off)
      ...(req.trace ? { traceparent: toTraceparent(req.trace) } : {}),
    },
    params: req.query,
    // a repeated parameter (`sort=a&sort=b`) must stay `sort=a&sort=b`: axios' default `sort[]=a` is not bound by Spring
    paramsSerializer: { indexes: null },
    data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
    validateStatus: () => true,
  });

/** Sends the API's answer to the browser: the status, the headers in `passed`, and the JSON body when there is one. */
function relay(response, res, passed) {
  for (const name of passed) {
    if (response.headers?.[name]) res.set(name, response.headers[name]);
  }
  if (response.status === 204 || response.data === '' || response.data === undefined) {
    res.status(response.status).end();
  } else if (/problem\+json/.test(response.headers?.['content-type'] ?? '')) {
    // RFC 9457 errors keep their media type, so the portal can tell them from any other JSON
    res.status(response.status).type('application/problem+json').send(JSON.stringify(response.data));
  } else {
    res.status(response.status).json(response.data);
  }
}

/**
 * Forward a request to fauna-viva-rest with the session token taken from the httpOnly cookie. When the API answers 401
 * the session is renewed once with the refresh token and the call is retried; if that fails the cookies are cleared and the
 * browser gets the 401. The clinic (`X-Clinic-Id`), `If-Match`, `Idempotency-Key` and the trace travel with the call.
 */
async function proxyToApi(req, res, backendPath) {
  const url = `${FAUNA_VIVA_API_URL}${backendPath}`;
  let token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    let response = await forward(req, url, token);

    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (response.status === 401 && refreshToken) {
      const renewed = await backbone.refresh(refreshToken);
      if (renewed.status === 200 && renewed.token) {
        token = renewed.token;
        setSessionCookies(res, renewed);
        response = await forward(req, url, token);
      } else {
        clearSessionCookies(res);
      }
    }

    if (response.status >= 500 && req.trace) {
      logger.warn(`API answered ${response.status} for ${req.method} ${backendPath} traceId=${req.trace.traceId}`);
    }
    relay(response, res, PASSED_BACK_HEADERS);
  } catch (err) {
    logger.error(`Proxy error → ${url}: ${err.code ? `[${err.code}] ` : ''}${err.message}${req.trace ? ` traceId=${req.trace.traceId}` : ''}`);
    res.status(502).json({ error: 'Backend unavailable', ...(req.trace ? { traceId: req.trace.traceId } : {}) });
  }
}

/**
 * Forward a request that carries no session (registration and e-mail verification, which the API itself leaves public).
 * Nothing from the cookies or from the browser's own headers is added. The visitor's address (`req.ip`, which honours
 * TRUST_PROXY) goes as the single `X-Forwarded-For` value, because the API limits attempts per source and would
 * otherwise see only the BFF.
 *
 * @param {{method: string, body: any, ip?: string, trace?: object}} req
 */
async function proxyPublicToApi(req, res, backendPath) {
  const url = `${FAUNA_VIVA_API_URL}${backendPath}`;
  try {
    const response = await axios({
      method: req.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(req.ip ? { 'X-Forwarded-For': req.ip } : {}),
        ...(req.trace ? { traceparent: toTraceparent(req.trace) } : {}),
      },
      data: req.body,
      validateStatus: () => true,
    });
    relay(response, res, PUBLIC_PASSED_BACK_HEADERS);
  } catch (err) {
    // err.code (e.g. DEPTH_ZERO_SELF_SIGNED_CERT) names a TLS trust failure explicitly
    logger.error(`Proxy error → ${url}: ${err.code ? `[${err.code}] ` : ''}${err.message}${req.trace ? ` traceId=${req.trace.traceId}` : ''}`);
    res.status(502).json({ error: 'Backend unavailable', ...(req.trace ? { traceId: req.trace.traceId } : {}) });
  }
}

module.exports = { proxyToApi, proxyPublicToApi, relay };
