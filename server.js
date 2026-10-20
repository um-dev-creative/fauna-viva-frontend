'use strict';

require('dotenv').config();

const http = require('node:http');
const https = require('node:https');
const { readFileSync } = require('node:fs');

const logger = require('./server/config/logger');
const constants = require('./server/config/constants');
const { settingsProblems } = require('./server/config/settings-check');

const { PORT, NODE_ENV, SSL_CERT_PATH, SSL_KEY_PATH, FAUNA_VIVA_API_URL } = constants;

const problems = settingsProblems(constants);
if (problems.length > 0) {
  // console, not the logger: its transport is asynchronous and the process ends right here
  problems.forEach((problem) => console.error(`Configuration: ${problem}`));
  process.exit(78); // EX_CONFIG: do not start half-configured
}

const { createApp } = require('./server/app');

const app = createApp();

const server =
  SSL_CERT_PATH && SSL_KEY_PATH
    ? https.createServer({ key: readFileSync(SSL_KEY_PATH), cert: readFileSync(SSL_CERT_PATH) }, app)
    : http.createServer(app);

server.listen(PORT, () => {
  logger.info(`fauna-viva BFF on ${SSL_CERT_PATH ? 'https' : 'http'}://localhost:${PORT} → ${FAUNA_VIVA_API_URL} [${NODE_ENV}]`);
});
