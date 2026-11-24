import assert from 'node:assert/strict';
import { test } from 'node:test';
import { needsRefresh, REFRESH_MARGIN_MS } from './token-refresh';

const now = 1_800_000_000_000;
const exp = (msFromNow: number) => (now + msFromNow) / 1000;

test('a token is refreshed from one minute before it expires', () => {
  assert.equal(REFRESH_MARGIN_MS, 60_000);
  assert.equal(needsRefresh(exp(10 * 60_000), now), false);
  assert.equal(needsRefresh(exp(60_001), now), false);
  assert.equal(needsRefresh(exp(60_000), now), true);
  assert.equal(needsRefresh(exp(30_000), now), true);
  assert.equal(needsRefresh(exp(-1), now), true);
});
