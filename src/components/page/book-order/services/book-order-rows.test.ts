import assert from 'node:assert/strict';
import test from 'node:test';

import { toBookOrderRows } from './book-order-rows';
import { toggleVisibleSelection } from './book-export-download';

test('assigns separate stable keys to identical order rows before filtering', () => {
  const input = { orderNo: 'A-1' };
  const rows = toBookOrderRows([input, input]);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].rowKey, rows[1].rowKey);
  assert.deepEqual(rows.map((row) => row.orderNo), ['A-1', 'A-1']);
  const selected = toggleVisibleSelection({
    selected: new Set(rows.map((row) => row.rowKey)),
    visibleSelectable: [rows[1].rowKey],
    checked: false,
  });
  assert.deepEqual(Array.from(selected), [rows[0].rowKey]);
  assert.equal('rowKey' in input, false);
});
