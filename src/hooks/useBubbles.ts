import { getBubbless } from "@/client/bubble";
import { BubbleType } from "@/client/types";
import { useQuery } from "@tanstack/react-query";

function useBubbles(page: number, type?: BubbleType[], locale?: string[]) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bubbles", page, type, locale],
    queryFn: () => getBubbless(page, type, locale),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useBubbles;
