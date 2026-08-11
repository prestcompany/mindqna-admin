import { getCoupons, type CouponSort, type CouponStatus } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

function useCoupons(page: number, search?: string, status?: CouponStatus, sort?: CouponSort) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coupons', page, search, status, sort],
    queryFn: () => getCoupons(page, search, status, sort),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useCoupons;
