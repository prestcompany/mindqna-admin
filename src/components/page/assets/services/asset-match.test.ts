import assert from 'node:assert/strict';
import test from 'node:test';
import { isPickedAsset } from './asset-match';

const asset = { id: 10, uri: 'https://cdn.example/2026-11-01/img_a.png' };

test('the library row itself is picked', () => {
  assert.equal(isPickedAsset({ id: 10, uri: asset.uri }, asset), true);
});

test("an item's own image row with the same uri counts as the picked asset", () => {
  assert.equal(isPickedAsset({ id: 501, uri: asset.uri }, asset), true);
});

test('a different image, an empty uri or nothing picked is not', () => {
  assert.equal(isPickedAsset({ id: 501, uri: 'https://cdn.example/2026-11-01/img_b.png' }, asset), false);
  assert.equal(isPickedAsset({ id: 501, uri: '' }, { id: 11, uri: '' }), false);
  assert.equal(isPickedAsset(undefined, asset), false);
});
