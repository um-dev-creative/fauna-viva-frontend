'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./harness');

// Behind one proxy (nginx) each client gets its own budget, taken from X-Forwarded-For.
let behind;
let direct;
before(async () => {
  behind = await start({ env: { TRUST_PROXY: '1', RATE_LIMIT_MAX: '1' } });
  direct = await start({ env: { RATE_LIMIT_MAX: '1' } });
});
after(() => {
  behind.stop();
  direct.stop();
});

const from = (bff, ip) => bff.call('/health', { csrf: false, headers: { 'X-Forwarded-For': ip } });

test('behind the proxy the limit is per forwarded client, not per proxy', async () => {
  assert.equal((await from(behind, '203.0.113.7')).status, 200);
  assert.equal((await from(behind, '203.0.113.7')).status, 429);
  assert.equal((await from(behind, '198.51.100.9')).status, 200);
});

test('without TRUST_PROXY a client cannot pick its own address with X-Forwarded-For', async () => {
  assert.equal((await from(direct, '203.0.113.7')).status, 200);
  assert.equal((await from(direct, '198.51.100.9')).status, 429);
});
