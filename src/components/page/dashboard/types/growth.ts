import { DashboardGrowthGranularity, DashboardGrowthResponse, GrowthValue } from '@/client/dashboard';
import { Locale, SpaceType } from '@/client/types';

export type DashboardRangePreset = '6m' | '12m' | 'ytd' | '7d' | '30d' | '90d' | 'custom';
export type DashboardTabValue = 'overview' | 'users' | 'spaces';
export type DashboardLocaleRowKey = Locale | 'total';

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
  stack?: string;
}

export interface DashboardTrendSeries {
  title: string;
  description: string;
  labels: string[];
  periods: string[];
  metric: 'users' | 'spaces' | 'overview';
  datasets: DashboardTrendDataset[];
  stackedBars?: boolean;
  showStackedBarTotals?: boolean;
}

export interface DashboardLocaleDailyDataset {
  locale: Locale;
  label: string;
  values: number[];
  color: string;
}

export interface DashboardLocaleDailySeries {
  title: string;
  description: string;
  labels: string[];
  periods: string[];
  datasets: DashboardLocaleDailyDataset[];
}

export interface DashboardLocaleRow {
  rank: number;
  locale: DashboardLocaleRowKey;
  label: string;
  users: GrowthValue;
  spaces: GrowthValue;
  usersShare: number;
  spacesShare: number;
  dailyAverageUsers: number;
  dailyAverageSpaces: number;
  dominantMetric: 'users' | 'spaces';
  isTotal?: boolean;
}

export interface DashboardSpaceTypeDistributionItem {
  type: SpaceType;
  label: string;
  count: number;
  share: number;
}

export interface DashboardLocaleSpaceTypeDistribution {
  locale: Locale;
  label: string;
  total: number;
  types: DashboardSpaceTypeDistributionItem[];
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
  localeDailyUserTrend: DashboardLocaleDailySeries;
  totalLocaleRow: DashboardLocaleRow;
  localeLeaderboard: DashboardLocaleRow[];
  userLocaleRows: DashboardLocaleRow[];
  spaceLocaleRows: DashboardLocaleRow[];
  spaceTypeDistributions: DashboardLocaleSpaceTypeDistribution[];
}
