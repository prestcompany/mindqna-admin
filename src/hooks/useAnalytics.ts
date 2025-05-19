import { getCardAnalytics, getSpaceAnalytics, getUsersAnalytics } from '@/client/dashboard';
import { SpaceType } from '@/client/types';
import { useQuery } from '@tanstack/react-query';

type Props = {
  startedAt?: string;
  endedAt?: string;
  spaceType?: SpaceType[];
  locale?: string[];
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
function useSpaceAnalytics(by: Props) {
  const { startedAt, endedAt, spaceType, locale } = by;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics/space', by],
    queryFn: () => getSpaceAnalytics({ startedAt, endedAt, spaceType, locale }),
  });

  return { data, isLoading, refetch };
}

export { useCardAnalytics, useSpaceAnalytics, useUsersAnalytics };
