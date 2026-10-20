'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBff } = require('./fakes');

let bff;
const post = (route, body) => bff.call(`/api/v1/auth/${route}`, { method: 'POST', body });

before(async () => {
  bff = await startBff({ env: { REGISTRATION_RATE_LIMIT_MAX: '1000' } });
});
after(() => bff.stop());
beforeEach(() => Object.assign(bff.state, { apiStatus: 201, apiCalls: [] }));

const valid = {
  alias: 'maria',
  email: 'm@x.co',
  password: 'S3cret!pass',
  displayName: 'María',
  language: 'es',
  person: { firstName: 'María', lastName: 'Pérez', birthdate: '1990-01-01' },
};

test('register forwards only the documented fields: the browser cannot choose role or application', async () => {
  const res = await post('register', { ...valid, applicationId: 'x', roleId: 'admin', active: true, person: { ...valid.person, isAdmin: true } });

  assert.equal(res.status, 201);
  const [call] = bff.state.apiCalls;
  assert.equal(call.url, '/api/v1/auth/register');
  assert.deepEqual(call.body, valid);
  assert.ok(!('cookie' in call.headers) && !('session-token' in call.headers));
});

test('register rejects missing or malformed data before the API', async () => {
  const bad = [
    undefined,
    {},
    { ...valid, email: '' },
    { ...valid, person: undefined },
    { ...valid, person: [] },
    { ...valid, displayName: 7 },
    { ...valid, person: { firstName: 3 } },
  ];
  for (const body of bad) assert.equal((await post('register', body)).status, 400, JSON.stringify(body));
  assert.equal(bff.state.apiCalls.length, 0);
});

test('the API answers (409, 429 with Retry-After) reach the browser as they are', async () => {
  bff.state.apiStatus = 409;
  assert.equal((await post('register', valid)).status, 409);
  bff.state.apiStatus = 429;
  const limited = await post('register', valid);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '30');
});

test('verify-email needs the alias and a six-digit code', async () => {
  assert.equal((await post('verify-email', { alias: 'maria', code: '123456' })).status, 201);
  assert.deepEqual(bff.state.apiCalls[0].body, { alias: 'maria', code: '123456' });
  for (const body of [undefined, { alias: 'maria' }, { alias: 'maria', code: '12345' }, { alias: 'maria', code: 'abcdef' }, { alias: '', code: '123456' }]) {
    assert.equal((await post('verify-email', body)).status, 400, JSON.stringify(body));
  }
});

test('resend-verification needs the alias; language is optional', async () => {
  assert.equal((await post('resend-verification', { alias: 'maria', language: 'es', extra: 1 })).status, 201);
  assert.deepEqual(bff.state.apiCalls[0].body, { alias: 'maria', language: 'es' });
  for (const body of [undefined, {}, { alias: 'maria', language: 5 }]) {
    assert.equal((await post('resend-verification', body)).status, 400, JSON.stringify(body));
  }
});

test('a 204 from the API has no body and the visitor IP travels in X-Forwarded-For', async () => {
  bff.state.apiStatus = 204;

  const res = await post('verify-email', { alias: 'maria', code: '123456' });

  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
  assert.match(bff.state.apiCalls[0].headers['x-forwarded-for'], /127\.0\.0\.1/);
  assert.match(bff.state.apiCalls[0].headers.traceparent ?? '', /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
});

test('an unreachable API is a 502 that never leaks the cause', async () => {
  const down = await startBff({ env: { FAUNA_VIVA_API_URL: 'http://127.0.0.1:1', REGISTRATION_RATE_LIMIT_MAX: '1000' } });
  try {
    const res = await down.call('/api/v1/auth/register', { method: 'POST', body: valid });

    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, 'Backend unavailable');
    assert.match(body.traceId, /^[0-9a-f]{32}$/);
  } finally {
    down.stop();
  }
});
