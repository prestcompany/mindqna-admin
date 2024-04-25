import { getInteriorTemplates } from "@/client/interior";
import { useInfiniteQuery } from "@tanstack/react-query";

function useInteriors() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["interiors"],
    queryFn: ({ pageParam }) => getInteriorTemplates(pageParam),
    getNextPageParam: (last) => (last.pageInfo.hasNext ? last.pageInfo.endCursor : 0),
    initialPageParam: 0,
  });

  const templates = data?.pages.flatMap((page) => page.templates) ?? [];

  const fetchMore = () => {
    if (!hasNextPage) return;
    if (isFetchingNextPage || isLoading) return;
    fetchNextPage();
  };

  return { templates, fetchMore, isLoading, hasNextPage };
}

export default useInteriors;
