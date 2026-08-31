import { getProducts, GetProductsFilters } from "@/client/premium";
import { useQuery } from "@tanstack/react-query";

function useProducts(by: GetProductsFilters) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["products", by],
    queryFn: () => getProducts(by),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useProducts;
