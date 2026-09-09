import assert from 'node:assert/strict';
import test from 'node:test';

import { describeRepeats, parseBulkSpaceIds } from './bulk-space-ids';

test('trims and drops empties', () => {
  const actual = parseBulkSpaceIds(' A , B ,, C ,');
  assert.deepEqual(actual.ids, ['A', 'B', 'C']);
  assert.equal(actual.uniqueCount, 3);
  assert.deepEqual(actual.repeated, []);
});

test('keeps every occurrence, because the server grants one per occurrence', () => {
  // Deduping here used to silently turn three grants into one.
  const actual = parseBulkSpaceIds('A,A,A');
  assert.deepEqual(actual.ids, ['A', 'A', 'A']);
  assert.equal(actual.uniqueCount, 1);
});

test('preserves input order, which the coinMeta log follows', () => {
  const actual = parseBulkSpaceIds('B,A,B');
  assert.deepEqual(actual.ids, ['B', 'A', 'B']);
});

test('reports which ids repeat and how often', () => {
  const actual = parseBulkSpaceIds('A,B,A,C,B,A');
  assert.equal(actual.uniqueCount, 3);
  assert.deepEqual(actual.repeated, [
    { id: 'A', count: 3 },
    { id: 'B', count: 2 },
  ]);
});

test('a retry paste is visible rather than silently doubled', () => {
  // The original batch, with the two that failed pasted back on the end.
  const actual = parseBulkSpaceIds('A,B,C,B,C');
  assert.equal(actual.ids.length, 5);
  assert.equal(actual.uniqueCount, 3);
  assert.equal(describeRepeats(actual.repeated), 'B 2회, C 2회');
});

test('an empty input yields nothing to confirm', () => {
  const actual = parseBulkSpaceIds('  ,  ,');
  assert.deepEqual(actual.ids, []);
  assert.equal(actual.uniqueCount, 0);
  assert.deepEqual(actual.repeated, []);
});

test('describeRepeats is empty when nothing repeats', () => {
  assert.equal(describeRepeats([]), '');
});
