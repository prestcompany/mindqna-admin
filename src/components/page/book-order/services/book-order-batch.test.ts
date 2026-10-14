import assert from 'node:assert/strict';
import test from 'node:test';

import type { BookOrderBatchItem, BookOrderValidation } from '../../../../client/types';
import { batchItemToExportRequest, buildBatchZipName, canConfirmBatch, toBatchRequestOrder } from './book-order-batch';
import { toBookOrderRows } from './book-order-rows';
import { resolvePaidQuestionCount } from './resolve-paid-question-count';

const VALIDATION: BookOrderValidation = {
  orderNo: 'A-1',
  orderedAt: '2026-09-30 14:36',
  spaceId: 'ABCD1234',
  rangeRaw: '1-30',
  startOrder: 1,
  endOrder: 30,
  exportEnd: 29,
  paidQuestionCount: 30,
  paidQuestionCandidates: [30],
  answeredCount: 29,
  coverColor: '브라운',
  paidInner: '선택 안함',
  recordPackage: 'A세트',
  spaceName: '우리',
  locale: 'ko',
  level: 'warning',
  issues: [],
};

test('maps a validated order to a confirm request with the requested range and confirm-time fields', () => {
  assert.deepEqual(toBatchRequestOrder(VALIDATION), {
    orderNo: 'A-1',
    quantity: 1,
    orderedAt: '2026-09-30 14:36',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    recordPackage: 'A세트',
    paidQuestionCount: 30,
  });
});

test('refuses to map an order without a parsed range', () => {
  assert.throws(() => toBatchRequestOrder({ ...VALIDATION, startOrder: null }));
});

test('same-number items preserve their own options and question-count choice in confirm requests', () => {
  const rows = toBookOrderRows([
    { ...VALIDATION, quantity: 2, paidQuestionCandidates: [30, 50] },
    { ...VALIDATION, coverColor: '핑크', paidInner: '친구', recordPackage: 'B세트' },
  ]);
  const first = resolvePaidQuestionCount(rows[0], 50);
  const requests = [first, rows[1]].map(toBatchRequestOrder);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map((order) => order.orderNo), ['A-1', 'A-1']);
  assert.deepEqual(requests.map((order) => order.coverColor), ['브라운', '핑크']);
  assert.deepEqual(requests.map((order) => order.paidInner), ['선택 안함', '친구']);
  assert.deepEqual(requests.map((order) => order.recordPackage), ['A세트', 'B세트']);
  assert.deepEqual(requests.map((order) => order.paidQuestionCount), [50, 30]);
  assert.deepEqual(requests.map((order) => order.quantity), [2, 1]);
  assert.equal('rowKey' in requests[0], false);
});

test('maps a stored batch item back to a books request using the requested range', () => {
  const item: BookOrderBatchItem = {
    orderNo: 'A-1',
    quantity: 2,
    orderedAt: '2026-09-30 14:36',
    spaceId: 'ABCD1234',
    spaceName: '우리',
    startOrder: 1,
    endOrder: 30,
    exportEnd: 29,
    answeredCount: 29,
    paidQuestionCount: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    recordPackage: 'A세트',
    level: 'warning',
    issues: [],
  };
  assert.deepEqual(batchItemToExportRequest(item), {
    orderNo: 'A-1',
    quantity: 2,
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    paidQuestionCount: 30,
    recordPackage: 'A세트',
  });
});

test('names the zip with the batch number and local time', () => {
  assert.equal(buildBatchZipName(12, new Date(2026, 9, 1, 9, 5)), 'mindbridge-books-batch-12-20261001-0905.zip');
});

test('allows confirming only with a 1-50 character manager name, a selection, and nothing running', () => {
  assert.equal(canConfirmBatch({ managerName: '김담당', selectedCount: 1, isBusy: false }), true);
  assert.equal(canConfirmBatch({ managerName: '   ', selectedCount: 1, isBusy: false }), false);
  assert.equal(canConfirmBatch({ managerName: 'x'.repeat(51), selectedCount: 1, isBusy: false }), false);
  assert.equal(canConfirmBatch({ managerName: '김담당', selectedCount: 0, isBusy: false }), false);
  assert.equal(canConfirmBatch({ managerName: '김담당', selectedCount: 1, isBusy: true }), false);
});
