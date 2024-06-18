import { getPruchases } from "@/client/premium";
import { useQuery } from "@tanstack/react-query";

type Props = {
  page: number;
};

function usePurchases(by: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchaees", by],
    queryFn: () => getPruchases(by),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default usePurchases;
