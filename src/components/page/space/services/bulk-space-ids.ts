export type BulkSpaceIdSummary = {
  /** Every occurrence, in input order - exactly what the server receives. */
  ids: string[];
  /** How many distinct spaces are touched. */
  uniqueCount: number;
  /** Ids the operator entered more than once, most repeated first. */
  repeated: { id: string; count: number }[];
};

/**
 * Repeating an id is a feature, not a typo: the server grants the unit amount
 * once per occurrence and writes one coinMeta row for each, deliberately, so the
 * audit trail shows individual grants rather than one merged total.
 *
 * Deduping here silently removed that. The problem it was reaching for is real
 * though - pasting a partial-failure retry list onto the end of the original
 * double-grants by accident - so the repeats are surfaced for the confirm step
 * to show instead of being thrown away.
 */
export function parseBulkSpaceIds(raw: string): BulkSpaceIdSummary {
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);

  const repeated = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  return { ids, uniqueCount: counts.size, repeated };
}

/** "A 2회, B 3회" - named so the operator can spot a retry paste before running it. */
export function describeRepeats(repeated: BulkSpaceIdSummary['repeated']): string {
  return repeated.map(({ id, count }) => `${id} ${count}회`).join(', ');
}
