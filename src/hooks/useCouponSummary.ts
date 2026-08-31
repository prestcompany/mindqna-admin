import { getCouponSummary } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

/** Whole-table counts for the list's summary strip, independent of the current filters. */
function useCouponSummary() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coupon-summary'],
    queryFn: getCouponSummary,
    // This one aggregates across every coupon and every redemption, so it must not run
    // on each window focus the way the app's default (staleTime 0) would have it. The
    // mutations that move these numbers refetch it explicitly.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { summary: data, isLoading, refetch };
}

export default useCouponSummary;
