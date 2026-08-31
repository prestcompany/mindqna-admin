import { getPushes } from '@/client/push';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
  status?: string[];
};

const SENDING_POLL_MS = 5_000;

function usePushes({ page, locale, status }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['pushes', page, locale, status],
    queryFn: () => getPushes(page, locale, status),
    // Polling is switched on by a condition, never left on by default — the same
    // reason cf6f664 stopped the coupon aggregate refetching on window focus.
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.status === 'SENDING') ? SENDING_POLL_MS : false,
  });

  // No refetch: the list is invalidated through the query client after every mutation, and
  // handing one out was the defect that let callers reload the list two different ways.
  return {
    items: data?.items ?? [],
    totalPage: data?.pageInfo.totalPage ?? 1,
    // Entries, not rows: the server counts a folded campaign once, so the footer can stop
    // deriving a count from totalPage × page size and be wrong whenever the last page is
    // short or a campaign spans several rows.
    total: data?.pageInfo.total ?? 0,
    isLoading,
  };
}

export default usePushes;
