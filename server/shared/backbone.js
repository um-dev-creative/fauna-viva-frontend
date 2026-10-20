'use strict';

const https = require('node:https');
const axios = require('axios');
const logger = require('../config/logger');
const {
  BACKBONE_BASE_URL,
  BACKBONE_APPLICATION_ID,
  BACKBONE_CLIENT_ID,
  BACKBONE_CLIENT_SECRET,
  BACKBONE_CLIENT_SCOPES,
  BACKBONE_TLS_INSECURE,
} = require('../config/constants');

const httpsAgent = BACKBONE_TLS_INSECURE ? new https.Agent({ rejectUnauthorized: false }) : undefined;

// Renewed a minute before it expires, so a token is never sent in its last seconds.
const CLIENT_TOKEN_MARGIN_MS = 60_000;
// What backbone's ManagedClientTokenFilter answers (401) when the M2M bearer itself is not accepted.
const CLIENT_TOKEN_REJECTED = ['invalid_token', 'token_processing_error'];

const post = (path, data, headers = {}) =>
  axios.post(`${BACKBONE_BASE_URL}${path}`, data, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    validateStatus: () => true,
    ...(httpsAgent ? { httpsAgent } : {}),
  });

/** Thrown when backbone does not accept this front end's application client: a configuration error, never the user's. */
class ApplicationClientError extends Error {}

let clientToken = null;      // { value, expiresAt }
let clientTokenRequest = null; // the request in flight, shared by concurrent logins

async function requestClientToken() {
  const r = await post('/api/v1/managed-clients/token', {
    clientId: BACKBONE_CLIENT_ID,
    clientSecret: BACKBONE_CLIENT_SECRET,
    scopes: BACKBONE_CLIENT_SCOPES,
  });
  if (r.status !== 200 || !r.data?.accessToken) {
    const reason = [r.status, r.data?.error].filter(Boolean).join(' ');
    throw new ApplicationClientError(
      `backbone refused the application client (${reason}): check BACKBONE_CLIENT_ID / BACKBONE_CLIENT_SECRET / BACKBONE_CLIENT_SCOPES`
    );
  }
  const lifetimeMs = (Number(r.data.expiresIn) || 0) * 1000;
  clientToken = { value: r.data.accessToken, expiresAt: Date.now() + lifetimeMs - CLIENT_TOKEN_MARGIN_MS };
  return clientToken.value;
}

/** The M2M access token of this front end, or null when no application client is configured (local development). */
async function applicationClientToken() {
  if (!BACKBONE_CLIENT_ID) return null;
  if (clientToken && Date.now() < clientToken.expiresAt) return clientToken.value;
  clientTokenRequest ??= requestClientToken().finally(() => {
    clientTokenRequest = null;
  });
  return clientTokenRequest;
}

/** A session call made on behalf of the Fauna Viva application: carries the application client as the Bearer. */
async function asApplication(path, data, headers = {}) {
  const send = async () => {
    const token = await applicationClientToken();
    return post(path, data, { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  };
  let r = await send();
  if (clientToken && r.status === 401 && CLIENT_TOKEN_REJECTED.includes(r.data?.error)) {
    // revoked or rotated on backbone's side before our copy expired: get a new one, once
    clientToken = null;
    r = await send();
  }
  if (r.status === 403 || (r.status === 401 && CLIENT_TOKEN_REJECTED.includes(r.data?.error))) {
    throw new ApplicationClientError(
      `backbone does not let this application client act for application ${BACKBONE_APPLICATION_ID} (${r.status}): the client must be active and registered for that application`
    );
  }
  return r;
}

/** @returns {Promise<{status:number, token?:string, refreshToken?:string}>} */
async function login(email, password) {
  const r = await asApplication('/api/v1/session/token', { email, password, applicationId: BACKBONE_APPLICATION_ID });
  return { status: r.status, token: r.data?.token, refreshToken: r.data?.refreshToken };
}

/** @returns {Promise<{status:number, token?:string, refreshToken?:string}>} */
async function refresh(refreshToken) {
  const r = await asApplication('/api/v1/session/refresh', { refreshToken });
  return { status: r.status, token: r.data?.token, refreshToken: r.data?.refreshToken || refreshToken };
}

/**
 * Ends the session in backbone-rest: both tokens go on its deny-list, which fauna-viva-rest consults on every call.
 * Never throws: the browser's cookies are cleared whatever happens here.
 *
 * @returns {Promise<boolean>} whether backbone confirmed the revocation
 */
async function logout(sessionToken, refreshToken) {
  if (!sessionToken) return false;
  try {
    const r = await post('/api/v1/session/logout', refreshToken ? { refreshToken } : {}, { 'session-token': sessionToken });
    if (r.status !== 204) logger.warn(`Logout: backbone answered ${r.status}; the session stays valid until it expires`);
    return r.status === 204;
  } catch (err) {
    logger.error(`Logout: backbone unreachable (${err.message}); the session stays valid until it expires`);
    return false;
  }
}

module.exports = { login, refresh, logout, ApplicationClientError };
