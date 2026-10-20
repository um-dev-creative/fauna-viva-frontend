'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { startBff } = require('./fakes');

let bff;
const session = (token, refresh) => [token && `fv_session=${token}`, refresh && `fv_refresh=${refresh}`].filter(Boolean).join('; ');

before(async () => {
  bff = await startBff();
});
after(() => bff.stop());
beforeEach(() => {
  Object.assign(bff.state, { apiStatus: 200, apiCalls: [], apiResponse: null, apiRequiresSession: true, refreshStatus: 200, refreshCalls: [] });
});

const lastCall = () => bff.state.apiCalls.at(-1);

test('a call without a session never reaches the API', async () => {
  const res = await bff.call('/api/v1/patients');

  assert.equal(res.status, 401);
  assert.equal(bff.state.apiCalls.length, 0);
});

test('the cookie token travels as the session-token header, never as the browser sent it', async () => {
  const res = await bff.call('/api/v1/patients?page=2', { cookie: session(bff.tokens.GOOD), headers: { 'session-token': 'forged' } });

  assert.equal(res.status, 200);
  assert.equal(lastCall().url, '/api/v1/patients?page=2');
  assert.equal(lastCall().headers['session-token'], bff.tokens.GOOD);
  assert.equal(lastCall().headers.cookie, undefined);
});

test('X-Clinic-Id, If-Match, Idempotency-Key and traceparent reach the API', async () => {
  await bff.call('/api/v1/appointments/7', {
    method: 'PUT',
    body: { notes: 'x' },
    cookie: session(bff.tokens.GOOD),
    headers: { 'X-Clinic-Id': 'c-1', 'If-Match': '"3"', 'Idempotency-Key': 'k-1' },
  });

  const { headers, body, url } = lastCall();
  assert.equal(url, '/api/v1/appointments/7');
  assert.deepEqual(body, { notes: 'x' });
  assert.equal(headers['x-clinic-id'], 'c-1');
  assert.equal(headers['if-match'], '"3"');
  assert.equal(headers['idempotency-key'], 'k-1');
  assert.match(headers.traceparent, /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
});

test('optional headers are not invented when the browser did not send them', async () => {
  await bff.call('/api/v1/patients', { cookie: session(bff.tokens.GOOD) });

  for (const name of ['x-clinic-id', 'if-match', 'idempotency-key']) assert.equal(lastCall().headers[name], undefined, name);
});

test('the headers a screen needs come back: ETag, X-Total-Count, Link, Content-Disposition, Idempotent-Replayed', async () => {
  bff.state.apiResponse = {
    status: 200,
    headers: { ETag: '"4"', 'X-Total-Count': '42', Link: '<x>; rel="next"', 'Content-Disposition': 'attachment; filename=a.csv', 'Idempotent-Replayed': 'true', 'X-Secret': 'no' },
    body: JSON.stringify([]),
  };

  const res = await bff.call('/api/v1/patients', { cookie: session(bff.tokens.GOOD) });

  assert.equal(res.headers.get('etag'), '"4"');
  assert.equal(res.headers.get('x-total-count'), '42');
  assert.equal(res.headers.get('link'), '<x>; rel="next"');
  assert.match(res.headers.get('content-disposition'), /a\.csv/);
  assert.equal(res.headers.get('idempotent-replayed'), 'true');
  assert.equal(res.headers.get('x-secret'), null);
});

test('a repeated query parameter stays repeated, without indexes', async () => {
  await bff.call('/api/v1/patients?sort=name&sort=-age&q=a', { cookie: session(bff.tokens.GOOD) });

  assert.equal(lastCall().url, '/api/v1/patients?sort=name&sort=-age&q=a');
});

test('a 401 from the API with a valid refresh token is renewed once and the call retried unseen', async () => {
  const res = await bff.call('/api/v1/patients', { cookie: session(bff.tokens.EXPIRED, bff.tokens.REFRESH) });

  assert.equal(res.status, 200);
  assert.equal(bff.state.refreshCalls.length, 1);
  assert.deepEqual(bff.state.apiCalls.map((c) => c.headers['session-token']), [bff.tokens.EXPIRED, bff.tokens.RENEWED]);
  assert.ok(res.headers.getSetCookie().some((c) => c.startsWith(`fv_session=${bff.tokens.RENEWED}`)));
});

test('a 401 with a refresh token that no longer works clears the cookies and the portal gets 401', async () => {
  bff.state.refreshStatus = 401;

  const res = await bff.call('/api/v1/patients', { cookie: session(bff.tokens.EXPIRED, bff.tokens.REFRESH) });

  assert.equal(res.status, 401);
  assert.equal(bff.state.apiCalls.length, 1, 'no retry');
  assert.ok(res.headers.getSetCookie().some((c) => c.startsWith('fv_session=;')));
});

test('a 401 without a refresh token is passed on and nothing is renewed', async () => {
  const res = await bff.call('/api/v1/patients', { cookie: session(bff.tokens.EXPIRED) });

  assert.equal(res.status, 401);
  assert.equal(bff.state.refreshCalls.length, 0);
});

test('a state-changing call without the CSRF header is refused', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await bff.call('/api/v1/patients', { method, body: {}, csrf: false, cookie: session(bff.tokens.GOOD) });
    assert.equal(res.status, 403, method);
  }
  assert.equal(bff.state.apiCalls.length, 0);
});

test('DELETE reaches the API without a body and a 204 stays empty', async () => {
  bff.state.apiResponse = { status: 204 };

  const res = await bff.call('/api/v1/patients/9', { method: 'DELETE', cookie: session(bff.tokens.GOOD) });

  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
  assert.equal(lastCall().method, 'DELETE');
});

test('the API\'s errors keep their status and a problem+json body keeps its media type', async () => {
  bff.state.apiResponse = {
    status: 412,
    headers: { 'Content-Type': 'application/problem+json' },
    body: JSON.stringify({ type: 'about:blank', title: 'Precondition Failed', status: 412 }),
  };

  const res = await bff.call('/api/v1/patients/9', { method: 'PUT', body: {}, cookie: session(bff.tokens.GOOD) });

  assert.equal(res.status, 412);
  assert.match(res.headers.get('content-type'), /application\/problem\+json/);
  assert.equal((await res.json()).title, 'Precondition Failed');
});

test('a path that climbs out of /api/v1 never reaches the API', async () => {
  // fetch() would tidy the dots away before sending, so the request line is written by hand
  const raw = (path) =>
    new Promise((resolve, reject) => {
      const url = new URL(bff.baseUrl);
      const req = http.request({ host: url.hostname, port: url.port, path, headers: { cookie: session(bff.tokens.GOOD) } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject).end();
    });

  for (const path of ['/api/v1/%2e%2e/actuator/env', '/api/v1/a/..%2Fb', '/api/v1/a/%2E%2E', '/api/v1/%E0%A4%A/x']) {
    assert.equal(await raw(path), 400, path);
  }
  assert.equal(bff.state.apiCalls.length, 0);
});

test('an API that is down is a 502 with the trace id, and the cookies stay', async () => {
  const down = await startBff({ env: { FAUNA_VIVA_API_URL: 'http://127.0.0.1:1' } });
  try {
    const res = await down.call('/api/v1/patients', { cookie: session(down.tokens.GOOD) });

    assert.equal(res.status, 502);
    assert.match((await res.json()).traceId, /^[0-9a-f]{32}$/);
    assert.deepEqual(res.headers.getSetCookie(), []);
  } finally {
    down.stop();
  }
});

test('with tracing off no traceparent is sent and a failure is a plain 502', async () => {
  const off = await startBff({ env: { TRACING_ENABLED: 'false' } });
  try {
    off.state.apiRequiresSession = false;
    await off.call('/api/v1/patients', { cookie: session(off.tokens.GOOD) });
    assert.equal(off.state.apiCalls.at(-1).headers.traceparent, undefined);
  } finally {
    off.stop();
  }
});

test('the API answering 5xx is relayed as it is', async () => {
  bff.state.apiResponse = { status: 503, body: JSON.stringify({ message: 'later' }), headers: { 'Content-Type': 'application/json' } };

  const res = await bff.call('/api/v1/patients', { cookie: session(bff.tokens.GOOD) });

  assert.equal(res.status, 503);
});

test('security headers are on every answer', async () => {
  const res = await bff.call('/health');

  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('the global rate limit answers 429 with Retry-After', async () => {
  const limited = await startBff({ env: { RATE_LIMIT_MAX: '3' } });
  try {
    const statuses = [];
    let last;
    for (let i = 0; i < 4; i++) {
      last = await limited.call('/health');
      statuses.push(last.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);
    assert.ok(last.headers.get('retry-after'));
  } finally {
    limited.stop();
  }
});
