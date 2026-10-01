import assert from 'node:assert/strict';
import test from 'node:test';

import type { BookOrderBatchItem, BookOrderValidation } from '../../../../client/types';
import {
  batchItemToExportRequest,
  buildBatchZipName,
  canConfirmBatch,
  toBatchRequestOrder,
} from './book-order-batch';

const VALIDATION: BookOrderValidation = {
  orderNo: 'A-1',
  orderedAt: '2026-09-30 14:36',
  spaceId: 'ABCD1234',
  rangeRaw: '1-30',
  startOrder: 1,
  endOrder: 30,
  exportEnd: 29,
  paidQuestionCount: 30,
  answeredCount: 29,
  coverColor: '브라운',
  paidInner: '선택 안함',
  spaceName: '우리',
  locale: 'ko',
  level: 'warning',
  issues: [],
};

test('maps a validated order to a confirm request with the requested range and confirm-time fields', () => {
  assert.deepEqual(toBatchRequestOrder(VALIDATION), {
    orderNo: 'A-1',
    orderedAt: '2026-09-30 14:36',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    paidQuestionCount: 30,
  });
});

test('refuses to map an order without a parsed range', () => {
  assert.throws(() => toBatchRequestOrder({ ...VALIDATION, startOrder: null }));
});

test('maps a stored batch item back to a books request using the requested range', () => {
  const item: BookOrderBatchItem = {
    orderNo: 'A-1',
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
    level: 'warning',
    issues: [],
  };
  assert.deepEqual(batchItemToExportRequest(item), {
    orderNo: 'A-1',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
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
