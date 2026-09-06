import type { StatsCondition, StatsMetric, StatsMetricKind, StatsOperator } from '@/client/stats';

export type Lane = 'filters' | 'buckets';

export interface Draft {
  id: string;
  metric: string;
  op: StatsOperator;
  /** Kept as text so a half-typed value never becomes NaN mid-edit. */
  value: string;
}

export interface QueryState {
  entity: string;
  filters: Draft[];
  buckets: Draft[];
}

let sequence = 0;

function nextId(lane: Lane): string {
  sequence += 1;
  return `${lane}-${sequence}`;
}

export function initialQueryState(entity: string): QueryState {
  return { entity, filters: [], buckets: [] };
}

export function addDraft(state: QueryState, lane: Lane, metric: StatsMetric): QueryState {
  const draft: Draft = { id: nextId(lane), metric: metric.key, op: metric.operators[0], value: '' };
  return { ...state, [lane]: [...state[lane], draft] };
}

export function removeDraft(state: QueryState, lane: Lane, id: string): QueryState {
  return { ...state, [lane]: state[lane].filter((draft) => draft.id !== id) };
}

export function updateDraft(
  state: QueryState,
  lane: Lane,
  id: string,
  patch: Partial<Omit<Draft, 'id'>>,
): QueryState {
  return { ...state, [lane]: state[lane].map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)) };
}

function splitValues(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * One checker per metric kind, as a total record so a new kind cannot slip
 * through unvalidated. boolean and date were the two the first version missed:
 * any text became `false` for a boolean, and a malformed date reached the server
 * and came back as a count of zero rather than an error.
 */
const DATE_ONLY = /^[1-9]\d{3}-\d{2}-\d{2}$/;
const DATE_TIME = /^[1-9]\d{3}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
const MAX_YEAR = 9998;

/**
 * Mirrors the server's parser rather than calling Date.parse. Date.parse reads
 * "2026-01" as January 1st and rolls "2026-02-30" into March, none of which
 * MySQL accepts, so gating on it would pass values the server then answers with
 * a count of zero.
 *
 * The grammar has to stay identical to stats.values.ts on the server, or the
 * panel starts blocking what the route allows, or worse the reverse.
 */
export function parseDateValue(raw: string): Date | null {
  const value = raw.trim();
  if (!DATE_ONLY.test(value) && !DATE_TIME.test(value)) return null;
  const [datePart, timePart = '00:00:00'] = value.split(/[ T]/);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  if (hour > 23 || minute > 59 || second > 59 || year > MAX_YEAR) return null;
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const rolled =
    instant.getUTCFullYear() !== year || instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day;
  return rolled || Number.isNaN(instant.getTime()) ? null : instant;
}

const CHECK_TEXT: Record<StatsMetricKind, (raw: string) => string | null> = {
  number: (raw) => (Number.isFinite(Number(raw)) ? null : '숫자를 입력하세요.'),
  boolean: (raw) => (raw === 'true' || raw === 'false' ? null : 'true 또는 false를 입력하세요.'),
  date: (raw) => (parseDateValue(raw) ? null : '날짜 형식이 올바르지 않습니다. 예: 2026-01-31'),
  enum: () => null,
};

function isAscending(kind: StatsMetricKind, low: string, high: string): boolean {
  if (kind === 'number') return Number(low) <= Number(high);
  if (kind === 'date') {
    const from = parseDateValue(low);
    const to = parseDateValue(high);
    return !!from && !!to && from.getTime() <= to.getTime();
  }
  return true;
}

export function draftError(draft: Draft, metric: StatsMetric | undefined): string | null {
  if (!metric) return '알 수 없는 지표입니다.';
  // An untouched row is dropped before sending, so it is not an error yet.
  if (!draft.value.trim()) return null;

  const checkMembership = (value: string): string | null =>
    metric.enumValues && !metric.enumValues.includes(value) ? `허용되지 않는 값입니다: ${value}` : null;

  if (draft.op === 'between') {
    const values = splitValues(draft.value);
    if (values.length !== 2) return '시작과 끝을 쉼표로 구분해 입력하세요.';
    for (const bound of values) {
      const problem = CHECK_TEXT[metric.kind](bound);
      if (problem) return problem;
    }
    return isAscending(metric.kind, values[0], values[1]) ? null : '구간의 시작이 끝보다 큽니다.';
  }

  if (draft.op === 'in') {
    const values = splitValues(draft.value);
    if (!values.length) return '값을 하나 이상 입력하세요.';
    for (const value of values) {
      const problem = CHECK_TEXT[metric.kind](value) ?? checkMembership(value);
      if (problem) return problem;
    }
    return null;
  }

  const value = draft.value.trim();
  return CHECK_TEXT[metric.kind](value) ?? checkMembership(value);
}

/** True when any draft in the lane carries an error the operator must fix first. */
export function hasDraftErrors(drafts: Draft[], metrics: StatsMetric[]): boolean {
  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));
  return drafts.some((draft) => draftError(draft, byKey.get(draft.metric)) !== null);
}

export function toConditions(drafts: Draft[], metrics: StatsMetric[]): StatsCondition[] {
  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));

  return drafts.flatMap((draft): StatsCondition[] => {
    const metric = byKey.get(draft.metric);
    if (!metric || !draft.value.trim() || draftError(draft, metric)) return [];

    const cast = (raw: string): unknown => {
      if (metric.kind === 'number') return Number(raw);
      if (metric.kind === 'boolean') return raw === 'true';
      return raw;
    };

    if (draft.op === 'between') {
      const [low, high] = splitValues(draft.value);
      return [{ metric: draft.metric, op: draft.op, value: [cast(low), cast(high)] }];
    }
    if (draft.op === 'in') {
      return [{ metric: draft.metric, op: draft.op, value: splitValues(draft.value).map(cast) }];
    }
    return [{ metric: draft.metric, op: draft.op, value: cast(draft.value.trim()) }];
  });
}
