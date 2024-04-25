import { getAssets } from "@/client/assets";
import { useInfiniteQuery } from "@tanstack/react-query";

function useAssets() {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["assets"],
    queryFn: ({ pageParam }) => getAssets(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.pageInfo.hasNext ? last.pageInfo.endCursor : null),
  });

  const imgs = data?.pages.flatMap((page) => page.imgs) ?? [];

  const fetchMore = () => {
    if (!hasNextPage) return;
    if (isLoading || isFetchingNextPage) return;

    fetchNextPage();
  };

  return { imgs, isLoading, hasNextPage, fetchMore };
}

export default useAssets;
