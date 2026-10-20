'use strict';

const http = require('node:http');
const https = require('node:https');

/**
 * Container probe: asks the BFF's own /health over the protocol it serves (https when a certificate is configured).
 * The certificate is not verified: this only reaches the process in the same container, through localhost.
 */
function probe({ port, tls }, onDone) {
  const client = tls ? https : http;
  const req = client.get({ host: 'localhost', port, path: '/health', rejectUnauthorized: false, timeout: 2500 }, (res) => {
    res.resume();
    onDone(res.statusCode === 200);
  });
  req.on('timeout', () => req.destroy());
  req.on('error', () => onDone(false));
}

module.exports = { probe };

if (require.main === module) {
  probe({ port: process.env.PORT || 7006, tls: Boolean(process.env.SSL_CERT_PATH) }, (ok) => process.exit(ok ? 0 : 1));
}
