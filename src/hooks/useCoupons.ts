import { getCoupons } from "@/client/coupon";
import { useQuery } from "@tanstack/react-query";

function useCoupons(page: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["coupons", page],
    queryFn: () => getCoupons(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useCoupons;
