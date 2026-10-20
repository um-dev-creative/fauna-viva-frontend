'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBff } = require('./fakes');

let bff;
const login = (body = { email: 'a@b.c', password: 'pw' }) => bff.call('/api/v1/auth/login', { method: 'POST', body });

before(async () => {
  bff = await startBff({ env: { LOGIN_RATE_LIMIT_MAX: '1000' } });
});
after(() => bff.stop());
beforeEach(() => {
  Object.assign(bff.state, { loginStatus: 200, loginCalls: [], clientTokenStatus: 200 });
});

test('login succeeds, answers only the profile and sets both cookies httpOnly', async () => {
  const res = await login();

  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(!text.includes(bff.tokens.GOOD) && !text.includes(bff.tokens.REFRESH), 'no token in the body');
  assert.deepEqual(JSON.parse(text).user, { id: 'u-1', username: 'luis', firstname: 'Luis', lastname: 'Mata' });
  const cookies = res.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.some((c) => c.startsWith('fv_session=')));
  assert.ok(cookies.some((c) => c.startsWith('fv_refresh=')));
  for (const c of cookies) {
    assert.match(c, /HttpOnly/i);
    assert.match(c, /SameSite=Lax/i);
  }
});

test('login asks backbone for the Fauna Viva application with the application client as bearer', async () => {
  await login();

  const [call] = bff.state.loginCalls;
  assert.deepEqual(call.body, { email: 'a@b.c', password: 'pw', applicationId: 'app-1' });
  assert.match(call.authorization, /^Bearer client-/);
});

test('every "your credentials are wrong" answer of backbone, and an unknown user, is the same 401', async () => {
  const bodies = new Set();
  for (const status of [400, 401, 404, 406]) {
    bff.state.loginStatus = status;
    const res = await login();
    assert.equal(res.status, 401, `backbone ${status}`);
    assert.deepEqual(res.headers.getSetCookie(), []);
    bodies.add(JSON.stringify(await res.json()));
  }
  assert.equal(bodies.size, 1);
});

test('a locked account (backbone 429) answers 429', async () => {
  bff.state.loginStatus = 429;

  const res = await login();

  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: 'Too many attempts. Try again later' });
});

test('an unexpected backbone answer is 502', async () => {
  bff.state.loginStatus = 500;

  const res = await login();

  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'Authentication service unavailable' });
});

test('login needs both fields as non-empty strings', async () => {
  for (const body of [undefined, {}, { email: 'a@b.c' }, { password: 'pw' }, { email: '', password: 'pw' }, { email: 1, password: 'pw' }]) {
    const res = await bff.call('/api/v1/auth/login', { method: 'POST', body: body ?? undefined });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('login without the CSRF header is refused before it reaches backbone', async () => {
  const res = await bff.call('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'pw' }, csrf: false });

  assert.equal(res.status, 403);
  assert.equal(bff.state.loginCalls.length, 0);
});
