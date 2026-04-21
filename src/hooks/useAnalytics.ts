import {
  getCardAnalytics,
  getDashboardGrowthAnalytics,
  getSpaceAnalytics,
  getUserSummaryAnalytics,
  getUsersAnalytics,
} from '@/client/dashboard';
import { Locale, SpaceType } from '@/client/types';
import { useQuery } from '@tanstack/react-query';

type Props = {
  startedAt?: string;
  endedAt?: string;
  spaceType?: SpaceType[];
  locale?: Locale[];
};

function useCardAnalytics() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics/card'],
    queryFn: () => getCardAnalytics(),
  });

  return { data, isLoading, refetch };
}

function useUsersAnalytics(by: Props) {
  const { startedAt, endedAt, locale } = by;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics/users', by],
    queryFn: () => getUsersAnalytics({ startedAt, endedAt, locale }),
  });

  return { data, isLoading, refetch };
}

function useUserSummaryAnalytics() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics/user-summary'],
    queryFn: () => getUserSummaryAnalytics(),
  });

  return { data, isLoading, refetch };
}
function useSpaceAnalytics(by: Props) {
  const { startedAt, endedAt, spaceType, locale } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics/space', by],
    queryFn: () => getSpaceAnalytics({ startedAt, endedAt, spaceType, locale }),
  });

  return { data, isLoading, refetch };
}

function useDashboardGrowthAnalytics(by: Pick<Props, 'startedAt' | 'endedAt' | 'locale'>) {
  const { startedAt, endedAt, locale } = by;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['analytics/dashboard-growth', by],
    queryFn: () => getDashboardGrowthAnalytics({ startedAt, endedAt, locale }),
    placeholderData: (previousData) => previousData,
  });

  return { data, isLoading, isFetching, refetch };
}

export { useCardAnalytics, useDashboardGrowthAnalytics, useSpaceAnalytics, useUserSummaryAnalytics, useUsersAnalytics };
