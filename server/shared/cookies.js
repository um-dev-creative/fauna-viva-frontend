'use strict';

/** The value of one cookie from a raw `Cookie` header (used where Express's cookie parser has not run, e.g. a WebSocket upgrade). */
function readCookie(header, name) {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

module.exports = { readCookie };
