import type { AdminPushItem, AdminPushStatus } from '@/client/push';

/**
 * One list entry: either a standalone push, or a whole filtered campaign folded into a
 * single row whose numbers are the sum of its parts.
 */
export type PushListEntry = AdminPushItem & {
  /** The rows this entry stands for. Length 1 for a standalone send. */
  parts: AdminPushItem[];
  /** How many parts have reached a terminal status. */
  finishedParts: number;
};

/**
 * A campaign's status is the one that describes it as a whole, not whichever part happens
 * to be first in the page.
 *
 * Order matters: anything still moving outranks anything finished, because an operator
 * reading "발송 완료" on a campaign that is three chunks in would be misled about whether
 * it can still be stopped. FAILED outranks CANCELED for the same reason — a part that broke
 * is the fact worth surfacing.
 */
const STATUS_PRIORITY: AdminPushStatus[] = ['SENDING', 'SCHEDULED', 'FAILED', 'ABORTED', 'CANCELED', 'SENT'];

const TERMINAL: AdminPushStatus[] = ['SENT', 'FAILED', 'CANCELED', 'ABORTED'];

export function campaignStatus(parts: AdminPushItem[]): AdminPushStatus {
  for (const status of STATUS_PRIORITY) {
    if (parts.some((p) => p.status === status)) return status;
  }
  return parts[0]?.status ?? 'SCHEDULED';
}

/**
 * Folds grouped rows into one entry each, preserving the order the server returned.
 *
 * The fold is anchored to the FIRST part seen rather than to a re-sorted list, so a campaign
 * keeps the position its earliest chunk had and does not jump around the table as parts
 * change status.
 */
export function groupPushes(items: AdminPushItem[]): PushListEntry[] {
  const out: PushListEntry[] = [];
  const indexByGroup = new Map<string, number>();

  for (const item of items) {
    if (!item.groupId) {
      out.push({ ...item, parts: [item], finishedParts: TERMINAL.includes(item.status) ? 1 : 0 });
      continue;
    }

    const at = indexByGroup.get(item.groupId);
    if (at == null) {
      indexByGroup.set(item.groupId, out.length);
      out.push({ ...item, parts: [item], finishedParts: 0 });
    } else {
      out[at].parts.push(item);
    }
  }

  return out.map((entry) => {
    if (entry.parts.length === 1 && !entry.groupId) return entry;

    const parts = entry.parts;
    const sum = (pick: (p: AdminPushItem) => number) => parts.reduce((a, p) => a + pick(p), 0);

    return {
      ...entry,
      status: campaignStatus(parts),
      // Summed, not taken from the first part: a campaign's progress is what all of its
      // chunks have delivered between them.
      targetCount: sum((p) => p.targetCount ?? 0),
      sentCount: sum((p) => p.sentCount),
      failedCount: sum((p) => p.failedCount),
      // The earliest start and the latest finish bound the campaign; a finish is only real
      // once every part has one.
      startedAt:
        parts
          .map((p) => p.startedAt)
          .filter(Boolean)
          .sort()[0] ?? null,
      finishedAt: parts.every((p) => p.finishedAt)
        ? parts
            .map((p) => p.finishedAt!)
            .sort()
            .at(-1)!
        : null,
      lastError: parts.find((p) => p.lastError)?.lastError ?? null,
      finishedParts: parts.filter((p) => TERMINAL.includes(p.status)).length,
    };
  });
}
