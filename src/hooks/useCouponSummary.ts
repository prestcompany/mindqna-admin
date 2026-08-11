import { getCouponSummary } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

/** Whole-table counts for the list's summary strip, independent of the current filters. */
function useCouponSummary() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coupon-summary'],
    queryFn: getCouponSummary,
  });

  return { summary: data, isLoading, refetch };
}

export default useCouponSummary;
