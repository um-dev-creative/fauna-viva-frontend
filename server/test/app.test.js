'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { start } = require('./harness');

let built;
let notBuilt;
let dist;

before(async () => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-dist-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<html><body>fauna viva app</body></html>');
  fs.writeFileSync(path.join(dist, 'main.js'), 'console.log(1)');
  built = await start({ appOptions: { distPath: dist } });
  notBuilt = await start({ appOptions: { distPath: path.join(dist, 'missing') } });
});
after(() => {
  built.stop();
  notBuilt.stop();
  fs.rmSync(dist, { recursive: true, force: true });
});

test('GET /health answers UP without any CSRF header', async () => {
  const res = await built.call('/health', { csrf: false });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'UP' });
});

test('does not announce the framework', async () => {
  const res = await built.call('/health', { csrf: false });

  assert.equal(res.headers.get('x-powered-by'), null);
});

test('serves the built assets', async () => {
  const res = await built.call('/main.js', { csrf: false });

  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'console.log(1)');
});

test('a client-side route gets the app', async () => {
  const res = await built.call('/pacientes', { csrf: false });

  assert.equal(res.status, 200);
  assert.match(await res.text(), /fauna viva app/);
});

test('an unknown /api path is a JSON 404, never the app', async () => {
  const res = await built.call('/api/v1/typo');

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});

test('a state-changing /api call without the CSRF header is refused', async () => {
  const res = await built.call('/api/v1/typo', { method: 'POST', body: { a: 1 }, csrf: false });

  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'Missing CSRF header' });
});

test('a GET to /api does not need the CSRF header', async () => {
  const res = await built.call('/api/v1/typo', { csrf: false });

  assert.equal(res.status, 404);
});

test('without a build it says so instead of failing obscurely', async () => {
  const res = await notBuilt.call('/pacientes', { csrf: false });

  assert.equal(res.status, 503);
  assert.match(await res.text(), /pnpm build/);
});

test('CORS allows the configured origin with credentials and exposes the trace and paging headers', async () => {
  const res = await built.call('/health', { csrf: false, headers: { Origin: 'http://localhost:4200' } });

  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:4200');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  const exposed = (res.headers.get('access-control-expose-headers') ?? '').toLowerCase();
  for (const name of ['x-trace-id', 'etag', 'x-total-count', 'link']) assert.ok(exposed.includes(name), name);
});

test('the preflight lets the browser send the CSRF and clinic headers', async () => {
  const res = await built.call('/api/v1/typo', {
    method: 'OPTIONS', csrf: false,
    headers: { Origin: 'http://localhost:4200', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-fv-csrf,x-clinic-id,idempotency-key' },
  });

  const allowed = (res.headers.get('access-control-allow-headers') ?? '').toLowerCase();
  for (const name of ['x-fv-csrf', 'x-clinic-id', 'idempotency-key']) assert.ok(allowed.includes(name), name);
});
