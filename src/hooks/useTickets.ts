import { getTickets } from "@/client/premium";
import { useQuery } from "@tanstack/react-query";

type Props = {
  page: number;
  type?: ("permanent" | "subscribe")[];
};

function useTickets(by: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tickets", by],
    queryFn: () => getTickets(by),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useTickets;
