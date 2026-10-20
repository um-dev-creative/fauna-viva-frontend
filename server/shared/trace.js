'use strict';

const crypto = require('node:crypto');

// W3C Trace Context (https://www.w3.org/TR/trace-context/). The BFF is where a request enters Fauna Viva: it keeps the
// trace the caller started (or starts one), gives itself a span id and forwards `traceparent` to fauna-viva-rest, whose
// spans then hang from it and whose logs and error bodies carry the same trace id. The BFF does not export spans itself.
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const SAMPLED = '01';
const NOT_SAMPLED = '00';

const randomHex = (bytes) => crypto.randomBytes(bytes).toString('hex');
const allZero = (hex) => /^0+$/.test(hex);

/** The ids of a valid `traceparent` header, or `null` (malformed, unknown version, or all-zero ids, which the spec forbids). */
function parseTraceparent(header) {
  const match = TRACEPARENT.exec(String(header ?? '').trim());
  if (!match || allZero(match[1]) || allZero(match[2])) return null;
  return { traceId: match[1], parentId: match[2], flags: match[3] };
}

/** The `traceparent` the BFF sends to the API: same trace, the BFF's span as parent. */
const toTraceparent = ({ traceId, spanId, flags }) => `00-${traceId}-${spanId}-${flags}`;

/**
 * Express middleware: puts `req.trace = { traceId, spanId, flags }` (continuing the incoming trace or starting one, sampled
 * with probability `sampleRate`) and answers the trace id in `X-Trace-Id`, so that whoever reports a problem can quote it.
 * Disabled (`enabled: false`) it does nothing: no header is read, written or forwarded.
 */
function traceMiddleware({ enabled = true, sampleRate = 0.1, random = Math.random } = {}) {
  return (req, res, next) => {
    if (!enabled) return next();
    const incoming = parseTraceparent(req.get('traceparent'));
    req.trace = {
      traceId: incoming ? incoming.traceId : randomHex(16),
      spanId: randomHex(8),
      flags: incoming ? incoming.flags : (random() < sampleRate ? SAMPLED : NOT_SAMPLED),
    };
    res.set('X-Trace-Id', req.trace.traceId);
    next();
  };
}

module.exports = { traceMiddleware, parseTraceparent, toTraceparent };
