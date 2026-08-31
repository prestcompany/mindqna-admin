import assert from 'node:assert/strict';
import test from 'node:test';

import { areDifferentUserCodes, isValidUserCode, normalizeUserCode } from './user-migration-validation';

test('accepts the 8-character user codes shown in the user table', () => {
  assert.equal(isValidUserCode('01234567'), true);
});

test('normalizes pasted user codes before validation', () => {
  assert.equal(normalizeUserCode(' 01234567\n'), '01234567');
  assert.equal(isValidUserCode(' 01234567\n'), true);
});

test('rejects transfer between the same user code', () => {
  assert.equal(areDifferentUserCodes('01234567', ' 01234567 '), false);
});
