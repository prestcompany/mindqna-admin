import { DashboardGrowthGranularity, DashboardGrowthResponse, GrowthValue } from '@/client/dashboard';
import { Locale } from '@/client/types';

export type DashboardRangePreset = '6m' | '12m' | 'ytd' | '7d' | '30d' | '90d' | 'custom';
export type DashboardTabValue = 'overview' | 'users' | 'spaces' | 'cards';

export const DASHBOARD_LOCALES: Locale[] = ['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'];

export interface DashboardQueryState {
  startedAt?: string;
  endedAt?: string;
  locale: Locale[];
  granularity: DashboardGrowthGranularity;
}

export interface DashboardMetricCardValue {
  label: string;
  value: number;
  delta: number;
  formatted: string;
  deltaLabel: string;
  deltaText: string;
  accentLabel: string;
  tone: 'slate' | 'emerald' | 'sky' | 'amber';
}

export interface DashboardTrendDataset {
  label: string;
  type: 'bar' | 'line';
  values: number[];
  color: string;
  yAxisID: 'y' | 'y1';
}

export interface DashboardTrendSeries {
  title: string;
  description: string;
  labels: string[];
  periods: string[];
  metric: 'users' | 'spaces' | 'overview';
  datasets: DashboardTrendDataset[];
}

export interface DashboardLocaleRow {
  rank: number;
  locale: Locale;
  label: string;
  users: GrowthValue;
  spaces: GrowthValue;
  usersShare: number;
  spacesShare: number;
  dominantMetric: 'users' | 'spaces';
}

export interface DashboardInsightCard {
  title: string;
  description: string;
  value: string;
}

export interface DashboardGrowthViewModel {
  response?: DashboardGrowthResponse;
  granularity: DashboardGrowthGranularity;
  isEmpty: boolean;
  rangeLabel: string;
  lastUpdatedLabel: string;
  selectedLocalesLabel: string;
  selectedLocaleCount: number;
  kpis: {
    users: DashboardMetricCardValue;
    usersDelta: DashboardMetricCardValue;
    spaces: DashboardMetricCardValue;
    spacesDelta: DashboardMetricCardValue;
  };
  overviewTrend: DashboardTrendSeries;
  userTrend: DashboardTrendSeries;
  spaceTrend: DashboardTrendSeries;
  localeLeaderboard: DashboardLocaleRow[];
  userLocaleRows: DashboardLocaleRow[];
  spaceLocaleRows: DashboardLocaleRow[];
  overviewInsights: DashboardInsightCard[];
}
