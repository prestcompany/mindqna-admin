import { getCouponBatchCodes } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

type Options = {
  /** Fetch the whole batch in one request so filtering and copying need no network. */
  all?: boolean;
  /** Server-side username search. Shared batches only — see the service comment. */
  search?: string;
};

/** Only fetches while `enabled` — the expanded region mounts lazily. */
function useCouponBatchCodes(batchId: string, page: number, enabled: boolean, options: Options = {}) {
  const { all = false, search } = options;

  const { data, isLoading, isError, refetch } = useQuery({
    // `all` belongs in the key: the two shapes are different responses for the same batch,
    // and sharing a key would serve a 20-row page to a caller expecting the whole set.
    queryKey: ['coupon-batch-codes', batchId, all ? 'all' : page, search ?? ''],
    queryFn: () => getCouponBatchCodes(batchId, page, all, search),
    enabled,
  });

  const items = data?.items ?? [];

  // A shared batch pages over redemptions, so an unredeemed one really returns 0 — which
  // `?? 1` passes straight through and the pager renders as the impossible "1 / 0".
  const totalPage = Math.max(1, data?.pageInfo.totalPage ?? 1);

  return { items, totalPage, isLoading, isError, refetch };
}

export default useCouponBatchCodes;
