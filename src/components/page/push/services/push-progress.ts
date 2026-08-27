const BATCH_SIZE = 500;
/** Observed range for one 500-token multicast; see spec §2.7. */
const MS_PER_BATCH_MIN = 1_000;
const MS_PER_BATCH_MAX = 3_000;

export function computeProgress(input: {
  sentCount: number;
  failedCount: number;
  targetCount: number | null;
}): { ratio: number | null; percent: number | null; doneRatio: number | null } {
  const { sentCount, failedCount, targetCount } = input;
  if (targetCount === null) return { ratio: null, percent: null, doneRatio: null };
  if (targetCount === 0) return { ratio: 0, percent: 0, doneRatio: 0 };

  // The percentage counts deliveries, not attempts. Counting failures as progress made a
  // send of 5 delivered out of 6 read "5 / 6 · 100%", which says everyone got it beside a
  // number saying one did not. A broadcast target is approximate, so clamp both.
  const ratio = Math.min(1, sentCount / targetCount);
  // How much of the audience the sender has worked through, delivered or not. Only useful
  // for knowing whether a send is still moving.
  const doneRatio = Math.min(1, (sentCount + failedCount) / targetCount);
  return { ratio, percent: Math.round(ratio * 100), doneRatio };
}

export function estimateRemainingMs(input: {
  processed: number;
  targetCount: number | null;
  startedAt: string | null;
  now: Date;
}): number | null {
  const { processed, targetCount, startedAt, now } = input;
  if (!startedAt || targetCount === null || processed <= 0) return null;

  const elapsed = now.getTime() - new Date(startedAt).getTime();
  if (elapsed <= 0) return null;

  const remaining = Math.max(0, targetCount - processed);
  return Math.round((elapsed / processed) * remaining);
}

/**
 * Shown before the send is created. A broadcast is tens of minutes, and an operator who
 * does not know that reads the wait as a failure.
 */
export function estimateDurationMs(targetCount: number): { minMs: number; maxMs: number } {
  const batches = Math.ceil(targetCount / BATCH_SIZE);
  return { minMs: batches * MS_PER_BATCH_MIN, maxMs: batches * MS_PER_BATCH_MAX };
}

/** The sender claims one row per cron tick, and the cron ticks once a minute. */
const MS_PER_ROW_TICK = 60_000;

/**
 * A filtered campaign is not one send; it is as many per-user sends as the audience needed
 * rows, and the sender takes one row per minute. So the wait is dominated by the queue, not
 * by FCM: 16,000 people is nine rows and roughly nine minutes, where estimateDurationMs
 * alone would say one or two and leave the operator watching 2/9 wondering what broke.
 */
export function estimateCampaignDurationMs(
  targetCount: number,
  chunkSize: number,
): { minMs: number; maxMs: number; rows: number } {
  const rows = Math.max(1, Math.ceil(targetCount / chunkSize));
  // Every row but the last is bounded by the wait for its tick, not by its own draining.
  const queued = (rows - 1) * MS_PER_ROW_TICK;
  const lastRow = estimateDurationMs(Math.min(targetCount, chunkSize));
  return { minMs: queued + lastRow.minMs, maxMs: queued + lastRow.maxMs, rows };
}

/** "8~8분" reads as a mistake; when the bounds round to the same minute, say it once. */
export function formatMinuteRange(minMs: number, maxMs: number): string {
  const lo = minutes(minMs);
  const hi = minutes(maxMs);
  return lo === hi ? `${lo}분` : `${lo}~${hi}분`;
}

/** Rounds up to a whole minute, and never down to zero — "0분" would read as instant. */
export function minutes(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}
