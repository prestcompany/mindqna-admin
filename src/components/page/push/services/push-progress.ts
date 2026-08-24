const BATCH_SIZE = 500;
/** Observed range for one 500-token multicast; see spec §2.7. */
const MS_PER_BATCH_MIN = 1_000;
const MS_PER_BATCH_MAX = 3_000;

export function computeProgress(input: {
  sentCount: number;
  failedCount: number;
  targetCount: number | null;
}): { ratio: number | null; percent: number | null } {
  const { sentCount, failedCount, targetCount } = input;
  if (targetCount === null) return { ratio: null, percent: null };
  if (targetCount === 0) return { ratio: 0, percent: 0 };

  // A broadcast target is approximate, so processed can overshoot it. Clamp.
  const ratio = Math.min(1, (sentCount + failedCount) / targetCount);
  return { ratio, percent: Math.round(ratio * 100) };
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

/** Rounds up to a whole minute, and never down to zero — "0분" would read as instant. */
export function minutes(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}
