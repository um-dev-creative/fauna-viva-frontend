'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./harness');
const { traceMiddleware, parseTraceparent, toTraceparent } = require('../shared/trace');

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const PARENT = '00f067aa0ba902b7';

let on;
let off;
before(async () => {
  on = await start();
  off = await start({ env: { TRACING_ENABLED: 'false' } });
});
after(() => {
  on.stop();
  off.stop();
});

test('a request that arrives with a traceparent keeps its trace id in the answer', async () => {
  const res = await on.call('/health', { csrf: false, headers: { traceparent: `00-${TRACE_ID}-${PARENT}-01` } });

  assert.equal(res.headers.get('x-trace-id'), TRACE_ID);
});

test('a request without one starts a trace', async () => {
  const res = await on.call('/health', { csrf: false });

  assert.match(res.headers.get('x-trace-id'), /^[0-9a-f]{32}$/);
});

test('TRACING_ENABLED=false: no X-Trace-Id is answered', async () => {
  const res = await off.call('/health', { csrf: false, headers: { traceparent: `00-${TRACE_ID}-${PARENT}-01` } });

  assert.equal(res.headers.get('x-trace-id'), null);
});

test('a malformed traceparent is ignored and a new trace is started', async () => {
  for (const bad of ['garbage', `00-${'0'.repeat(32)}-${PARENT}-01`, `00-${TRACE_ID}-${'0'.repeat(16)}-01`, `01-${TRACE_ID}-${PARENT}-01`]) {
    const res = await on.call('/health', { csrf: false, headers: { traceparent: bad } });

    assert.match(res.headers.get('x-trace-id'), /^[0-9a-f]{32}$/, bad);
    assert.notEqual(res.headers.get('x-trace-id'), TRACE_ID, bad);
  }
});

test('the middleware samples new traces by rate and keeps the caller\'s decision', () => {
  const run = (options, header) => {
    const req = { get: () => header };
    traceMiddleware(options)(req, { set() {} }, () => {});
    return req.trace;
  };

  assert.equal(run({ sampleRate: 0.1, random: () => 0.05 }).flags, '01');
  assert.equal(run({ sampleRate: 0.1, random: () => 0.5 }).flags, '00');
  assert.equal(run({ sampleRate: 0.1, random: () => 0.05 }, `00-${TRACE_ID}-${PARENT}-00`).flags, '00');
  assert.equal(toTraceparent({ traceId: TRACE_ID, spanId: PARENT, flags: '01' }), `00-${TRACE_ID}-${PARENT}-01`);
  assert.equal(parseTraceparent(undefined), null);
});

test('disabled, the middleware does nothing', () => {
  const req = { get: () => `00-${TRACE_ID}-${PARENT}-01` };
  let headers = 0;

  traceMiddleware({ enabled: false })(req, { set: () => { headers += 1; } }, () => {});

  assert.equal(req.trace, undefined);
  assert.equal(headers, 0);
});
