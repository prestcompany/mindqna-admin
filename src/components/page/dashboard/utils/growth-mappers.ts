import {
  DashboardGrowthBucket,
  DashboardGrowthGranularity,
  DashboardGrowthResponse,
  GrowthValue,
  LocaleGrowthRow,
} from '@/client/dashboard';
import { Locale } from '@/client/types';
import {
  DASHBOARD_LOCALES,
  DashboardGrowthViewModel,
  DashboardInsightCard,
  DashboardLocaleRow,
  DashboardMetricCardValue,
  DashboardTrendSeries,
} from '../types/growth';

const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
  zhTw: '중국어(번체)',
  es: '스페인어',
  id: '인도네시아어',
};

const numberFormatter = new Intl.NumberFormat('ko-KR');
const USER_DELTA_COLOR = '#10b981';
const SPACE_DELTA_COLOR = '#06b6d4';
const USER_CUMULATIVE_COLOR = '#2563eb';
const SPACE_CUMULATIVE_COLOR = '#e11d48';

export function getLocaleLabel(locale: Locale): string {
  return LOCALE_LABELS[locale] ?? locale;
}

export function formatMetricWithDelta(cumulative: number, delta: number): string {
  return `${numberFormatter.format(cumulative)} (${delta >= 0 ? '+' : ''}${numberFormatter.format(delta)})`;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDelta(delta: number) {
  return `${delta >= 0 ? '+' : ''}${formatNumber(delta)}`;
}

function toPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getRangeLabel(buckets: DashboardGrowthBucket[]) {
  if (!buckets.length) {
    return '최근 기간';
  }

  if (buckets.length === 1) {
    return buckets[0].label;
  }

  return `${buckets[0].label} - ${buckets[buckets.length - 1].label}`;
}

function createMetricCardValue(
  label: string,
  value: number,
  delta: number,
  tone: DashboardMetricCardValue['tone'],
  options?: Partial<Pick<DashboardMetricCardValue, 'formatted' | 'deltaLabel' | 'deltaText' | 'accentLabel'>>,
): DashboardMetricCardValue {
  return {
    label,
    value,
    delta,
    formatted: options?.formatted ?? formatMetricWithDelta(value, delta),
    deltaLabel: options?.deltaLabel ?? '이번 달 증감',
    deltaText: options?.deltaText ?? formatDelta(delta),
    accentLabel: options?.accentLabel ?? '전월 대비',
    tone,
  };
}

function createTrendSeries(
  granularity: DashboardGrowthGranularity,
  metric: DashboardTrendSeries['metric'],
  title: string,
  description: string,
  buckets: DashboardGrowthBucket[],
): DashboardTrendSeries {
  const labels = buckets.map((bucket) => bucket.label);
  const periods = buckets.map((bucket) => bucket.key);
  const deltaLabelPrefix = granularity === 'day' ? '일간' : '월간';
  const cumulativeUserLabel = granularity === 'day' ? '종료일 기준 누적 가입자' : '월말 누적 가입자';
  const cumulativeSpaceLabel = granularity === 'day' ? '종료일 기준 누적 공간' : '월말 누적 공간';

  if (metric === 'users') {
    return {
      title,
      description,
      labels,
      periods,
      metric,
      datasets: [
        {
          label: `${deltaLabelPrefix} 순증 가입자`,
          type: 'bar',
          values: buckets.map((bucket) => bucket.users.delta),
          color: USER_DELTA_COLOR,
          yAxisID: 'y',
        },
        {
          label: cumulativeUserLabel,
          type: 'line',
          values: buckets.map((bucket) => bucket.users.cumulative),
          color: USER_CUMULATIVE_COLOR,
          yAxisID: 'y1',
        },
      ],
    };
  }

  if (metric === 'spaces') {
    return {
      title,
      description,
      labels,
      periods,
      metric,
      datasets: [
        {
          label: `${deltaLabelPrefix} 순증 공간`,
          type: 'bar',
          values: buckets.map((bucket) => bucket.spaces.delta),
          color: SPACE_DELTA_COLOR,
          yAxisID: 'y',
        },
        {
          label: cumulativeSpaceLabel,
          type: 'line',
          values: buckets.map((bucket) => bucket.spaces.cumulative),
          color: SPACE_CUMULATIVE_COLOR,
          yAxisID: 'y1',
        },
      ],
    };
  }

  return {
    title,
    description,
    labels,
    periods,
    metric,
    datasets: [
      {
        label: `가입자 ${deltaLabelPrefix} 순증`,
        type: 'bar',
        values: buckets.map((bucket) => bucket.users.delta),
        color: USER_DELTA_COLOR,
        yAxisID: 'y',
      },
      {
        label: `공간 ${deltaLabelPrefix} 순증`,
        type: 'bar',
        values: buckets.map((bucket) => bucket.spaces.delta),
        color: SPACE_DELTA_COLOR,
        yAxisID: 'y',
      },
      {
        label: cumulativeUserLabel,
        type: 'line',
        values: buckets.map((bucket) => bucket.users.cumulative),
        color: USER_CUMULATIVE_COLOR,
        yAxisID: 'y1',
      },
      {
        label: cumulativeSpaceLabel,
        type: 'line',
        values: buckets.map((bucket) => bucket.spaces.cumulative),
        color: SPACE_CUMULATIVE_COLOR,
        yAxisID: 'y1',
      },
    ],
  };
}

function getShare(metricValue: number, total: number) {
  if (!total) {
    return 0;
  }

  return (metricValue / total) * 100;
}

function toLocaleRow(row: LocaleGrowthRow, summary: DashboardGrowthResponse['summary'], rank: number): DashboardLocaleRow {
  const usersShare = getShare(row.users.cumulative, summary.users.cumulative);
  const spacesShare = getShare(row.spaces.cumulative, summary.spaces.cumulative);

  return {
    rank,
    locale: row.locale,
    label: getLocaleLabel(row.locale),
    users: row.users,
    spaces: row.spaces,
    usersShare,
    spacesShare,
    dominantMetric: row.users.cumulative >= row.spaces.cumulative ? 'users' : 'spaces',
  };
}

function buildInsights(localeRows: DashboardLocaleRow[]): DashboardInsightCard[] {
  const topUsers = [...localeRows].sort((a, b) => b.users.delta - a.users.delta)[0];
  const topSpaces = [...localeRows].sort((a, b) => b.spaces.delta - a.spaces.delta)[0];

  return [
    {
      title: '가장 빠른 가입자 성장',
      description: topUsers
        ? `${topUsers.label} 로케일이 선택 기간 동안 가장 큰 가입자 증가를 보였습니다.`
        : '비교 가능한 가입자 성장 데이터가 없습니다.',
      value: topUsers ? `${topUsers.label} ${formatDelta(topUsers.users.delta)}` : '-',
    },
    {
      title: '가장 빠른 공간 성장',
      description: topSpaces
        ? `${topSpaces.label} 로케일이 선택 기간 동안 가장 큰 공간 증가를 보였습니다.`
        : '비교 가능한 공간 성장 데이터가 없습니다.',
      value: topSpaces ? `${topSpaces.label} ${formatDelta(topSpaces.spaces.delta)}` : '-',
    },
  ];
}

function ensureRowOrder(rows: LocaleGrowthRow[], localesInBuckets: LocaleGrowthRow[]) {
  if (rows.length) {
    return rows;
  }

  return localesInBuckets;
}

function getGranularityLabel(granularity: DashboardGrowthGranularity) {
  return granularity === 'day' ? '일' : '월';
}

function getCumulativeMetricLabel(granularity: DashboardGrowthGranularity, metric: 'users' | 'spaces') {
  const suffix = metric === 'users' ? '가입자' : '공간';

  return granularity === 'day' ? `종료일 기준 누적 ${suffix}` : `종료 월 누적 ${suffix}`;
}

function getDeltaMetricLabel(granularity: DashboardGrowthGranularity, metric: 'users' | 'spaces') {
  const suffix = metric === 'users' ? '가입자' : '공간';

  return granularity === 'day' ? `종료일 ${suffix} 순증` : `종료 월 ${suffix} 순증`;
}

function getCurrentPeriodAccentLabel(granularity: DashboardGrowthGranularity) {
  return granularity === 'day' ? '선택 종료일' : '선택 종료 월';
}

function getCurrentBasisAccentLabel(granularity: DashboardGrowthGranularity) {
  return granularity === 'day' ? '종료일 기준' : '종료 월 기준';
}

function getSelectedLocalesLabel(selectedLocales: Locale[]) {
  if (!selectedLocales.length || selectedLocales.length === DASHBOARD_LOCALES.length) {
    return '전체 로케일';
  }

  if (selectedLocales.length >= 5) {
    return `${selectedLocales.length}개 로케일`;
  }

  return selectedLocales.map((locale) => getLocaleLabel(locale)).join(', ');
}

export function buildDashboardGrowthViewModel(
  data?: DashboardGrowthResponse,
  selectedLocales: Locale[] = DASHBOARD_LOCALES,
): DashboardGrowthViewModel {
  const granularity = data?.granularity ?? 'month';
  const buckets = data?.buckets ?? [];
  const summary = data?.summary ?? {
    users: { cumulative: 0, delta: 0 },
    spaces: { cumulative: 0, delta: 0 },
  };
  const latestBucket = buckets[buckets.length - 1];
  const previousBucket = buckets[buckets.length - 2];
  const localeSeed = buckets[buckets.length - 1]?.locales ?? [];
  const localeTotals = ensureRowOrder(data?.localeTotals ?? [], localeSeed)
    .map((row, index) => toLocaleRow({ ...row, label: row.label || getLocaleLabel(row.locale) }, summary, index + 1))
    .sort((left, right) => {
      if (right.users.cumulative !== left.users.cumulative) {
        return right.users.cumulative - left.users.cumulative;
      }

      return right.spaces.cumulative - left.spaces.cumulative;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const userLocaleRows = [...localeTotals]
    .sort((left, right) => right.users.cumulative - left.users.cumulative)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const spaceLocaleRows = [...localeTotals]
    .sort((left, right) => right.spaces.cumulative - left.spaces.cumulative)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    response: data,
    granularity,
    isEmpty: buckets.length === 0,
    rangeLabel: getRangeLabel(buckets),
    lastUpdatedLabel: latestBucket?.label ?? '데이터 없음',
    selectedLocalesLabel: getSelectedLocalesLabel(selectedLocales),
    selectedLocaleCount: selectedLocales.length || DASHBOARD_LOCALES.length,
    kpis: {
      users: createMetricCardValue(getCumulativeMetricLabel(granularity, 'users'), summary.users.cumulative, summary.users.delta, 'slate', {
        formatted: formatNumber(summary.users.cumulative),
        deltaLabel: `${getCurrentPeriodAccentLabel(granularity)} 순증`,
        deltaText: formatDelta(latestBucket?.users.delta ?? 0),
        accentLabel: getCurrentBasisAccentLabel(granularity),
      }),
      usersDelta: createMetricCardValue(getDeltaMetricLabel(granularity, 'users'), summary.users.delta, summary.users.delta, 'emerald', {
        formatted: formatNumber(latestBucket?.users.delta ?? 0),
        deltaLabel: `직전 ${getGranularityLabel(granularity)} 대비`,
        deltaText: formatDelta((latestBucket?.users.delta ?? 0) - (previousBucket?.users.delta ?? 0)),
        accentLabel: getCurrentPeriodAccentLabel(granularity),
      }),
      spaces: createMetricCardValue(getCumulativeMetricLabel(granularity, 'spaces'), summary.spaces.cumulative, summary.spaces.delta, 'sky', {
        formatted: formatNumber(summary.spaces.cumulative),
        deltaLabel: `${getCurrentPeriodAccentLabel(granularity)} 순증`,
        deltaText: formatDelta(latestBucket?.spaces.delta ?? 0),
        accentLabel: getCurrentBasisAccentLabel(granularity),
      }),
      spacesDelta: createMetricCardValue(getDeltaMetricLabel(granularity, 'spaces'), summary.spaces.delta, summary.spaces.delta, 'amber', {
        formatted: formatNumber(latestBucket?.spaces.delta ?? 0),
        deltaLabel: `직전 ${getGranularityLabel(granularity)} 대비`,
        deltaText: formatDelta((latestBucket?.spaces.delta ?? 0) - (previousBucket?.spaces.delta ?? 0)),
        accentLabel: getCurrentPeriodAccentLabel(granularity),
      }),
    },
    overviewTrend: createTrendSeries(
      granularity,
      'overview',
      '성장 추이',
      granularity === 'day' ? '가입자와 공간의 일간 순증 및 종료일 기준 누적을 함께 봅니다.' : '가입자와 공간의 월간 순증 및 월말 누적을 함께 봅니다.',
      buckets,
    ),
    userTrend: createTrendSeries(
      granularity,
      'users',
      '가입자 성장 추이',
      granularity === 'day' ? '일간 순증과 종료일 기준 누적을 동시에 추적합니다.' : '월간 순증과 월말 누적을 동시에 추적합니다.',
      buckets,
    ),
    spaceTrend: createTrendSeries(
      granularity,
      'spaces',
      '공간 성장 추이',
      granularity === 'day' ? '일간 순증과 종료일 기준 누적을 동시에 추적합니다.' : '운영 규모가 어떤 속도로 커졌는지 보여줍니다.',
      buckets,
    ),
    localeLeaderboard: localeTotals,
    userLocaleRows,
    spaceLocaleRows,
    overviewInsights: buildInsights(localeTotals),
  };
}

export function formatGrowthValue(value: GrowthValue) {
  return formatMetricWithDelta(value.cumulative, value.delta);
}

export function formatLocaleShare(value: number) {
  return toPercent(value);
}
