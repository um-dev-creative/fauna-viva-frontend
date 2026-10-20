'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.join(__dirname, '../config/constants.js');
const load = (env) => {
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) if (/^(TRUST_PROXY|TRACE_SAMPLE_RATE|TRACING_ENABLED|PORT|BACKBONE_CLIENT_SCOPES|COOKIE_SECURE)$/.test(key)) delete process.env[key];
  Object.assign(process.env, env);
  delete require.cache[modulePath];
  const loaded = require(modulePath);
  delete require.cache[modulePath];
  process.env = saved;
  return loaded;
};

test('defaults', () => {
  const c = load({});

  assert.equal(c.PORT, 7006);
  assert.equal(c.TRUST_PROXY, false);
  assert.equal(c.TRACING_ENABLED, true);
  assert.equal(c.TRACE_SAMPLE_RATE, 0.1);
  assert.deepEqual(c.BACKBONE_CLIENT_SCOPES, ['session:manage']);
  assert.equal(c.COOKIE_SECURE, false);
  assert.equal(c.SESSION_COOKIE, 'fv_session');
  assert.equal(c.REFRESH_COOKIE, 'fv_refresh');
  assert.equal(c.CSRF_HEADER, 'x-fv-csrf');
});

test('TRUST_PROXY reads a hop count, addresses, true or false', () => {
  assert.equal(load({ TRUST_PROXY: '1' }).TRUST_PROXY, 1);
  assert.equal(load({ TRUST_PROXY: 'loopback, 172.16.0.0/12' }).TRUST_PROXY, 'loopback, 172.16.0.0/12');
  assert.equal(load({ TRUST_PROXY: 'true' }).TRUST_PROXY, true);
  assert.equal(load({ TRUST_PROXY: 'false' }).TRUST_PROXY, false);
  assert.equal(load({ TRUST_PROXY: '  ' }).TRUST_PROXY, false);
});

test('the trace sample rate stays between 0 and 1 and falls back to 0 when it is not a number', () => {
  assert.equal(load({ TRACE_SAMPLE_RATE: '5' }).TRACE_SAMPLE_RATE, 1);
  assert.equal(load({ TRACE_SAMPLE_RATE: '-1' }).TRACE_SAMPLE_RATE, 0);
  assert.equal(load({ TRACE_SAMPLE_RATE: 'abc' }).TRACE_SAMPLE_RATE, 0);
});

test('switches and lists', () => {
  const c = load({ TRACING_ENABLED: 'FALSE', COOKIE_SECURE: 'true', BACKBONE_CLIENT_SCOPES: 'a, b,,c' });

  assert.equal(c.TRACING_ENABLED, false);
  assert.equal(c.COOKIE_SECURE, true);
  assert.deepEqual(c.BACKBONE_CLIENT_SCOPES, ['a', 'b', 'c']);
});
