import type { StatsCondition, StatsMetric, StatsOperator } from '@/client/stats';

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

export function draftError(draft: Draft, metric: StatsMetric | undefined): string | null {
  if (!metric) return '알 수 없는 지표입니다.';
  // An untouched row is dropped before sending, so it is not an error yet.
  if (!draft.value.trim()) return null;

  if (draft.op === 'between') {
    const values = splitValues(draft.value);
    if (values.length !== 2) return '시작과 끝을 쉼표로 구분해 입력하세요.';
    if (metric.kind !== 'number') return null;
    const [low, high] = values.map(Number);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return '숫자를 입력하세요.';
    if (low > high) return '구간의 시작이 끝보다 큽니다.';
    return null;
  }

  if (draft.op === 'in') {
    const values = splitValues(draft.value);
    if (!values.length) return '값을 하나 이상 입력하세요.';
    if (!metric.enumValues) return null;
    const rejected = values.find((value) => !metric.enumValues?.includes(value));
    return rejected ? `허용되지 않는 값입니다: ${rejected}` : null;
  }

  if (metric.kind === 'number' && !Number.isFinite(Number(draft.value))) return '숫자를 입력하세요.';
  if (metric.kind === 'enum' && metric.enumValues && !metric.enumValues.includes(draft.value.trim())) {
    return `허용되지 않는 값입니다: ${draft.value.trim()}`;
  }
  return null;
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
