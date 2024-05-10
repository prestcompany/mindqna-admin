import { getTickets } from "@/client/premium";
import { useQuery } from "@tanstack/react-query";

type Props = {};

function useTickets(by: Props) {
  const {} = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => getTickets(),
  });

  const items = data ?? [];

  return { items, isLoading, refetch };
}

export default useTickets;
