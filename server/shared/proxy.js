'use strict';

const axios = require('axios');
const logger = require('../config/logger');
const { FAUNA_VIVA_API_URL } = require('../config/constants');
const { toTraceparent } = require('./trace');

// What a public route hands back besides the body (the API's 429 says when to retry).
const PUBLIC_PASSED_BACK_HEADERS = ['retry-after'];

/** Sends the API's answer to the browser: the status, the headers in `passed`, and the JSON body when there is one. */
function relay(response, res, passed) {
  for (const name of passed) {
    if (response.headers?.[name]) res.set(name, response.headers[name]);
  }
  if (response.status === 204 || response.data === '' || response.data === undefined) {
    res.status(response.status).end();
  } else {
    res.status(response.status).json(response.data);
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

module.exports = { proxyPublicToApi, relay };
