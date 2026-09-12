import assert from 'node:assert/strict';
import test from 'node:test';

import type { StatsMetric } from '@/client/stats';
import {
  acceptsMoreValues,
  addSub,
  addValue,
  blockedReason,
  describeValue,
  draftError,
  findDraft,
  initialQueryState,
  MAIN_ID,
  removeSub,
  removeValue,
  retarget,
  seedMain,
  setOperator,
  toBuckets,
  toFilters,
  type QueryState,
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

const isActive: StatsMetric = { key: 'isActive', label: '활성 여부', kind: 'boolean', operators: ['eq'] };
const createdAt: StatsMetric = { key: 'createdAt', label: '생성일', kind: 'date', operators: ['gte', 'lt', 'between'] };

const metrics = [cardCount, locale, isActive, createdAt];

/** A state with the main condition seeded and the given values on it. */
function withMain(metric: StatsMetric, op: StatsMetric['operators'][number], values: string[]): QueryState {
  let state = seedMain(initialQueryState('space'), metric);
  state = setOperator(state, MAIN_ID, op);
  for (const value of values) state = addValue(state, MAIN_ID, value);
  return state;
}

test('a fresh state has no main condition until the catalog arrives', () => {
  const state = initialQueryState('space');
  assert.equal(state.entity, 'space');
  assert.equal(state.main, null);
  assert.equal(state.subs.length, 0);
});

test('seeding the main condition picks the metric first operator', () => {
  const state = seedMain(initialQueryState('space'), cardCount);
  assert.equal(state.main?.metric, 'cardCount');
  assert.equal(state.main?.op, 'gte');
  assert.deepEqual(state.main?.values, []);
});

test('seeding never overwrites a main condition the operator already edited', () => {
  const edited = addValue(seedMain(initialQueryState('space'), cardCount), MAIN_ID, '20');
  const again = seedMain(edited, locale);
  assert.equal(again.main?.metric, 'cardCount');
  assert.deepEqual(again.main?.values, ['20']);
});

test('seeding with no catalog leaves the state alone', () => {
  const state = seedMain(initialQueryState('space'), undefined);
  assert.equal(state.main, null);
});

test('sub ids never collide with the main id, so one id addresses both', () => {
  let state = seedMain(initialQueryState('space'), cardCount);
  state = addSub(state, locale);
  state = addSub(state, locale);
  const ids = [state.main!.id, ...state.subs.map((sub) => sub.id)];
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter((id) => id === MAIN_ID).length, 1);
});

test('removing a sub leaves the main condition alone', () => {
  let state = addSub(seedMain(initialQueryState('space'), cardCount), locale);
  state = addValue(state, MAIN_ID, '20');
  state = removeSub(state, state.subs[0].id);
  assert.equal(state.subs.length, 0);
  assert.deepEqual(state.main?.values, ['20']);
});

test('a value is trimmed, and an empty one is not a chip', () => {
  let state = withMain(cardCount, 'gte', [' 20 ']);
  assert.deepEqual(state.main?.values, ['20']);
  state = addValue(state, MAIN_ID, '   ');
  assert.deepEqual(state.main?.values, ['20']);
});

test('a repeated value is dropped, because it would return two identical rows', () => {
  const state = withMain(cardCount, 'gte', ['20', '20']);
  assert.deepEqual(state.main?.values, ['20']);
});

test('removing a value takes the one at that position', () => {
  let state = withMain(cardCount, 'gte', ['20', '50', '100']);
  state = removeValue(state, MAIN_ID, 1);
  assert.deepEqual(state.main?.values, ['20', '100']);
});

test('changing the metric drops the values collected under the old one', () => {
  let state = withMain(cardCount, 'gte', ['20', '50']);
  state = retarget(state, MAIN_ID, locale);
  assert.equal(state.main?.metric, 'locale');
  assert.equal(state.main?.op, 'in');
  assert.deepEqual(state.main?.values, []);
});

test('changing the operator drops them too - 20 under 이상 is not 20 under 구간', () => {
  let state = withMain(cardCount, 'gte', ['20']);
  state = setOperator(state, MAIN_ID, 'between');
  assert.deepEqual(state.main?.values, []);
});

test('findDraft reaches the main condition and the subs alike', () => {
  const state = addSub(seedMain(initialQueryState('space'), cardCount), locale);
  assert.equal(findDraft(state, MAIN_ID)?.metric, 'cardCount');
  assert.equal(findDraft(state, state.subs[0].id)?.metric, 'locale');
  assert.equal(findDraft(state, 'nope'), undefined);
});

test('the main condition always takes another value; a sub takes one unless it is 포함', () => {
  const main = withMain(cardCount, 'gte', ['20']).main!;
  assert.equal(acceptsMoreValues(main, true), true);
  assert.equal(acceptsMoreValues(main, false), false);

  let state = addSub(initialQueryState('space'), locale);
  state = addValue(state, state.subs[0].id, 'ko');
  // "20 이상 또는 50 이상" is just "20 이상", so only a list operator takes more.
  assert.equal(acceptsMoreValues(state.subs[0], false), true);
});

test('every main value becomes its own bucket', () => {
  const state = withMain(cardCount, 'gte', ['20', '50', '100']);
  assert.deepEqual(toBuckets(state, metrics), [
    { metric: 'cardCount', op: 'gte', value: 20 },
    { metric: 'cardCount', op: 'gte', value: 50 },
    { metric: 'cardCount', op: 'gte', value: 100 },
  ]);
});

test('a numeric bucket carries a number, not the typed string', () => {
  const [bucket] = toBuckets(withMain(cardCount, 'gte', ['20']), metrics);
  assert.equal(typeof bucket.value, 'number');
});

test('a main 포함 value asks about that value alone, so it is a one-item list', () => {
  const state = withMain(locale, 'in', ['ko', 'en']);
  assert.deepEqual(toBuckets(state, metrics), [
    { metric: 'locale', op: 'in', value: ['ko'] },
    { metric: 'locale', op: 'in', value: ['en'] },
  ]);
});

test('a between value carries both bounds as a pair', () => {
  const state = withMain(cardCount, 'between', ['10, 19']);
  assert.deepEqual(toBuckets(state, metrics), [{ metric: 'cardCount', op: 'between', value: [10, 19] }]);
});

test('a sub collapses to one condition, and 포함 keeps its whole list', () => {
  let state = withMain(cardCount, 'gte', ['20']);
  state = addSub(state, locale);
  state = addValue(state, state.subs[0].id, 'ko');
  state = addValue(state, state.subs[0].id, 'en');
  assert.deepEqual(toFilters(state, metrics), [{ metric: 'locale', op: 'in', value: ['ko', 'en'] }]);
});

test('a sub with a single-value operator sends only its one value', () => {
  let state = withMain(cardCount, 'gte', ['20']);
  state = addSub(state, isActive);
  state = addValue(state, state.subs[0].id, 'true');
  assert.deepEqual(toFilters(state, metrics), [{ metric: 'isActive', op: 'eq', value: true }]);
});

test('an untouched sub is skipped rather than sent as a blank condition', () => {
  const state = addSub(withMain(cardCount, 'gte', ['20']), locale);
  assert.equal(toFilters(state, metrics).length, 0);
});

test('a sub that fails validation is not sent', () => {
  let state = addSub(withMain(cardCount, 'gte', ['20']), locale);
  state = addValue(state, state.subs[0].id, 'kr');
  assert.equal(toFilters(state, metrics).length, 0);
  // ...and the panel says so rather than quietly answering a wider question.
  assert.equal(blockedReason(state, metrics), '허용되지 않는 값입니다: kr');
});

test('a main condition that fails validation sends no buckets at all', () => {
  const state = withMain(cardCount, 'gte', ['twenty']);
  assert.equal(toBuckets(state, metrics).length, 0);
  assert.equal(blockedReason(state, metrics), '숫자를 입력하세요.');
});

test('no values on the main condition blocks the query and says which', () => {
  const state = seedMain(initialQueryState('space'), cardCount);
  assert.equal(blockedReason(state, metrics), '메인조건의 값을 입력하세요.');
});

test('an empty sub blocks the query and counts itself', () => {
  let state = addSub(withMain(cardCount, 'gte', ['20']), locale);
  state = addSub(state, isActive);
  assert.equal(blockedReason(state, metrics), '값이 비어 있는 서브조건 2개의 값을 입력하세요.');
});

test('a complete query is not blocked', () => {
  let state = withMain(cardCount, 'gte', ['20', '50']);
  state = addSub(state, locale);
  state = addValue(state, state.subs[0].id, 'ko');
  assert.equal(blockedReason(state, metrics), null);
});

test('the catalog has to arrive before anything can be asked', () => {
  assert.equal(blockedReason(initialQueryState('space'), []), '지표 목록을 불러오는 중입니다.');
});

test('a non-numeric value on a number metric is reported', () => {
  const draft = { id: MAIN_ID, metric: 'cardCount', op: 'gte' as const, values: ['twenty'] };
  assert.equal(draftError(draft, cardCount), '숫자를 입력하세요.');
});

test('an empty string is not a number, whatever Number() says about it', () => {
  const draft = { id: MAIN_ID, metric: 'cardCount', op: 'gte' as const, values: [''] };
  assert.equal(draftError(draft, cardCount), '숫자를 입력하세요.');
});

test('a reversed range is reported', () => {
  const draft = { id: MAIN_ID, metric: 'cardCount', op: 'between' as const, values: ['20, 10'] };
  assert.equal(draftError(draft, cardCount), '구간의 시작이 끝보다 큽니다.');
});

test('a half-entered range is reported', () => {
  const draft = { id: MAIN_ID, metric: 'cardCount', op: 'between' as const, values: ['20'] };
  assert.equal(draftError(draft, cardCount), '구간의 시작과 끝을 모두 입력하세요.');
});

test('a boolean rejects anything that is not true or false', () => {
  // "True" used to cast to false, so the query silently asked the opposite.
  const draft = { id: MAIN_ID, metric: 'isActive', op: 'eq' as const, values: ['True'] };
  assert.equal(draftError(draft, isActive), 'true 또는 false를 입력하세요.');
});

test('an enum value outside the declared set is reported', () => {
  const draft = { id: MAIN_ID, metric: 'locale', op: 'in' as const, values: ['ko', 'xx'] };
  assert.equal(draftError(draft, locale), '허용되지 않는 값입니다: xx');
});

test('no values is not an error yet, just nothing to ask', () => {
  const draft = { id: MAIN_ID, metric: 'cardCount', op: 'gte' as const, values: [] };
  assert.equal(draftError(draft, cardCount), null);
});

for (const input of ['2026', '2026-01', 'Jan 31 2026', 'March 5, 2026', '1/31/2026', '2026-02-30', '0']) {
  test(`a date rejects ${input}, which Date.parse would have accepted`, () => {
    const draft = { id: MAIN_ID, metric: 'createdAt', op: 'gte' as const, values: [input] };
    assert.notEqual(draftError(draft, createdAt), null);
  });
}

for (const input of ['2026-01-31 00:99', '2026-01-31 24:00', '0100-01-01', '9999-12-31']) {
  test(`a date rejects ${input}, outside the grammar the server accepts`, () => {
    const draft = { id: MAIN_ID, metric: 'createdAt', op: 'gte' as const, values: [input] };
    assert.notEqual(draftError(draft, createdAt), null);
  });
}

test('the client and the server agree on what a date is', () => {
  // The panel must not block something the route accepts, or pass something it
  // rejects; both sides share the same YYYY-MM-DD[ HH:MM[:SS]] rule.
  for (const value of ['2026-01-31', '2026-01-31 09:00', '2026-01-31T09:00:00']) {
    const draft = { id: MAIN_ID, metric: 'createdAt', op: 'gte' as const, values: [value] };
    assert.equal(draftError(draft, createdAt), null);
  }
});

test('a leap day is judged by the calendar, not by a special case', () => {
  const leap = { id: MAIN_ID, metric: 'createdAt', op: 'gte' as const, values: ['2024-02-29'] };
  const notLeap = { id: MAIN_ID, metric: 'createdAt', op: 'gte' as const, values: ['2026-02-29'] };
  assert.equal(draftError(leap, createdAt), null);
  assert.notEqual(draftError(notLeap, createdAt), null);
});

test('a date range still serialises both bounds as text the server parses', () => {
  const state = withMain(createdAt, 'between', ['2026-01-01, 2026-01-31']);
  assert.deepEqual(toBuckets(state, metrics), [
    { metric: 'createdAt', op: 'between', value: ['2026-01-01', '2026-01-31'] },
  ]);
});

test('a range chip reads as a range, not as the comma-separated pair it stores', () => {
  const draft = { id: MAIN_ID, metric: 'cardCount', op: 'between' as const, values: ['10, 19'] };
  assert.equal(describeValue(draft, cardCount, '10, 19'), '10 ~ 19');
});

test('a boolean chip reads in Korean rather than as a literal', () => {
  const draft = { id: MAIN_ID, metric: 'isActive', op: 'eq' as const, values: ['true'] };
  assert.equal(describeValue(draft, isActive, 'true'), '예');
  assert.equal(describeValue(draft, isActive, 'false'), '아니오');
});
