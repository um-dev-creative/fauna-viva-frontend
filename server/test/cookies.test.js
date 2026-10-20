'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readCookie } = require('../shared/cookies');

test('readCookie finds one cookie in a raw header', () => {
  assert.equal(readCookie('a=1; fv_session=abc; b=2', 'fv_session'), 'abc');
});

test('readCookie decodes the value and tolerates a malformed escape', () => {
  assert.equal(readCookie('x=a%20b', 'x'), 'a b');
  assert.equal(readCookie('x=%E0%A4%A', 'x'), '%E0%A4%A');
});

test('readCookie answers undefined for no header, no match or no value separator', () => {
  assert.equal(readCookie(undefined, 'x'), undefined);
  assert.equal(readCookie('a=1', 'x'), undefined);
  assert.equal(readCookie('novalue', 'novalue'), undefined);
});
