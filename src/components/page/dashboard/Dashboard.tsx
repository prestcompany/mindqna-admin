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
import DashboardGrowthSkeleton from './sections/DashboardGrowthSkeleton';
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
  const initialRange = getRangeFromPreset('6m');
  const [preset, setPreset] = useState<DashboardRangePreset>('6m');
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
  const { data, isLoading, isFetching } = useDashboardGrowthAnalytics(deferredQuery);
  const { data: userSummary, isLoading: isUserSummaryLoading } = useUserSummaryAnalytics();
  const dashboard = buildDashboardGrowthViewModel(data, selectedLocales);
  const showGrowthFilters = activeTab !== 'cards';
  const isGrowthRefreshing = showGrowthFilters && isFetching && !!data;
  const isGrowthInitialLoading = showGrowthFilters && isLoading && !data;

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

  return (
    <div className='relative flex min-h-screen w-full flex-col gap-6 bg-white pb-8'>
      <DashboardCoreStats
        users={userSummary?.users}
        profiles={userSummary?.profiles}
        removedProfiles={userSummary?.removedProfiles}
        spaces={userSummary?.spaces}
        isLoading={isUserSummaryLoading}
      />

      <section className='space-y-4'>
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
            isRefreshing={isGrowthRefreshing}
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
            {isGrowthInitialLoading ? <DashboardGrowthSkeleton tab='overview' /> : <OverviewTab dashboard={dashboard} />}
          </TabsContent>

          <TabsContent value='users' className='space-y-4'>
            {isGrowthInitialLoading ? <DashboardGrowthSkeleton tab='users' /> : <UserTab dashboard={dashboard} />}
          </TabsContent>

          <TabsContent value='spaces' className='space-y-4'>
            {isGrowthInitialLoading ? <DashboardGrowthSkeleton tab='spaces' /> : <SpaceTab dashboard={dashboard} />}
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
