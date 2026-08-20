import assert from 'node:assert/strict';
import test from 'node:test';

import { computeProgress, estimateDurationMs, estimateRemainingMs } from './push-progress';

test('progress counts both delivered and failed as processed', () => {
  assert.deepEqual(computeProgress({ sentCount: 30, failedCount: 10, targetCount: 200 }), {
    ratio: 0.2,
    percent: 20,
  });
});

test('progress is unknown when the target is unknown', () => {
  assert.deepEqual(computeProgress({ sentCount: 30, failedCount: 0, targetCount: null }), {
    ratio: null,
    percent: null,
  });
});

test('progress never exceeds 100 percent, since the broadcast target is approximate', () => {
  assert.deepEqual(computeProgress({ sentCount: 250, failedCount: 0, targetCount: 200 }), {
    ratio: 1,
    percent: 100,
  });
});

test('progress is zero, not NaN, when the target is zero', () => {
  assert.deepEqual(computeProgress({ sentCount: 0, failedCount: 0, targetCount: 0 }), {
    ratio: 0,
    percent: 0,
  });
});

test('remaining time extrapolates from the observed rate', () => {
  // 100 processed in 60s -> 900 left -> 540s
  const remaining = estimateRemainingMs({
    processed: 100,
    targetCount: 1000,
    startedAt: '2026-08-20T12:00:00.000Z',
    now: new Date('2026-08-20T12:01:00.000Z'),
  });
  assert.equal(remaining, 540_000);
});

test('remaining time is unknown before anything has been processed', () => {
  assert.equal(
    estimateRemainingMs({
      processed: 0,
      targetCount: 1000,
      startedAt: '2026-08-20T12:00:00.000Z',
      now: new Date('2026-08-20T12:00:30.000Z'),
    }),
    null,
  );
});

test('remaining time is unknown without a start time or a target', () => {
  const now = new Date('2026-08-20T12:01:00.000Z');
  assert.equal(estimateRemainingMs({ processed: 10, targetCount: 100, startedAt: null, now }), null);
  assert.equal(
    estimateRemainingMs({ processed: 10, targetCount: null, startedAt: '2026-08-20T12:00:00.000Z', now }),
    null,
  );
});

test('the pre-send estimate brackets the real ko broadcast at 15 to 44 minutes', () => {
  // 442,953 token holders measured 2026-08-20 -> 886 batches at 1-3s each.
  const { minMs, maxMs } = estimateDurationMs(442_953);
  assert.equal(Math.round(minMs / 60_000), 15);
  assert.equal(Math.round(maxMs / 60_000), 44);
});
