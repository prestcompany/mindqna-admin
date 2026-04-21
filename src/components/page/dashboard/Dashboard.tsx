import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardGrowthGranularity } from '@/client/dashboard';
import { Locale } from '@/client/types';
import { useDashboardGrowthAnalytics, useUserSummaryAnalytics } from '@/hooks/useAnalytics';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import { Loader2 } from 'lucide-react';
import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import DashboardCoreStats from './sections/DashboardCoreStats';
import { DASHBOARD_LOCALES, DashboardRangePreset, DashboardTabValue } from './types/growth';
import { buildDashboardGrowthViewModel } from './utils/growth-mappers';
import CardTab from './tabs/CardTab';
import DashboardFilterBar from './sections/DashboardFilterBar';
import DashboardGrowthSkeleton from './sections/DashboardGrowthSkeleton';
import OverviewTab from './tabs/OverviewTab';
import SpaceTab from './tabs/SpaceTab';
import UserTab from './tabs/UserTab';

dayjs.extend(weekday);
dayjs.extend(localeData);

function getDefaultPreset(granularity: DashboardGrowthGranularity): DashboardRangePreset {
  return granularity === 'day' ? '30d' : '6m';
}

function getRangeFromPreset(granularity: DashboardGrowthGranularity, preset: DashboardRangePreset) {
  const now = dayjs();

  if (granularity === 'day') {
    switch (preset) {
      case '7d':
        return {
          startedAt: now.subtract(6, 'day').startOf('day'),
          endedAt: now.endOf('day'),
        };
      case '90d':
        return {
          startedAt: now.subtract(89, 'day').startOf('day'),
          endedAt: now.endOf('day'),
        };
      case 'custom':
      case '30d':
      default:
        return {
          startedAt: now.subtract(29, 'day').startOf('day'),
          endedAt: now.endOf('day'),
        };
    }
  }

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
    case '12m':
    default:
      return {
        startedAt: now.subtract(11, 'month').startOf('month'),
        endedAt: now.endOf('month'),
      };
  }
}

function Dashboard() {
  const initialGranularity: DashboardGrowthGranularity = 'month';
  const initialPreset = getDefaultPreset(initialGranularity);
  const initialRange = getRangeFromPreset(initialGranularity, initialPreset);
  const [granularity, setGranularity] = useState<DashboardGrowthGranularity>(initialGranularity);
  const [preset, setPreset] = useState<DashboardRangePreset>(initialPreset);
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
      granularity,
    }),
    [granularity, safeEndedAt, safeStartedAt, selectedLocales],
  );
  const deferredQuery = useDeferredValue(query);
  const { data, isLoading, isFetching } = useDashboardGrowthAnalytics(deferredQuery);
  const { data: userSummary, isLoading: isUserSummaryLoading } = useUserSummaryAnalytics();
  const dashboard = buildDashboardGrowthViewModel(data, selectedLocales);
  const showGrowthFilters = activeTab !== 'cards';
  const isGranularitySwitching = showGrowthFilters && !!data && data.granularity !== granularity;
  const isGrowthRefreshing = showGrowthFilters && isFetching && !!data && !isGranularitySwitching;
  const isGrowthInitialLoading = showGrowthFilters && ((isLoading && !data) || isGranularitySwitching);

  const handleTabChange = (value: string) => {
    setActiveTab(value as DashboardTabValue);
  };

  const handlePresetChange = (nextPreset: DashboardRangePreset) => {
    startTransition(() => {
      setPreset(nextPreset);
      if (nextPreset !== 'custom') {
        const range = getRangeFromPreset(granularity, nextPreset);
        setStartedAt(range.startedAt);
        setEndedAt(range.endedAt);
      }
    });
  };

  const handleGranularityChange = (nextGranularity: DashboardGrowthGranularity) => {
    startTransition(() => {
      const nextPreset = getDefaultPreset(nextGranularity);
      const range = getRangeFromPreset(nextGranularity, nextPreset);

      setGranularity(nextGranularity);
      setPreset(nextPreset);
      setStartedAt(range.startedAt);
      setEndedAt(range.endedAt);
    });
  };

  const handleStartedAtChange = (date: dayjs.Dayjs | null) => {
    startTransition(() => {
      setPreset('custom');
      if (!date) {
        setStartedAt(null);
        return;
      }

      const nextStartedAt = granularity === 'day' ? date.startOf('day') : date.startOf('month');
      setStartedAt(nextStartedAt);

      if (endedAt && nextStartedAt.isAfter(endedAt, granularity)) {
        setEndedAt(granularity === 'day' ? nextStartedAt.endOf('day') : nextStartedAt.endOf('month'));
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

      const nextEndedAt = granularity === 'day' ? date.endOf('day') : date.endOf('month');
      setEndedAt(nextEndedAt);

      if (startedAt && nextEndedAt.isBefore(startedAt, granularity)) {
        setStartedAt(granularity === 'day' ? nextEndedAt.startOf('day') : nextEndedAt.startOf('month'));
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

  return (
    <div className='relative flex min-h-screen w-full flex-col gap-6 bg-white pb-8'>
      <DashboardCoreStats
        users={userSummary?.users}
        profiles={userSummary?.profiles}
        removedProfiles={userSummary?.removedProfiles}
        spaces={userSummary?.spaces}
        isLoading={isUserSummaryLoading}
      />

      <div className='h-px w-full bg-slate-200' />

      <section className='space-y-4'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1.5'>
              <p className='text-base font-semibold text-slate-900 sm:text-lg'>세부 현황</p>
              <p className='text-sm leading-6 text-slate-600 sm:text-[15px]'>
                기간과 국가 설정을 기준으로 가입자와 공간 성장, 로케일별 분포를 비교하는 영역입니다.
              </p>
            </div>
            <div className='w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'>
              기간 / 국가 설정 적용
            </div>
          </div>
        </div>

        {showGrowthFilters && (
          <DashboardFilterBar
            granularity={granularity}
            onGranularityChange={handleGranularityChange}
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
            {isGrowthInitialLoading ? (
              <DashboardGrowthSkeleton tab='overview' />
            ) : (
              <div className='relative'>
                {isGrowthRefreshing && (
                  <div className='absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[1px]'>
                    <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm'>
                      <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                      데이터를 업데이트하는 중입니다.
                    </div>
                  </div>
                )}
                <OverviewTab dashboard={dashboard} />
              </div>
            )}
          </TabsContent>

          <TabsContent value='users' className='space-y-4'>
            {isGrowthInitialLoading ? (
              <DashboardGrowthSkeleton tab='users' />
            ) : (
              <div className='relative'>
                {isGrowthRefreshing && (
                  <div className='absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[1px]'>
                    <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm'>
                      <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                      데이터를 업데이트하는 중입니다.
                    </div>
                  </div>
                )}
                <UserTab dashboard={dashboard} />
              </div>
            )}
          </TabsContent>

          <TabsContent value='spaces' className='space-y-4'>
            {isGrowthInitialLoading ? (
              <DashboardGrowthSkeleton tab='spaces' />
            ) : (
              <div className='relative'>
                {isGrowthRefreshing && (
                  <div className='absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[1px]'>
                    <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm'>
                      <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                      데이터를 업데이트하는 중입니다.
                    </div>
                  </div>
                )}
                <SpaceTab dashboard={dashboard} />
              </div>
            )}
          </TabsContent>

          <TabsContent value='cards' className='space-y-4'>
            <CardTab />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

export default Dashboard;
