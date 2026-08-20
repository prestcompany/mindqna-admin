import { getPushes } from '@/client/push';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
  status?: string[];
};

const SENDING_POLL_MS = 5_000;

function usePushes({ page, locale, status }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pushes', page, locale, status],
    queryFn: () => getPushes(page, locale, status),
    // Polling is switched on by a condition, never left on by default — the same
    // reason cf6f664 stopped the coupon aggregate refetching on window focus.
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.status === 'SENDING') ? SENDING_POLL_MS : false,
  });

  return {
    items: data?.items ?? [],
    totalPage: data?.pageInfo.totalPage ?? 1,
    isLoading,
    refetch,
  };
}

export default usePushes;
