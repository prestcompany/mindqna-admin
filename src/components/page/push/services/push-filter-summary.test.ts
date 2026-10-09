import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizePushFilter } from './push-filter-summary';

test('a range reads as min~max', () => {
  assert.equal(summarizePushFilter({ spaceTypes: ['friends'], minCardCount: 10, maxCardCount: 41 }), '친구 · 질문 10~41');
});

test('a single bound reads as open-ended on the other side', () => {
  assert.equal(summarizePushFilter({ minCardCount: 42 }), '질문 42+');
  assert.equal(summarizePushFilter({ maxCardCount: 41 }), '질문 ~41');
});

test('a zero bound is shown, not dropped', () => {
  assert.equal(summarizePushFilter({ maxCardCount: 0 }), '질문 ~0');
});

test('every condition appears in a fixed order', () => {
  assert.equal(
    summarizePushFilter({ spaceTypes: ['couple', 'family'], spaceLocales: ['ko', 'en'], minPetLevel: 5 }),
    '커플/가족 · ko/en · 펫 5+',
  );
});

test('an empty filter summarizes to nothing', () => {
  assert.equal(summarizePushFilter({}), '');
});
