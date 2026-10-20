'use strict';

/**
 * A BFF listening on an ephemeral port. `env` entries are set before the BFF modules load (the BFF reads its environment
 * at require time), and the modules are dropped from the require cache first, so every `start()` gets a fresh configuration.
 */
const http = require('node:http');
const path = require('node:path');

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));

const serverDir = path.join(__dirname, '..');
const forgetBffModules = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(serverDir) && !key.startsWith(__dirname)) delete require.cache[key];
  }
};

async function start({ env = {}, appOptions } = {}) {
  const previous = { ...process.env };
  Object.assign(process.env, { NODE_ENV: 'test', ...env });
  forgetBffModules();
  const { createApp } = require('../app');
  const server = http.createServer(createApp(appOptions));
  const port = await listen(server);
  // restore: the next start() builds its own environment, and nothing leaks into unrelated tests
  for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
  Object.assign(process.env, previous);

  const call = (route, { method = 'GET', body, csrf = true, headers = {} } = {}) =>
    fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'x-fv-csrf': '1' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  return { call, port, stop: () => server.close() };
}

module.exports = { start, listen };
