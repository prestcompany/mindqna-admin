import { DashboardGrowthResponse, DashboardGrowthMonth, GrowthValue, LocaleGrowthRow } from '@/client/dashboard';
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

function getRangeLabel(months: DashboardGrowthMonth[]) {
  if (!months.length) {
    return '최근 기간';
  }

  if (months.length === 1) {
    return months[0].label;
  }

  return `${months[0].label} - ${months[months.length - 1].label}`;
}

function getSummaryText(months: DashboardGrowthMonth[]) {
  if (!months.length) {
    return '집계 기간 데이터가 아직 없습니다.';
  }

  return `${months.length}개월 흐름을 월말 누적 기준으로 비교합니다.`;
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
  metric: DashboardTrendSeries['metric'],
  title: string,
  description: string,
  months: DashboardGrowthMonth[],
): DashboardTrendSeries {
  const labels = months.map((month) => month.label);
  const monthKeys = months.map((month) => month.month);

  if (metric === 'users') {
    return {
      title,
      description,
      labels,
      months: monthKeys,
      metric,
      datasets: [
        {
          label: '월간 순증 가입자',
          type: 'bar',
          values: months.map((month) => month.users.delta),
          color: '#10b981',
          yAxisID: 'y',
        },
        {
          label: '월말 누적 가입자',
          type: 'line',
          values: months.map((month) => month.users.cumulative),
          color: '#0f172a',
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
      months: monthKeys,
      metric,
      datasets: [
        {
          label: '월간 순증 공간',
          type: 'bar',
          values: months.map((month) => month.spaces.delta),
          color: '#0ea5e9',
          yAxisID: 'y',
        },
        {
          label: '월말 누적 공간',
          type: 'line',
          values: months.map((month) => month.spaces.cumulative),
          color: '#0f172a',
          yAxisID: 'y1',
        },
      ],
    };
  }

  return {
    title,
    description,
    labels,
    months: monthKeys,
    metric,
    datasets: [
      {
        label: '가입자 월간 순증',
        type: 'bar',
        values: months.map((month) => month.users.delta),
        color: '#10b981',
        yAxisID: 'y',
      },
      {
        label: '공간 월간 순증',
        type: 'bar',
        values: months.map((month) => month.spaces.delta),
        color: '#f59e0b',
        yAxisID: 'y',
      },
      {
        label: '가입자 월말 누적',
        type: 'line',
        values: months.map((month) => month.users.cumulative),
        color: '#0f172a',
        yAxisID: 'y1',
      },
      {
        label: '공간 월말 누적',
        type: 'line',
        values: months.map((month) => month.spaces.cumulative),
        color: '#475569',
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

function ensureRowOrder(rows: LocaleGrowthRow[], localesInMonths: LocaleGrowthRow[]) {
  if (rows.length) {
    return rows;
  }

  return localesInMonths;
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
  const months = data?.months ?? [];
  const summary = data?.summary ?? {
    users: { cumulative: 0, delta: 0 },
    spaces: { cumulative: 0, delta: 0 },
  };
  const latestMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const localeSeed = months[months.length - 1]?.locales ?? [];
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
    isEmpty: months.length === 0,
    rangeLabel: getRangeLabel(months),
    rangeSummary: getSummaryText(months),
    lastUpdatedLabel: latestMonth?.label ?? '데이터 없음',
    selectedLocalesLabel: getSelectedLocalesLabel(selectedLocales),
    selectedLocaleCount: selectedLocales.length || DASHBOARD_LOCALES.length,
    kpis: {
      users: createMetricCardValue('누적 가입자', summary.users.cumulative, summary.users.delta, 'slate', {
        deltaLabel: '이번 달 순증',
        accentLabel: '월말 누적',
      }),
      usersDelta: createMetricCardValue('가입자 순증', summary.users.delta, summary.users.delta, 'emerald', {
        formatted: formatNumber(latestMonth?.users.delta ?? 0),
        deltaLabel: '직전 월 대비',
        deltaText: formatDelta((latestMonth?.users.delta ?? 0) - (previousMonth?.users.delta ?? 0)),
        accentLabel: '이번 달',
      }),
      spaces: createMetricCardValue('누적 공간', summary.spaces.cumulative, summary.spaces.delta, 'sky', {
        deltaLabel: '이번 달 순증',
        accentLabel: '월말 누적',
      }),
      spacesDelta: createMetricCardValue('공간 순증', summary.spaces.delta, summary.spaces.delta, 'amber', {
        formatted: formatNumber(latestMonth?.spaces.delta ?? 0),
        deltaLabel: '직전 월 대비',
        deltaText: formatDelta((latestMonth?.spaces.delta ?? 0) - (previousMonth?.spaces.delta ?? 0)),
        accentLabel: '이번 달',
      }),
    },
    overviewTrend: createTrendSeries('overview', '성장 추이', '가입자와 공간의 월간 순증 및 월말 누적을 함께 봅니다.', months),
    userTrend: createTrendSeries('users', '가입자 성장 추이', '월간 순증과 월말 누적을 동시에 추적합니다.', months),
    spaceTrend: createTrendSeries('spaces', '공간 성장 추이', '운영 규모가 어떤 속도로 커졌는지 보여줍니다.', months),
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
