import { getCouponBatchCodes } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

/** Only fetches while `enabled` — the expanded region mounts lazily. */
function useCouponBatchCodes(batchId: string, page: number, enabled: boolean) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['coupon-batch-codes', batchId, page],
    queryFn: () => getCouponBatchCodes(batchId, page),
    enabled,
  });

  const items = data?.items ?? [];

  // A shared batch pages over redemptions, so an unredeemed one really returns 0 — which
  // `?? 1` passes straight through and the pager renders as the impossible "1 / 0".
  // Clamping here also gives the caller's page clamp a floor of 1 to settle on.
  const totalPage = Math.max(1, data?.pageInfo.totalPage ?? 1);

  return { items, totalPage, isLoading, isError, refetch };
}

export default useCouponBatchCodes;
