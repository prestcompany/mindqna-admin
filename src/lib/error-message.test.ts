import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBadRequest } from './error-message';

test('isBadRequest is true only for an HTTP 400 response', () => {
  assert.equal(isBadRequest({ response: { status: 400, data: { message: 'x' } } }), true);
  assert.equal(isBadRequest({ response: { status: 500 } }), false);
  assert.equal(isBadRequest(new Error('Network Error')), false);
  assert.equal(isBadRequest(undefined), false);
});
