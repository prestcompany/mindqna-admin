import assert from 'node:assert/strict';
import test from 'node:test';

import type { BookOrderValidation } from '../../../../client/types';
import { resolvePaidQuestionCount } from './resolve-paid-question-count';

const MULTIPLE = { code: 'PAID_COUNT_MULTIPLE' as const, message: '질문 수 옵션이 여러 개 선택되었습니다. 고객 확인 후 하나를 골라 주세요.' };

function buildOrder(overrides: Partial<BookOrderValidation> = {}): BookOrderValidation {
  return {
    orderNo: 'A-1',
    orderedAt: '',
    spaceId: 'ABCD1234',
    rangeRaw: '1-52',
    startOrder: 1,
    endOrder: 52,
    exportEnd: 52,
    paidQuestionCount: null,
    paidQuestionCandidates: [52, 150],
    answeredCount: 52,
    coverColor: '브라운',
    paidInner: '',
    recordPackage: '',
    spaceName: '우리',
    locale: 'ko',
    level: 'error',
    issues: [MULTIPLE],
    ...overrides,
  };
}

test('picking the count that matches the range clears the block and makes the order ok', () => {
  const actual = resolvePaidQuestionCount(buildOrder(), 52);
  assert.equal(actual.paidQuestionCount, 52);
  assert.deepEqual(actual.issues, []);
  assert.equal(actual.level, 'ok');
  assert.deepEqual(actual.paidQuestionCandidates, [52, 150]);
});

test('picking a count that differs from the range leaves a mismatch warning', () => {
  const actual = resolvePaidQuestionCount(buildOrder(), 150);
  assert.deepEqual(
    actual.issues.map((issue) => issue.code),
    ['PAID_COUNT_MISMATCH'],
  );
  assert.equal(actual.level, 'warning');
});

test('another error keeps the order blocked', () => {
  const order = buildOrder({ issues: [{ code: 'SPACE_NOT_FOUND', message: '존재하지 않는 공간 ID입니다.' }, MULTIPLE] });
  const actual = resolvePaidQuestionCount(order, 52);
  assert.equal(actual.level, 'error');
  assert.deepEqual(
    actual.issues.map((issue) => issue.code),
    ['SPACE_NOT_FOUND'],
  );
});

test('re-picking never duplicates the mismatch warning', () => {
  const once = resolvePaidQuestionCount(buildOrder(), 150);
  const twice = resolvePaidQuestionCount(once, 30);
  assert.equal(twice.issues.filter((issue) => issue.code === 'PAID_COUNT_MISMATCH').length, 1);
});
