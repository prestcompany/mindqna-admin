import { getBubbless } from "@/client/bubble";
import { useQuery } from "@tanstack/react-query";

function useBubbles(page: number) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["bubbles", page], queryFn: () => getBubbless(page) });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useBubbles;
