import {
  DashboardGrowthBucket,
  DashboardGrowthGranularity,
  DashboardGrowthResponse,
  GrowthValue,
  LocaleGrowthRow,
} from '@/client/dashboard';
import { Locale, SpaceType } from '@/client/types';
import {
  DASHBOARD_LOCALES,
  DashboardLocaleDailySeries,
  DashboardGrowthViewModel,
  DashboardLocaleSpaceTypeDistribution,
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
const LOCALE_SERIES_COLORS = ['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#14b8a6', '#f97316', '#94a3b8'];
const SPACE_TYPE_ORDER: SpaceType[] = ['friends', 'alone', 'family', 'couple'];
const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  couple: '커플',
  family: '가족',
  friends: '친구',
  alone: '혼자',
};

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

function formatDecimalDelta(delta: number) {
  return `${delta >= 0 ? '+' : ''}${numberFormatter.format(Number(delta.toFixed(1)))}`;
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
          label: `${deltaLabelPrefix} 증가 가입자`,
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
          label: `${deltaLabelPrefix} 증가 공간`,
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
        label: `가입자 ${deltaLabelPrefix} 증가`,
        type: 'bar',
        values: buckets.map((bucket) => bucket.users.delta),
        color: USER_DELTA_COLOR,
        yAxisID: 'y',
      },
      {
        label: `공간 ${deltaLabelPrefix} 증가`,
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

function toLocaleRow(
  row: LocaleGrowthRow,
  summary: DashboardGrowthResponse['summary'],
  rank: number,
  rangeDayCount: number,
): DashboardLocaleRow {
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
    dailyAverageUsers: row.users.delta / rangeDayCount,
    dailyAverageSpaces: row.spaces.delta / rangeDayCount,
    dominantMetric: row.users.cumulative >= row.spaces.cumulative ? 'users' : 'spaces',
  };
}

function ensureRowOrder(rows: LocaleGrowthRow[], localesInBuckets: LocaleGrowthRow[]) {
  if (rows.length) {
    return rows;
  }

  return localesInBuckets;
}

function createTotalLocaleRow(
  localeRows: DashboardLocaleRow[],
  summary: DashboardGrowthResponse['summary'],
  rangeDayCount: number,
): DashboardLocaleRow {
  const users = localeRows.length
    ? {
        cumulative: localeRows.reduce((sum, row) => sum + row.users.cumulative, 0),
        delta: localeRows.reduce((sum, row) => sum + row.users.delta, 0),
      }
    : summary.users;
  const spaces = localeRows.length
    ? {
        cumulative: localeRows.reduce((sum, row) => sum + row.spaces.cumulative, 0),
        delta: localeRows.reduce((sum, row) => sum + row.spaces.delta, 0),
      }
    : summary.spaces;

  return {
    rank: 0,
    locale: 'total',
    label: '전체',
    users,
    spaces,
    usersShare: users.cumulative > 0 ? 100 : 0,
    spacesShare: spaces.cumulative > 0 ? 100 : 0,
    dailyAverageUsers: users.delta / rangeDayCount,
    dailyAverageSpaces: spaces.delta / rangeDayCount,
    dominantMetric: users.cumulative >= spaces.cumulative ? 'users' : 'spaces',
    isTotal: true,
  };
}

function createLocaleDailyUserSeries(
  granularity: DashboardGrowthGranularity,
  buckets: DashboardGrowthBucket[],
  localeRows: DashboardLocaleRow[],
): DashboardLocaleDailySeries {
  const localeRowsOnly = localeRows.filter(
    (row): row is DashboardLocaleRow & { locale: Locale } => row.locale !== 'total',
  );

  return {
    title: granularity === 'day' ? '일별 국가별 가입자' : '기간별 국가별 가입자',
    description:
      granularity === 'day'
        ? '선택 기간 동안 각 로케일에서 새로 늘어난 가입자를 비교합니다.'
        : '선택 월 범위 동안 각 로케일에서 새로 늘어난 가입자를 비교합니다.',
    labels: buckets.map((bucket) => bucket.label),
    periods: buckets.map((bucket) => bucket.key),
    datasets: localeRowsOnly.map((row, index) => ({
      locale: row.locale,
      label: row.label,
      color: LOCALE_SERIES_COLORS[index % LOCALE_SERIES_COLORS.length],
      values: buckets.map(
        (bucket) => bucket.locales.find((localeRow) => localeRow.locale === row.locale)?.users.delta ?? 0,
      ),
    })),
  };
}

function createLocaleSpaceTrendSeries(
  granularity: DashboardGrowthGranularity,
  buckets: DashboardGrowthBucket[],
  localeRows: DashboardLocaleRow[],
): DashboardTrendSeries {
  const localeRowsOnly = localeRows.filter(
    (row): row is DashboardLocaleRow & { locale: Locale } => row.locale !== 'total',
  );
  const cumulativeSpaceLabel = granularity === 'day' ? '종료일 기준 누적 공간' : '월말 누적 공간';

  return {
    title: '국가별 공간 증가 추이',
    description:
      granularity === 'day'
        ? '일별로 새로 늘어난 공간을 국가별 막대로 보고, 종료일 기준 누적 공간을 선으로 함께 봅니다.'
        : '월별로 새로 늘어난 공간을 국가별 막대로 보고, 월말 누적 공간을 선으로 함께 봅니다.',
    labels: buckets.map((bucket) => bucket.label),
    periods: buckets.map((bucket) => bucket.key),
    metric: 'spaces',
    stackedBars: true,
    showStackedBarTotals: true,
    datasets: [
      ...localeRowsOnly.map((row, index) => ({
        label: row.label,
        type: 'bar' as const,
        values: buckets.map(
          (bucket) => bucket.locales.find((localeRow) => localeRow.locale === row.locale)?.spaces.delta ?? 0,
        ),
        color: LOCALE_SERIES_COLORS[index % LOCALE_SERIES_COLORS.length],
        yAxisID: 'y' as const,
        stack: 'space-locale-increase',
      })),
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

function buildSpaceTypeDistributions(data?: DashboardGrowthResponse): DashboardLocaleSpaceTypeDistribution[] {
  return (data?.spaceTypeDistributions ?? []).map((row) => {
    const orderedTypes = SPACE_TYPE_ORDER.map((type) => {
      const typeRow = row.types.find((item) => item.type === type);
      const count = typeRow?.count ?? 0;

      return {
        type,
        label: SPACE_TYPE_LABELS[type],
        count,
        share: row.total ? (count / row.total) * 100 : 0,
      };
    });

    return {
      locale: row.locale,
      label: getLocaleLabel(row.locale),
      total: row.total,
      types: orderedTypes,
    };
  });
}

function getCumulativeMetricLabel(granularity: DashboardGrowthGranularity, metric: 'users' | 'spaces') {
  const suffix = metric === 'users' ? '가입자' : '공간';

  return granularity === 'day' ? `종료일 기준 누적 ${suffix}` : `종료 월 누적 ${suffix}`;
}

function getDeltaMetricLabel(granularity: DashboardGrowthGranularity, metric: 'users' | 'spaces') {
  const suffix = metric === 'users' ? '가입자' : '공간';

  return granularity === 'day' ? `선택 기간 ${suffix} 증가` : `선택 월 범위 ${suffix} 증가`;
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
  rangeDayCount = 1,
): DashboardGrowthViewModel {
  const granularity = data?.granularity ?? 'month';
  const buckets = data?.buckets ?? [];
  const safeRangeDayCount = Math.max(rangeDayCount, 1);
  const summary = data?.summary ?? {
    users: { cumulative: 0, delta: 0 },
    spaces: { cumulative: 0, delta: 0 },
  };
  const latestBucket = buckets[buckets.length - 1];
  const localeSeed = buckets[buckets.length - 1]?.locales ?? [];
  const localeTotals = ensureRowOrder(data?.localeTotals ?? [], localeSeed)
    .map((row, index) =>
      toLocaleRow({ ...row, label: row.label || getLocaleLabel(row.locale) }, summary, index + 1, safeRangeDayCount),
    )
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
  const totalLocaleRow = createTotalLocaleRow(localeTotals, summary, safeRangeDayCount);
  const periodUserDelta = totalLocaleRow.users.delta;
  const periodSpaceDelta = totalLocaleRow.spaces.delta;
  const averageUserDelta = periodUserDelta / safeRangeDayCount;
  const averageSpaceDelta = periodSpaceDelta / safeRangeDayCount;

  return {
    response: data,
    granularity,
    isEmpty: buckets.length === 0,
    rangeLabel: getRangeLabel(buckets),
    lastUpdatedLabel: latestBucket?.label ?? '데이터 없음',
    selectedLocalesLabel: getSelectedLocalesLabel(selectedLocales),
    selectedLocaleCount: selectedLocales.length || DASHBOARD_LOCALES.length,
    kpis: {
      users: createMetricCardValue(
        getCumulativeMetricLabel(granularity, 'users'),
        summary.users.cumulative,
        periodUserDelta,
        'slate',
        {
          formatted: formatNumber(summary.users.cumulative),
          deltaLabel: '선택 기간 증가',
          deltaText: formatDelta(periodUserDelta),
          accentLabel: getCurrentBasisAccentLabel(granularity),
        },
      ),
      usersDelta: createMetricCardValue(
        getDeltaMetricLabel(granularity, 'users'),
        periodUserDelta,
        periodUserDelta,
        'emerald',
        {
          formatted: formatNumber(periodUserDelta),
          deltaLabel: '선택 기간 일평균',
          deltaText: formatDecimalDelta(averageUserDelta),
          accentLabel: '선택 기간',
        },
      ),
      spaces: createMetricCardValue(
        getCumulativeMetricLabel(granularity, 'spaces'),
        summary.spaces.cumulative,
        periodSpaceDelta,
        'sky',
        {
          formatted: formatNumber(summary.spaces.cumulative),
          deltaLabel: '선택 기간 증가',
          deltaText: formatDelta(periodSpaceDelta),
          accentLabel: getCurrentBasisAccentLabel(granularity),
        },
      ),
      spacesDelta: createMetricCardValue(
        getDeltaMetricLabel(granularity, 'spaces'),
        periodSpaceDelta,
        periodSpaceDelta,
        'amber',
        {
          formatted: formatNumber(periodSpaceDelta),
          deltaLabel: '선택 기간 일평균',
          deltaText: formatDecimalDelta(averageSpaceDelta),
          accentLabel: '선택 기간',
        },
      ),
    },
    overviewTrend: createTrendSeries(
      granularity,
      'overview',
      '성장 추이',
      granularity === 'day'
        ? '가입자와 공간이 일별로 얼마나 늘었는지 종료일 기준 누적과 함께 봅니다.'
        : '가입자와 공간이 월별로 얼마나 늘었는지 월말 누적과 함께 봅니다.',
      buckets,
    ),
    userTrend: createTrendSeries(
      granularity,
      'users',
      '가입자 성장 추이',
      granularity === 'day'
        ? '가입자가 일별로 얼마나 늘었는지 종료일 기준 누적과 함께 추적합니다.'
        : '가입자가 월별로 얼마나 늘었는지 월말 누적과 함께 추적합니다.',
      buckets,
    ),
    spaceTrend: createLocaleSpaceTrendSeries(granularity, buckets, spaceLocaleRows),
    localeDailyUserTrend: createLocaleDailyUserSeries(granularity, buckets, userLocaleRows),
    totalLocaleRow,
    localeLeaderboard: localeTotals,
    userLocaleRows,
    spaceLocaleRows,
    spaceTypeDistributions: buildSpaceTypeDistributions(data),
  };
}

export function formatGrowthValue(value: GrowthValue) {
  return formatMetricWithDelta(value.cumulative, value.delta);
}

export function formatLocaleShare(value: number) {
  return toPercent(value);
}
