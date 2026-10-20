'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBff } = require('./fakes');

let bff;
const cookie = (session, refresh) =>
  [session && `fv_session=${session}`, refresh && `fv_refresh=${refresh}`].filter(Boolean).join('; ');

before(async () => {
  bff = await startBff();
});
after(() => bff.stop());
beforeEach(() => {
  Object.assign(bff.state, { refreshStatus: 200, refreshCalls: [], logoutStatus: 204, logoutCalls: [] });
});

test('/me with a valid session answers the user without touching backbone', async () => {
  const res = await bff.call('/api/v1/auth/me', { cookie: cookie(bff.tokens.GOOD) });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    authenticated: true,
    user: { id: 'u-1', username: 'luis', firstname: 'Luis', lastname: 'Mata' },
  });
  assert.equal(bff.state.refreshCalls.length, 0);
});

test('/me without cookies is not authenticated', async () => {
  const res = await bff.call('/api/v1/auth/me');

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { authenticated: false });
});

test('/me with an expired session and no refresh token is not authenticated', async () => {
  const res = await bff.call('/api/v1/auth/me', { cookie: cookie(bff.tokens.EXPIRED) });

  assert.equal(res.status, 401);
});

test('/me with a token that is not a JWT is not authenticated', async () => {
  const res = await bff.call('/api/v1/auth/me', { cookie: cookie('garbage') });

  assert.equal(res.status, 401);
});

test('/me renews an expired session with the refresh token and sets the new cookies', async () => {
  const res = await bff.call('/api/v1/auth/me', { cookie: cookie(bff.tokens.EXPIRED, bff.tokens.REFRESH) });

  assert.equal(res.status, 200);
  assert.equal((await res.json()).user.username, 'luis');
  assert.deepEqual(bff.state.refreshCalls, [{ refreshToken: bff.tokens.REFRESH }]);
  assert.ok(res.headers.getSetCookie().some((c) => c.startsWith(`fv_session=${bff.tokens.RENEWED}`)));
});

test('/me with a refresh token backbone rejects clears the cookies and answers 401', async () => {
  bff.state.refreshStatus = 401;

  const res = await bff.call('/api/v1/auth/me', { cookie: cookie(bff.tokens.EXPIRED, bff.tokens.REFRESH) });

  assert.equal(res.status, 401);
  assert.ok(res.headers.getSetCookie().some((c) => c.startsWith('fv_session=;')));
});

test('/me: a backbone failure while renewing ends the session', async () => {
  bff.state.refreshStatus = 500;

  const res = await bff.call('/api/v1/auth/me', { cookie: cookie(bff.tokens.EXPIRED, bff.tokens.REFRESH) });

  assert.equal(res.status, 401);
});

test('logout revokes the session in backbone and clears both cookies', async () => {
  const res = await bff.call('/api/v1/auth/logout', { method: 'POST', cookie: cookie(bff.tokens.GOOD, bff.tokens.REFRESH) });

  assert.equal(res.status, 204);
  assert.deepEqual(bff.state.logoutCalls, [{ body: { refreshToken: bff.tokens.REFRESH }, sessionToken: bff.tokens.GOOD }]);
  const cookies = res.headers.getSetCookie();
  assert.ok(cookies.some((c) => c.startsWith('fv_session=;')));
  assert.ok(cookies.some((c) => c.startsWith('fv_refresh=;')));
});

test('logout clears the cookies even when backbone refuses or there was no session', async () => {
  bff.state.logoutStatus = 500;
  const refused = await bff.call('/api/v1/auth/logout', { method: 'POST', cookie: cookie(bff.tokens.GOOD) });
  const anonymous = await bff.call('/api/v1/auth/logout', { method: 'POST' });

  assert.equal(refused.status, 204);
  assert.equal(anonymous.status, 204);
  assert.equal(bff.state.logoutCalls.length, 1, 'no call without a session token');
});
