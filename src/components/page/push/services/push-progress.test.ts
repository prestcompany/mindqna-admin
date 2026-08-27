import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeProgress,
  estimateCampaignDurationMs,
  estimateDurationMs,
  estimateRemainingMs,
  formatMinuteRange,
  minutes,
} from './push-progress';

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

test('a campaign is timed by its queue, not by FCM', () => {
  // 16,342 people at 2,000 a row is nine rows, and the sender claims one a minute. The
  // eight-minute wait is the whole answer; the last row's own draining is seconds.
  const { rows, minMs, maxMs } = estimateCampaignDurationMs(16_342, 2_000);
  assert.equal(rows, 9);
  assert.equal(minMs, 8 * 60_000 + 4 * 1_000);
  assert.equal(maxMs, 8 * 60_000 + 4 * 3_000);
  assert.equal(minutes(minMs), 8);
});

test('a campaign that fits one row is not charged a queue wait', () => {
  const { rows, minMs } = estimateCampaignDurationMs(500, 2_000);
  assert.equal(rows, 1);
  assert.equal(minMs, estimateDurationMs(500).minMs);
});

test('the campaign estimate never undercuts the single-send estimate', () => {
  // The bug this replaces: 16,342 people reported as one or two minutes.
  const plain = estimateDurationMs(16_342);
  const campaign = estimateCampaignDurationMs(16_342, 2_000);
  assert.ok(campaign.minMs > plain.maxMs);
});

test('an empty audience still reads as one row rather than zero', () => {
  assert.equal(estimateCampaignDurationMs(0, 2_000).rows, 1);
});

test('a range that rounds to one minute is said once', () => {
  assert.equal(formatMinuteRange(8 * 60_000 + 4_000, 8 * 60_000 + 12_000), '8분');
  assert.equal(formatMinuteRange(60_000, 3 * 60_000), '1~3분');
});
