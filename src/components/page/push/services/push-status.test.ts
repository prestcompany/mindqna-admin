import assert from 'node:assert/strict';
import test from 'node:test';

import { PUSH_STATUS_META, allowedActions } from './push-status';

test('every status has a Korean label and a dot badge variant', () => {
  const statuses = ['SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELED', 'ABORTED'] as const;
  for (const status of statuses) {
    const meta = PUSH_STATUS_META[status];
    assert.ok(meta.label.length > 0, `${status} has no label`);
    // DESIGN.md: status uses dot variants, soft is reserved for categories.
    assert.ok(meta.variant.startsWith('dot'), `${status} uses ${meta.variant}`);
  }
});

test('a scheduled push can be edited, cancelled and deleted', () => {
  assert.deepEqual(allowedActions('SCHEDULED', 0), ['edit', 'cancel', 'delete']);
});

test('a sending push can only be viewed or aborted', () => {
  assert.deepEqual(allowedActions('SENDING', 12_340), ['view', 'abort']);
});

test('a completed push that reached someone cannot be deleted', () => {
  assert.deepEqual(allowedActions('SENT', 300_000), ['view']);
});

test('a completed push that reached nobody can be deleted', () => {
  assert.deepEqual(allowedActions('SENT', 0), ['view', 'delete']);
});

test('a failed push offers duplication, and deletion only if it reached nobody', () => {
  assert.deepEqual(allowedActions('FAILED', 0), ['view', 'duplicate', 'delete']);
  assert.deepEqual(allowedActions('FAILED', 30_000), ['view', 'duplicate']);
});

test('a cancelled push offers duplication', () => {
  assert.deepEqual(allowedActions('CANCELED', 0), ['view', 'duplicate', 'delete']);
});

test('an aborted push keeps its record when it reached someone', () => {
  assert.deepEqual(allowedActions('ABORTED', 12_340), ['view']);
});
