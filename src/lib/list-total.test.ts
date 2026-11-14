import assert from 'node:assert/strict';
import test from 'node:test';

import { listTotal } from './list-total';

test('listTotal uses the server count when it is sent', () => {
  assert.equal(listTotal({ pageInfo: { totalPage: 1, total: 3 }, page: 1, rows: 3, pageSize: 10 }), 3);
  assert.equal(listTotal({ pageInfo: { totalPage: 3, total: 25 }, page: 1, rows: 10, pageSize: 10 }), 25);
});

test('listTotal counts the last page exactly when the server sends only pages', () => {
  assert.equal(listTotal({ pageInfo: { totalPage: 1 }, page: 1, rows: 3, pageSize: 10 }), 3);
  assert.equal(listTotal({ pageInfo: { totalPage: 3 }, page: 3, rows: 5, pageSize: 10 }), 25);
});

test('listTotal falls back to full pages before the last page', () => {
  assert.equal(listTotal({ pageInfo: { totalPage: 3 }, page: 1, rows: 10, pageSize: 10 }), 30);
});

test('listTotal is 0 for an empty list or no response yet', () => {
  assert.equal(listTotal({ pageInfo: { totalPage: 0, total: 0 }, page: 1, rows: 0, pageSize: 10 }), 0);
  assert.equal(listTotal({ pageInfo: { totalPage: 0 }, page: 1, rows: 0, pageSize: 10 }), 0);
  assert.equal(listTotal({ pageInfo: undefined, page: 1, rows: 0, pageSize: 10 }), 0);
});
