'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const entry = path.join(__dirname, '../../server.js');
const baseEnv = { PATH: process.env.PATH };

test('in production, without the Backbone application and client, the BFF exits with code 78 and says what is missing', () => {
  const run = spawnSync('node', [entry], { env: { ...baseEnv, NODE_ENV: 'production' }, encoding: 'utf8' });

  assert.equal(run.status, 78);
  assert.match(run.stderr, /Configuration: BACKBONE_APPLICATION_ID is required in production/);
  assert.match(run.stderr, /Configuration: BACKBONE_CLIENT_ID is required in production/);
  assert.match(run.stderr, /Configuration: BACKBONE_CLIENT_SECRET is required in production/);
});

test('half a client credential is refused with code 78 even in development', () => {
  const run = spawnSync('node', [entry], { env: { ...baseEnv, NODE_ENV: 'development', BACKBONE_CLIENT_ID: 'id' }, encoding: 'utf8' });

  assert.equal(run.status, 78);
  assert.match(run.stderr, /must be set together/);
});

test('a valid configuration starts the server, which answers /health', async () => {
  const port = 17006 + Math.floor(Math.random() * 1000);
  const child = spawn('node', [entry], { env: { ...baseEnv, NODE_ENV: 'development', PORT: String(port) }, stdio: 'ignore' });
  try {
    let res;
    for (let i = 0; i < 50 && !res; i++) {
      res = await fetch(`http://127.0.0.1:${port}/health`).catch(() => null);
      if (!res) await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(res, 'the server did not come up');
    assert.deepEqual(await res.json(), { status: 'UP' });
  } finally {
    child.kill();
  }
});
