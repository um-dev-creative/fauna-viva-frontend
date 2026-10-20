'use strict';

/**
 * Stand-ins for backbone-rest and fauna-viva-rest, with behaviour a test can change on the fly through `state`.
 * `startBff` wires a BFF to them (the BFF reads its environment when it loads, so the URLs are set first).
 */
const http = require('node:http');
const express = require('express');
const { start } = require('./harness');

const jwt = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
const inFuture = (seconds) => Math.floor(Date.now() / 1000) + seconds;
const tokens = {
  GOOD: jwt({ uid: 'u-1', sub: 'luis', firstname: 'Luis', lastname: 'Mata', exp: inFuture(3600) }),
  EXPIRED: jwt({ uid: 'u-1', sub: 'luis', exp: inFuture(-60) }),
  RENEWED: jwt({ uid: 'u-1', sub: 'luis', firstname: 'Luis', lastname: 'Mata', exp: inFuture(7200) }),
  REFRESH: jwt({ exp: inFuture(86400) }),
};

const listen = (app) =>
  new Promise((resolve) => {
    const server = http.createServer(app).listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });

const initialState = () => ({
  clientTokenStatus: 200,
  clientTokenExpiresIn: 3600,
  clientTokenCalls: 0,
  clientTokenDelayMs: 0,
  rejectClientBearerOnce: false,
  loginStatus: 200,
  loginCalls: [],
  refreshStatus: 200,
  refreshCalls: [],
  logoutStatus: 204,
  logoutCalls: [],
  apiStatus: 201,
  apiCalls: [],
});

async function startBff({ env = {} } = {}) {
  const state = initialState();

  const b = express();
  b.use(express.json());
  b.post('/api/v1/managed-clients/token', async (req, res) => {
    state.clientTokenCalls++;
    if (state.clientTokenDelayMs) await new Promise((r) => setTimeout(r, state.clientTokenDelayMs));
    if (state.clientTokenStatus !== 200) return res.status(state.clientTokenStatus).json({ error: 'invalid_client' });
    res.json({ accessToken: `client-${state.clientTokenCalls}`, expiresIn: state.clientTokenExpiresIn, body: req.body });
  });
  b.post('/api/v1/session/token', (req, res) => {
    state.loginCalls.push({ body: req.body, authorization: req.headers.authorization });
    if (state.rejectClientBearerOnce) {
      state.rejectClientBearerOnce = false;
      return res.status(401).json({ error: 'invalid_token' });
    }
    if (state.loginStatus !== 200) return res.status(state.loginStatus).json({});
    res.json({ token: tokens.GOOD, refreshToken: tokens.REFRESH });
  });
  b.post('/api/v1/session/refresh', (req, res) => {
    state.refreshCalls.push(req.body);
    if (state.refreshStatus !== 200) return res.status(state.refreshStatus).json({});
    res.json({ token: tokens.RENEWED });
  });
  b.post('/api/v1/session/logout', (req, res) => {
    state.logoutCalls.push({ body: req.body, sessionToken: req.headers['session-token'] });
    res.status(state.logoutStatus).end();
  });
  const backbone = await listen(b);

  const a = express();
  a.use(express.json());
  a.use((req, res) => {
    state.apiCalls.push({ method: req.method, url: req.originalUrl, body: req.body, headers: req.headers });
    if (state.apiStatus === 204) return res.status(204).end();
    if (state.apiStatus === 429) res.set('Retry-After', '30');
    res.status(state.apiStatus).json({ ok: true });
  });
  const api = await listen(a);

  const bff = await start({
    env: {
      BACKBONE_BASE_URL: `http://127.0.0.1:${backbone.port}`,
      BACKBONE_APPLICATION_ID: 'app-1',
      BACKBONE_CLIENT_ID: 'fv-front',
      BACKBONE_CLIENT_SECRET: 'secret',
      FAUNA_VIVA_API_URL: `http://127.0.0.1:${api.port}`,
      ...env,
    },
  });

  const call = (route, { cookie, ...options } = {}) =>
    bff.call(route, { ...options, headers: { ...(cookie ? { cookie } : {}), ...(options.headers ?? {}) } });

  return {
    call,
    state,
    tokens,
    stop: () => {
      bff.stop();
      backbone.server.close();
      api.server.close();
    },
  };
}

module.exports = { startBff, tokens, jwt, inFuture };
