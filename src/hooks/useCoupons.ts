import { getCoupons } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

function useCoupons(page: number, search?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coupons', page, search],
    queryFn: () => getCoupons(page, search),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useCoupons;
