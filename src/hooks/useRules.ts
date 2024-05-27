import { getRules } from "@/client/rule";
import { useQuery } from "@tanstack/react-query";

function useRules(page: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rules", page],
    queryFn: () => getRules(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useRules;
