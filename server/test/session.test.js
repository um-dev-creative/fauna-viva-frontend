'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodePayload, setSessionCookies, clearSessionCookies } = require('../shared/session');
const { jwt, inFuture } = require('./fakes');

const fakeRes = () => {
  const calls = { cookie: [], clear: [] };
  return { calls, cookie: (...a) => calls.cookie.push(a), clearCookie: (...a) => calls.clear.push(a) };
};

test('decodePayload reads a JWT payload and gives null for anything else', () => {
  assert.deepEqual(decodePayload(jwt({ uid: 'u' })), { uid: 'u' });
  assert.equal(decodePayload('nope'), null);
  assert.equal(decodePayload('a.!!!.c'), null);
});

test('session cookies live as long as the refresh token', () => {
  const res = fakeRes();
  setSessionCookies(res, { token: 't', refreshToken: jwt({ exp: inFuture(1000) }) });

  assert.equal(res.calls.cookie.length, 2);
  const [, , options] = res.calls.cookie[0];
  assert.ok(options.maxAge > 990_000 && options.maxAge <= 1_000_000);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
});

test('without a refresh token only the session cookie is set, for a day', () => {
  const res = fakeRes();
  setSessionCookies(res, { token: 't' });

  assert.equal(res.calls.cookie.length, 1);
  assert.equal(res.calls.cookie[0][2].maxAge, 86_400_000);
});

test('a refresh token already expired gives a zero lifetime, never a negative one', () => {
  const res = fakeRes();
  setSessionCookies(res, { token: 't', refreshToken: jwt({ exp: inFuture(-100) }) });

  assert.equal(res.calls.cookie[0][2].maxAge, 0);
});

test('clearSessionCookies removes both cookies with the same attributes', () => {
  const res = fakeRes();
  clearSessionCookies(res);

  assert.deepEqual(res.calls.clear.map((c) => c[0]), ['fv_session', 'fv_refresh']);
});
