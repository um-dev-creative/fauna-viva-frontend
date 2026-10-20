'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { probe } = require('../healthcheck');

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const ask = (options) => new Promise((resolve) => probe(options, resolve));

// a throwaway self-signed pair, as the BFF would serve in a container
const tlsFiles = () => {
  const dir = require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(), 'fv-hc-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
  const fs = require('node:fs');
  return { key: fs.readFileSync(path.join(dir, 'k.pem')), cert: fs.readFileSync(path.join(dir, 'c.pem')) };
};

test('healthy over plain http', async () => {
  const server = http.createServer((req, res) => res.end(req.url === '/health' ? 'ok' : 'no'));
  const port = await listen(server);
  assert.equal(await ask({ port, tls: false }), true);
  server.close();
});

test('healthy over https even with a certificate localhost does not verify', async () => {
  const server = https.createServer(tlsFiles(), (_req, res) => res.end('ok'));
  const port = await listen(server);
  assert.equal(await ask({ port, tls: true }), true);
  server.close();
});

test('unhealthy when the status is not 200, when nothing listens, or when the protocol does not match', async () => {
  const failing = http.createServer((_req, res) => { res.statusCode = 503; res.end(); });
  const port = await listen(failing);
  assert.equal(await ask({ port, tls: false }), false);
  assert.equal(await ask({ port, tls: true }), false);   // https probe against a plain-http server
  failing.close();
  assert.equal(await ask({ port: 1, tls: false }), false);
});

test('as a script it exits 1 when the BFF is not answering', () => {
  assert.throws(() => execFileSync('node', [path.join(__dirname, '../healthcheck.js')], { env: { PORT: '1', PATH: process.env.PATH }, stdio: 'ignore' }), (e) => e.status === 1);
});
