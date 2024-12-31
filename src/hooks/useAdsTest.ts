import { getAdsTest } from '@/client/dashboard';
import { useQuery } from '@tanstack/react-query';

type Props = {
  startedAt?: string;
  endedAt?: string;
};

function useAdsTest(by: Props) {
  const { startedAt, endedAt } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adsTest', by],
    queryFn: () => getAdsTest({ startedAt, endedAt }),
  });

  return { data, isLoading, refetch };
}

export default useAdsTest;
