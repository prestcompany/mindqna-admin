import { getCoupons, type CouponStatus } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

function useCoupons(page: number, search?: string, status?: CouponStatus) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coupons', page, search, status],
    queryFn: () => getCoupons(page, search, status),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useCoupons;
