'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./harness');

let bff;
before(async () => {
  bff = await start({ env: { RATE_LIMIT_MAX: '5' } });
});
after(() => bff.stop());

test('the general limit applies to everything, however many calls come', async () => {
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await bff.call('/health', { csrf: false })).status);

  assert.ok(statuses.includes(429), statuses.join(','));
  assert.equal(statuses[0], 200);
});
