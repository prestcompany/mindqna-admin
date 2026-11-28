import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authOptions } from '../pages/api/auth/[...nextauth]';

test('next-auth errors land on the login page', () => {
  assert.equal(authOptions.pages?.error, '/login');
});
