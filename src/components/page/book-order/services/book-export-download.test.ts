import assert from 'node:assert/strict';
import test from 'node:test';

import type { BookOrderValidation } from '../../../../client/types';
import {
  BOOKS_PER_REQUEST,
  areAllVisibleSelected,
  buildBookZipName,
  chunkItems,
  countOrdersByLevel,
  isSelectableOrder,
  toBookExportRequest,
  toggleVisibleSelection,
} from './book-export-download';

function buildOrder(overrides: Partial<BookOrderValidation> = {}): BookOrderValidation {
  return {
    orderNo: 'A-1',
    orderedAt: '',
    spaceId: 'ABCD1234',
    rangeRaw: '1-30',
    startOrder: 1,
    endOrder: 30,
    exportEnd: 30,
    paidQuestionCount: null,
    answeredCount: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    spaceName: '우리',
    locale: 'ko',
    level: 'ok',
    issues: [],
    ...overrides,
  };
}

test('chunks 21 orders into 20 + 1 and keeps every item exactly once', () => {
  const items = Array.from({ length: 21 }, (_, i) => i);
  const chunks = chunkItems(items, BOOKS_PER_REQUEST);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [20, 1]);
  assert.deepEqual(chunks.flat(), items);
});

test('chunks an empty list into no requests', () => {
  assert.deepEqual(chunkItems([], BOOKS_PER_REQUEST), []);
});

test('only ok and warning orders are selectable', () => {
  assert.equal(isSelectableOrder(buildOrder({ level: 'ok' })), true);
  assert.equal(isSelectableOrder(buildOrder({ level: 'warning' })), true);
  assert.equal(isSelectableOrder(buildOrder({ level: 'error' })), false);
});

test('builds the books request from the requested (not trimmed) range', () => {
  assert.deepEqual(toBookExportRequest(buildOrder({ exportEnd: 28 })), {
    orderNo: 'A-1',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
  });
});

test('refuses to build a request for an order without a parsed range', () => {
  assert.throws(() => toBookExportRequest(buildOrder({ startOrder: null })));
});

test('counts orders per level', () => {
  const orders = [buildOrder(), buildOrder({ level: 'warning' }), buildOrder({ level: 'error' }), buildOrder({ level: 'error' })];
  assert.deepEqual(countOrdersByLevel(orders), { all: 4, ok: 1, warning: 1, error: 2 });
});

test('names the zip with local date and time', () => {
  assert.equal(buildBookZipName(new Date(2026, 8, 30, 9, 5)), 'mindbridge-books-20260930-0905.zip');
});

test('select-all adds only the visible selectable orders to the existing selection', () => {
  const selected = new Set(['A-1']);
  const next = toggleVisibleSelection({ selected, visibleSelectable: ['A-2', 'A-3'], checked: true });
  assert.deepEqual(Array.from(next).sort(), ['A-1', 'A-2', 'A-3']);
});

test('unselect-all removes only the visible selectable orders, keeping hidden selected rows', () => {
  const selected = new Set(['A-1', 'A-2', 'A-3']);
  const next = toggleVisibleSelection({ selected, visibleSelectable: ['A-2', 'A-3'], checked: false });
  assert.deepEqual(Array.from(next), ['A-1']);
});

test('all-visible-selected is computed over the visible selectable orders only', () => {
  const selected = new Set(['A-2', 'A-3']);
  assert.equal(areAllVisibleSelected({ selected, visibleSelectable: ['A-2', 'A-3'] }), true);
  assert.equal(areAllVisibleSelected({ selected, visibleSelectable: ['A-2', 'A-3', 'A-4'] }), false);
});

test('an empty visible-selectable set is never "all selected"', () => {
  assert.equal(areAllVisibleSelected({ selected: new Set(), visibleSelectable: [] }), false);
});
