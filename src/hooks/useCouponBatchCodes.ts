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

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, isError, refetch };
}

export default useCouponBatchCodes;
