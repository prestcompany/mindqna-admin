import client from './@base';

export type StatsOperator = 'gte' | 'lt' | 'eq' | 'in' | 'between';
export type StatsMetricKind = 'number' | 'date' | 'enum' | 'boolean';

export interface StatsCondition {
  metric: string;
  op: StatsOperator;
  value: unknown;
}

export interface StatsMetric {
  key: string;
  label: string;
  kind: StatsMetricKind;
  operators: StatsOperator[];
  enumValues?: string[];
}

export interface StatsEntity {
  key: string;
  label: string;
  metrics: StatsMetric[];
}

export interface StatsBucketRow {
  label: string;
  count: number | null;
  error?: 'timeout' | 'failed';
}

export interface StatsSpaceRow {
  spaceId: string;
  name: string;
  type: string;
  locale: string;
  members: number;
}

export async function getStatsMetrics() {
  const res = await client.get<StatsEntity[]>('/stats/metrics');

  return res.data;
}

export async function queryStats(body: { entity: string; filters?: StatsCondition[]; buckets: StatsCondition[] }) {
  const res = await client.post<{ rows: StatsBucketRow[] }>('/stats/query', body);

  return res.data;
}

export async function listStats(body: {
  entity: string;
  filters?: StatsCondition[];
  bucket: StatsCondition;
  page?: number;
  size?: number;
}) {
  const res = await client.post<{ items: StatsSpaceRow[] }>('/stats/list', body);

  return res.data;
}
