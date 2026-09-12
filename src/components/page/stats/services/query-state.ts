import type { StatsCondition, StatsMetric, StatsMetricKind, StatsOperator } from '@/client/stats';

/**
 * The screen asks one question at a time: "how many, per value of this one
 * condition, among the spaces these other conditions allow".
 *
 * That is the shape the server already has - a bucket carries a single
 * condition, and `list` ANDs it straight onto the filters - so the panel holds
 * one main condition and a list of subs rather than two interchangeable lanes.
 * The earlier split into 대상 좁히기 / 세어보기 drew two identical-looking lists
 * whose difference lived only in a hint, and could not say which was which.
 */

export const MAIN_ID = 'main';

export interface Draft {
  id: string;
  metric: string;
  op: StatsOperator;
  /**
   * One entry per value chip, kept as text so a half-typed value never becomes
   * NaN mid-edit. A `between` entry carries both bounds as "low,high".
   */
  values: string[];
}

export interface QueryState {
  entity: string;
  /**
   * Supplies the result rows - one per value. Null only until the metric
   * catalog arrives and there is a metric to seed it with.
   */
  main: Draft | null;
  /** Applied to every row alike. */
  subs: Draft[];
}

let sequence = 0;

function nextId(): string {
  sequence += 1;
  // Disjoint from MAIN_ID by construction, so one id space addresses both.
  return `sub-${sequence}`;
}

export function initialQueryState(entity: string): QueryState {
  return { entity, main: null, subs: [] };
}

function createDraft(id: string, metric: StatsMetric): Draft {
  return { id, metric: metric.key, op: metric.operators[0], values: [] };
}

/** Seeds the main condition once the catalog is known; never overwrites one. */
export function seedMain(state: QueryState, metric: StatsMetric | undefined): QueryState {
  if (state.main || !metric) return state;
  return { ...state, main: createDraft(MAIN_ID, metric) };
}

export function addSub(state: QueryState, metric: StatsMetric): QueryState {
  return { ...state, subs: [...state.subs, createDraft(nextId(), metric)] };
}

export function removeSub(state: QueryState, id: string): QueryState {
  return { ...state, subs: state.subs.filter((draft) => draft.id !== id) };
}

export function findDraft(state: QueryState, id: string): Draft | undefined {
  if (state.main?.id === id) return state.main;
  return state.subs.find((draft) => draft.id === id);
}

function patchDraft(state: QueryState, id: string, patch: Partial<Omit<Draft, 'id'>>): QueryState {
  if (state.main?.id === id) return { ...state, main: { ...state.main, ...patch } };
  return { ...state, subs: state.subs.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)) };
}

/** A new metric brings its own operators and value space, so the chips go. */
export function retarget(state: QueryState, id: string, metric: StatsMetric): QueryState {
  return patchDraft(state, id, { metric: metric.key, op: metric.operators[0], values: [] });
}

/** Likewise an operator change: "20" under 이상 is not "20" under 구간. */
export function setOperator(state: QueryState, id: string, op: StatsOperator): QueryState {
  return patchDraft(state, id, { op, values: [] });
}

export function addValue(state: QueryState, id: string, raw: string): QueryState {
  const value = raw.trim();
  const draft = findDraft(state, id);
  // A repeat would ask the same question twice and return two identical rows.
  if (!value || !draft || draft.values.includes(value)) return state;
  return patchDraft(state, id, { values: [...draft.values, value] });
}

export function removeValue(state: QueryState, id: string, index: number): QueryState {
  const draft = findDraft(state, id);
  if (!draft) return state;
  return patchDraft(state, id, { values: draft.values.filter((_, position) => position !== index) });
}

/**
 * The main condition splits into one row per value, so it always takes more.
 * A sub condition collapses to a single server condition, and only `in` can
 * hold a list there - "20 이상 또는 50 이상" is just "20 이상".
 */
export function acceptsMoreValues(draft: Draft, isMain: boolean): boolean {
  return isMain || draft.op === 'in' || draft.values.length === 0;
}

function splitPair(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

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
function parseDateValue(raw: string): Date | null {
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

/**
 * One checker per metric kind, as a total record so a new kind cannot slip
 * through unvalidated. boolean and date were the two the first version missed:
 * any text became `false` for a boolean, and a malformed date reached the server
 * and came back as a count of zero rather than an error.
 */
const CHECK_TEXT: Record<StatsMetricKind, (raw: string) => string | null> = {
  number: (raw) => (raw !== '' && Number.isFinite(Number(raw)) ? null : '숫자를 입력하세요.'),
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

/** Checks one chip, which for `between` is a whole pair. */
export function valueError(draft: Draft, metric: StatsMetric, value: string): string | null {
  if (draft.op === 'between') {
    const bounds = splitPair(value);
    if (bounds.length !== 2) return '구간의 시작과 끝을 모두 입력하세요.';
    for (const bound of bounds) {
      const problem = CHECK_TEXT[metric.kind](bound);
      if (problem) return problem;
    }
    return isAscending(metric.kind, bounds[0], bounds[1]) ? null : '구간의 시작이 끝보다 큽니다.';
  }
  const problem = CHECK_TEXT[metric.kind](value);
  if (problem) return problem;
  return metric.enumValues && !metric.enumValues.includes(value) ? `허용되지 않는 값입니다: ${value}` : null;
}

/** The first problem among the chips. No chips is not an error yet, just empty. */
export function draftError(draft: Draft, metric: StatsMetric | undefined): string | null {
  if (!metric) return '알 수 없는 지표입니다.';
  for (const value of draft.values) {
    const problem = valueError(draft, metric, value);
    if (problem) return problem;
  }
  return null;
}

/** How a chip reads, which is not always how it is stored. */
export function describeValue(draft: Draft, metric: StatsMetric | undefined, value: string): string {
  if (draft.op === 'between') {
    const [low = '', high = ''] = splitPair(value);
    return `${low} ~ ${high}`;
  }
  if (metric?.kind === 'boolean') return value === 'true' ? '예' : '아니오';
  return value;
}

function cast(metric: StatsMetric, raw: string): unknown {
  if (metric.kind === 'number') return Number(raw);
  if (metric.kind === 'boolean') return raw === 'true';
  return raw;
}

function toCondition(draft: Draft, metric: StatsMetric, value: string): StatsCondition {
  if (draft.op === 'between') {
    const [low, high] = splitPair(value);
    return { metric: draft.metric, op: draft.op, value: [cast(metric, low), cast(metric, high)] };
  }
  // `in` takes a list even when it holds one value, which is what a main-lane
  // enum row is: one bucket per value, each asking about that value alone.
  if (draft.op === 'in') return { metric: draft.metric, op: draft.op, value: [cast(metric, value)] };
  return { metric: draft.metric, op: draft.op, value: cast(metric, value) };
}

function byKey(metrics: StatsMetric[]): Map<string, StatsMetric> {
  return new Map(metrics.map((metric) => [metric.key, metric]));
}

/** One bucket per main value - the whole design, in one line. */
export function toBuckets(state: QueryState, metrics: StatsMetric[]): StatsCondition[] {
  const main = state.main;
  if (!main) return [];
  const metric = byKey(metrics).get(main.metric);
  if (!metric || draftError(main, metric)) return [];
  return main.values.map((value) => toCondition(main, metric, value));
}

/** Each sub collapses to a single condition; `in` keeps its whole list as one. */
export function toFilters(state: QueryState, metrics: StatsMetric[]): StatsCondition[] {
  const catalog = byKey(metrics);

  return state.subs.flatMap((draft): StatsCondition[] => {
    const metric = catalog.get(draft.metric);
    if (!metric || !draft.values.length || draftError(draft, metric)) return [];
    if (draft.op === 'in') {
      return [{ metric: draft.metric, op: draft.op, value: draft.values.map((value) => cast(metric, value)) }];
    }
    return [toCondition(draft, metric, draft.values[0])];
  });
}

/**
 * Why 조회 is unavailable, or null when it is. Centralised here so the panel
 * cannot disable the button without also being able to say why - the screen
 * already shipped that bug once.
 */
export function blockedReason(state: QueryState, metrics: StatsMetric[]): string | null {
  const catalog = byKey(metrics);
  if (!state.main) return '지표 목록을 불러오는 중입니다.';

  const mainProblem = draftError(state.main, catalog.get(state.main.metric));
  if (mainProblem) return mainProblem;
  if (!state.main.values.length) return '메인조건의 값을 입력하세요.';

  for (const sub of state.subs) {
    const problem = draftError(sub, catalog.get(sub.metric));
    if (problem) return problem;
  }

  const empty = state.subs.filter((sub) => !sub.values.length).length;
  return empty ? `값이 비어 있는 서브조건 ${empty}개의 값을 입력하세요.` : null;
}
