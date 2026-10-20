'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBff } = require('./fakes');

let bff;
beforeEach(async () => {
  bff = await startBff({ env: { LOGIN_RATE_LIMIT_MAX: '1000' } });
});
afterEach(() => bff.stop());

const login = () => bff.call('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'pw' } });

test('the client token is requested once and reused while it is valid', async () => {
  await login();
  await login();

  assert.equal(bff.state.clientTokenCalls, 1);
});

test('simultaneous logins share one client-token request', async () => {
  bff.state.clientTokenDelayMs = 50;

  const results = await Promise.all([login(), login(), login()]);

  assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
  assert.equal(bff.state.clientTokenCalls, 1);
});

test('a client token that is about to expire is renewed', async () => {
  bff.state.clientTokenExpiresIn = 30; // inside the one-minute safety margin
  await login();
  await login();

  assert.equal(bff.state.clientTokenCalls, 2);
});

test('a client token backbone revokes early is replaced once and the login retried', async () => {
  await login();
  bff.state.rejectClientBearerOnce = true;

  const res = await login();

  assert.equal(res.status, 200);
  assert.equal(bff.state.clientTokenCalls, 2);
});

test('when backbone refuses the application client the answer is 502, never a user error', async () => {
  bff.state.clientTokenStatus = 401;

  const res = await login();

  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'Authentication service unavailable' });
  assert.equal(bff.state.loginCalls.length, 0, 'the user is not even asked about');
});

test('when backbone does not let the client act for the application (403) the answer is 502', async () => {
  bff.state.loginStatus = 403;

  const res = await login();

  assert.equal(res.status, 502);
});

test('without a configured application client the login goes out without a bearer', async () => {
  const open = await startBff({ env: { BACKBONE_CLIENT_ID: '', BACKBONE_CLIENT_SECRET: '' } });
  try {
    await open.call('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'pw' } });

    assert.equal(open.state.loginCalls[0].authorization, undefined);
    assert.equal(open.state.clientTokenCalls, 0);
  } finally {
    open.stop();
  }
});

test('an unreachable backbone makes the login a 502 and the logout still clears the cookies', async () => {
  const down = await startBff({ env: { BACKBONE_BASE_URL: 'http://127.0.0.1:1' } });
  try {
    const res = await down.call('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'pw' } });
    assert.equal(res.status, 502);

    const out = await down.call('/api/v1/auth/logout', { method: 'POST', cookie: `fv_session=${down.tokens.GOOD}` });
    assert.equal(out.status, 204);

    const me = await down.call('/api/v1/auth/me', { cookie: `fv_session=${down.tokens.EXPIRED}; fv_refresh=${down.tokens.REFRESH}` });
    assert.equal(me.status, 502, 'cannot renew: the session is not declared dead');
    assert.ok(out.headers.getSetCookie().some((c) => c.startsWith('fv_session=;')));
  } finally {
    down.stop();
  }
});
