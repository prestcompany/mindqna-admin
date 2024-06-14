import { getBanners } from "@/client/banner";
import { useQuery } from "@tanstack/react-query";

function useBanners(page: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["banners", page],
    queryFn: () => getBanners(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useBanners;
