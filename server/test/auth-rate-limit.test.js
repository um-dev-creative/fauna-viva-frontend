'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startBff } = require('./fakes');

let bff;
before(async () => {
  bff = await startBff({ env: { LOGIN_RATE_LIMIT_MAX: '10', REGISTRATION_RATE_LIMIT_MAX: '2' } });
});
after(() => bff.stop());

const login = () => bff.call('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'bad' } });

test('the eleventh login from the same IP within the window is 429', async () => {
  bff.state.loginStatus = 401;
  for (let i = 1; i <= 10; i++) assert.equal((await login()).status, 401, `attempt ${i}`);

  const res = await login();

  assert.equal(res.status, 429);
  assert.ok(res.headers.get('retry-after'), 'says when to retry');
});

test('registration has its own limit', async () => {
  const body = { alias: 'luis' };
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await bff.call('/api/v1/auth/resend-verification', { method: 'POST', body })).status);

  assert.deepEqual(statuses, [201, 201, 429]);
});
