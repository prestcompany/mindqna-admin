import assert from 'node:assert/strict';
import test from 'node:test';

import type { StatsMetric } from '@/client/stats';
import {
  addDraft,
  draftError,
  hasDraftErrors,
  initialQueryState,
  removeDraft,
  toConditions,
  updateDraft,
} from './query-state';

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

const isActive: StatsMetric = { key: 'isActive', label: '활성 여부', kind: 'boolean', operators: ['eq'] };
const createdAt: StatsMetric = { key: 'createdAt', label: '생성일', kind: 'date', operators: ['gte', 'lt', 'between'] };

test('a boolean draft rejects anything that is not true or false', () => {
  // "True" used to cast to false, so the query silently asked the opposite.
  const draft = { id: 'a', metric: 'isActive', op: 'eq' as const, value: 'True' };
  assert.equal(draftError(draft, isActive), 'true 또는 false를 입력하세요.');
});

test('a boolean draft accepts the two literals', () => {
  for (const value of ['true', 'false']) {
    assert.equal(draftError({ id: 'a', metric: 'isActive', op: 'eq' as const, value }, isActive), null);
  }
});

test('a malformed date is reported rather than sent', () => {
  const draft = { id: 'a', metric: 'createdAt', op: 'gte' as const, value: '2026-99' };
  assert.match(draftError(draft, createdAt) ?? '', /날짜 형식/);
  assert.equal(toConditions([draft], [createdAt]).length, 0);
});

test('a reversed date range is reported', () => {
  const draft = { id: 'a', metric: 'createdAt', op: 'between' as const, value: '2026-01-01, 2025-01-01' };
  assert.equal(draftError(draft, createdAt), '구간의 시작이 끝보다 큽니다.');
});

test('a well-formed date range passes', () => {
  const draft = { id: 'a', metric: 'createdAt', op: 'between' as const, value: '2025-01-01, 2026-01-01' };
  assert.equal(draftError(draft, createdAt), null);
});

test('hasDraftErrors sees a typo that toConditions would silently drop', () => {
  // The filter is dropped from the payload, so without this the count comes back
  // unfiltered and nothing on screen says the filter was ignored.
  let state = addDraft(initialQueryState('space'), 'filters', locale);
  state = updateDraft(state, 'filters', state.filters[0].id, { value: 'kr' });
  assert.equal(toConditions(state.filters, metrics).length, 0);
  assert.equal(hasDraftErrors(state.filters, metrics), true);
});

test('hasDraftErrors ignores an untouched row', () => {
  const state = addDraft(initialQueryState('space'), 'filters', locale);
  assert.equal(hasDraftErrors(state.filters, metrics), false);
});

for (const input of ['2026', '2026-01', 'Jan 31 2026', 'March 5, 2026', '1/31/2026', '2026-02-30', '0']) {
  test(`a date draft rejects ${input}, which Date.parse would have accepted`, () => {
    const draft = { id: 'a', metric: 'createdAt', op: 'gte' as const, value: input };
    assert.notEqual(draftError(draft, createdAt), null);
    assert.equal(toConditions([draft], [createdAt]).length, 0);
  });
}

test('the client and the server agree on what a date is', () => {
  // The panel must not block something the route accepts, or pass something it
  // rejects; both sides share the same YYYY-MM-DD[ HH:MM[:SS]] rule.
  for (const value of ['2026-01-31', '2026-01-31 09:00', '2026-01-31T09:00:00']) {
    assert.equal(draftError({ id: 'a', metric: 'createdAt', op: 'gte' as const, value }, createdAt), null);
  }
});

test('a date range still serialises both bounds as text the server parses', () => {
  const draft = { id: 'a', metric: 'createdAt', op: 'between' as const, value: '2026-01-01, 2026-01-31' };
  const [condition] = toConditions([draft], [createdAt]);
  assert.deepEqual(condition.value, ['2026-01-01', '2026-01-31']);
});

for (const input of ['2026-01-31 00:99', '2026-01-31 24:00', '0100-01-01', '9999-12-31']) {
  test(`a date draft rejects ${input}, outside the grammar the server accepts`, () => {
    assert.notEqual(draftError({ id: 'a', metric: 'createdAt', op: 'gte' as const, value: input }, createdAt), null);
  });
}

test('a leap day is judged by the calendar, not by a special case', () => {
  assert.equal(draftError({ id: 'a', metric: 'createdAt', op: 'gte' as const, value: '2024-02-29' }, createdAt), null);
  assert.notEqual(draftError({ id: 'a', metric: 'createdAt', op: 'gte' as const, value: '2026-02-29' }, createdAt), null);
});

test('an added-but-empty row is distinguishable from no row at all', () => {
  // toConditions drops both, so the panel has to read state.buckets to tell them
  // apart - otherwise it tells someone who just added a row to add a row.
  const empty = initialQueryState('space');
  const added = addDraft(empty, 'buckets', cardCount);

  assert.equal(toConditions(empty.buckets, metrics).length, 0);
  assert.equal(toConditions(added.buckets, metrics).length, 0);

  assert.equal(empty.buckets.length, 0);
  assert.equal(added.buckets.length, 1);
});

test('a row stops being dropped once it has a value', () => {
  let state = addDraft(initialQueryState('space'), 'buckets', cardCount);
  assert.equal(toConditions(state.buckets, metrics).length, 0);
  state = updateDraft(state, 'buckets', state.buckets[0].id, { value: '20' });
  assert.equal(toConditions(state.buckets, metrics).length, 1);
});
