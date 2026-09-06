import assert from 'node:assert/strict';
import test from 'node:test';

import type { StatsMetric } from '@/client/stats';
import { addDraft, draftError, initialQueryState, removeDraft, toConditions, updateDraft } from './query-state';

const cardCount: StatsMetric = {
  key: 'cardCount',
  label: '질문 수',
  kind: 'number',
  operators: ['gte', 'lt', 'eq', 'between'],
};

const locale: StatsMetric = {
  key: 'locale',
  label: '공간 언어',
  kind: 'enum',
  operators: ['in', 'eq'],
  enumValues: ['ko', 'en'],
};

const metrics = [cardCount, locale];

test('a fresh state has no conditions in either lane', () => {
  const state = initialQueryState('space');
  assert.equal(state.entity, 'space');
  assert.equal(state.filters.length, 0);
  assert.equal(state.buckets.length, 0);
});

test('adding a draft picks the metric first supported operator', () => {
  const state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  assert.equal(state.buckets.length, 1);
  assert.equal(state.buckets[0].metric, 'cardCount');
  assert.equal(state.buckets[0].op, 'gte');
});

test('drafts in the two lanes do not share ids', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  state = addDraft(state, 'filters', locale);
  assert.notEqual(state.buckets[0].id, state.filters[0].id);
});

test('removing a draft leaves the other lane alone', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  state = addDraft(state, 'filters', locale);
  state = removeDraft(state, 'buckets', state.buckets[0].id);
  assert.equal(state.buckets.length, 0);
  assert.equal(state.filters.length, 1);
});

test('updating a draft replaces only the named fields', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  state = updateDraft(state, 'buckets', state.buckets[0].id, { value: '20' });
  assert.equal(state.buckets[0].value, '20');
  assert.equal(state.buckets[0].op, 'gte');
});

test('a numeric draft serialises to a number, not a string', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  state = updateDraft(state, 'buckets', state.buckets[0].id, { value: '20' });
  const [condition] = toConditions(state.buckets, metrics);
  assert.equal(condition.value, 20);
  assert.equal(typeof condition.value, 'number');
});

test('a range draft serialises to a pair of numbers', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  state = updateDraft(state, 'buckets', state.buckets[0].id, { op: 'between', value: '10,19' });
  const [condition] = toConditions(state.buckets, metrics);
  assert.deepEqual(condition.value, [10, 19]);
});

test('an enum in-draft serialises to an array', () => {
  let state = addDraft(initialQueryState('space'), 'filters', locale);
  state = updateDraft(state, 'filters', state.filters[0].id, { value: 'ko,en' });
  const [condition] = toConditions(state.filters, metrics);
  assert.deepEqual(condition.value, ['ko', 'en']);
});

test('an empty draft is skipped rather than sent as a blank condition', () => {
  const state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  assert.equal(toConditions(state.buckets, metrics).length, 0);
});

test('a draft that fails validation is not sent', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  state = updateDraft(state, 'buckets', state.buckets[0].id, { value: 'twenty' });
  assert.equal(toConditions(state.buckets, metrics).length, 0);
});

test('a non-numeric value on a number metric is reported', () => {
  const draft = { id: 'a', metric: 'cardCount', op: 'gte' as const, value: 'twenty' };
  assert.equal(draftError(draft, cardCount), '숫자를 입력하세요.');
});

test('a reversed range is reported', () => {
  const draft = { id: 'a', metric: 'cardCount', op: 'between' as const, value: '20,10' };
  assert.equal(draftError(draft, cardCount), '구간의 시작이 끝보다 큽니다.');
});

test('an enum value outside the declared set is reported', () => {
  const draft = { id: 'a', metric: 'locale', op: 'in' as const, value: 'ko,xx' };
  assert.equal(draftError(draft, locale), '허용되지 않는 값입니다: xx');
});

test('a valid draft reports no error', () => {
  const draft = { id: 'a', metric: 'cardCount', op: 'gte' as const, value: '20' };
  assert.equal(draftError(draft, cardCount), null);
});
