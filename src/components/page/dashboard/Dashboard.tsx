import Spinner from '@/components/shared/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Locale } from '@/client/types';
import { useDashboardGrowthAnalytics, useUserSummaryAnalytics } from '@/hooks/useAnalytics';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import DashboardCoreStats from './sections/DashboardCoreStats';
import { DASHBOARD_LOCALES, DashboardRangePreset, DashboardTabValue } from './types/growth';
import { buildDashboardGrowthViewModel } from './utils/growth-mappers';
import CardTab from './tabs/CardTab';
import DashboardFilterBar from './sections/DashboardFilterBar';
import DashboardHero from './sections/DashboardHero';
import OverviewTab from './tabs/OverviewTab';
import SpaceTab from './tabs/SpaceTab';
import UserTab from './tabs/UserTab';

dayjs.extend(weekday);
dayjs.extend(localeData);

function getRangeFromPreset(preset: DashboardRangePreset) {
  const now = dayjs();

  switch (preset) {
    case '6m':
      return {
        startedAt: now.subtract(5, 'month').startOf('month'),
        endedAt: now.endOf('month'),
      };
    case 'ytd':
      return {
        startedAt: now.startOf('year'),
        endedAt: now.endOf('month'),
      };
    case 'custom':
      return {
        startedAt: now.subtract(11, 'month').startOf('month'),
        endedAt: now.endOf('month'),
      };
    case '12m':
    default:
      return {
        startedAt: now.subtract(11, 'month').startOf('month'),
        endedAt: now.endOf('month'),
      };
  }
}

function Dashboard() {
  const initialRange = getRangeFromPreset('12m');
  const [preset, setPreset] = useState<DashboardRangePreset>('12m');
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs | null>(initialRange.startedAt);
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs | null>(initialRange.endedAt);
  const [activeTab, setActiveTab] = useState<DashboardTabValue>('overview');
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>(DASHBOARD_LOCALES);
  const safeStartedAt = startedAt ?? initialRange.startedAt;
  const safeEndedAt = endedAt ?? initialRange.endedAt;
  const query = useMemo(
    () => ({
      startedAt: safeStartedAt.format('YYYY-MM-DD'),
      endedAt: safeEndedAt.format('YYYY-MM-DD'),
      locale: selectedLocales.length === DASHBOARD_LOCALES.length ? undefined : selectedLocales,
    }),
    [safeEndedAt, safeStartedAt, selectedLocales],
  );
  const deferredQuery = useDeferredValue(query);
  const { data, isLoading } = useDashboardGrowthAnalytics(deferredQuery);
  const { data: userSummary, isLoading: isUserSummaryLoading } = useUserSummaryAnalytics();
  const dashboard = buildDashboardGrowthViewModel(data, selectedLocales);
  const showGrowthFilters = activeTab !== 'cards';

  const handleTabChange = (value: string) => {
    setActiveTab(value as DashboardTabValue);
  };

  const handlePresetChange = (nextPreset: DashboardRangePreset) => {
    startTransition(() => {
      setPreset(nextPreset);
      if (nextPreset !== 'custom') {
        const range = getRangeFromPreset(nextPreset);
        setStartedAt(range.startedAt);
        setEndedAt(range.endedAt);
      }
    });
  };

  const handleStartedAtChange = (date: dayjs.Dayjs | null) => {
    startTransition(() => {
      setPreset('custom');
      if (!date) {
        setStartedAt(null);
        return;
      }

      const nextStartedAt = date.startOf('month');
      setStartedAt(nextStartedAt);

      if (endedAt && nextStartedAt.isAfter(endedAt, 'month')) {
        setEndedAt(nextStartedAt.endOf('month'));
      }
    });
  };

  const handleEndedAtChange = (date: dayjs.Dayjs | null) => {
    startTransition(() => {
      setPreset('custom');
      if (!date) {
        setEndedAt(null);
        return;
      }

      const nextEndedAt = date.endOf('month');
      setEndedAt(nextEndedAt);

      if (startedAt && nextEndedAt.isBefore(startedAt, 'month')) {
        setStartedAt(nextEndedAt.startOf('month'));
      }
    });
  };

  const handleToggleLocale = (locale: Locale) => {
    setSelectedLocales((current) => {
      const exists = current.includes(locale);
      if (exists) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== locale);
      }
      return [...current, locale];
    });
  };

  const handleSelectAllLocales = () => {
    startTransition(() => {
      setSelectedLocales(DASHBOARD_LOCALES);
    });
  };

  const pageLoading = activeTab !== 'cards' && isLoading;

  return (
    <div className='relative flex min-h-screen w-full flex-col gap-6 bg-slate-50 pb-8'>
      <DashboardHero
        title='대시보드'
        description='월말 누적과 월간 순증을 빠르게 스캔할 수 있도록 성장 지표를 다시 정렬했습니다.'
        rangeLabel={dashboard.rangeLabel}
        rangeSummary={dashboard.rangeSummary}
        lastUpdatedLabel={dashboard.lastUpdatedLabel}
        selectedLocalesLabel={dashboard.selectedLocalesLabel}
      />

      <DashboardCoreStats
        users={userSummary?.users}
        profiles={userSummary?.profiles}
        removedProfiles={userSummary?.removedProfiles}
        isLoading={isUserSummaryLoading}
      />

      {showGrowthFilters && (
        <DashboardFilterBar
          preset={preset}
          onPresetChange={handlePresetChange}
          startedAt={startedAt}
          endedAt={endedAt}
          setStartedAt={handleStartedAtChange}
          setEndedAt={handleEndedAtChange}
          locales={DASHBOARD_LOCALES}
          selectedLocales={selectedLocales}
          onToggleLocale={handleToggleLocale}
          onSelectAllLocales={handleSelectAllLocales}
        />
      )}

      <Tabs value={activeTab} className='space-y-4' onValueChange={handleTabChange}>
        <TabsList className='w-fit rounded-2xl border border-slate-200 bg-white p-1 shadow-sm'>
          <TabsTrigger value='overview'>개요</TabsTrigger>
          <TabsTrigger value='users'>가입자</TabsTrigger>
          <TabsTrigger value='spaces'>공간</TabsTrigger>
          <TabsTrigger value='cards'>질문</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <OverviewTab dashboard={dashboard} />
        </TabsContent>

        <TabsContent value='users' className='space-y-4'>
          <UserTab dashboard={dashboard} />
        </TabsContent>

        <TabsContent value='spaces' className='space-y-4'>
          <SpaceTab dashboard={dashboard} />
        </TabsContent>

        <TabsContent value='cards' className='space-y-4'>
          <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm'>
            질문 탭은 전체 질문 풀 기준 운영 현황을 보여주며, 기간/국가 필터는 가입자와 공간 성장 탭에서만 적용됩니다.
          </div>
          <CardTab />
        </TabsContent>
      </Tabs>

      {pageLoading && <Spinner />}
    </div>
  );
}

export default Dashboard;
