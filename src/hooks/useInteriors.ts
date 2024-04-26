import { getInteriorTemplates } from "@/client/interior";
import { useQuery } from "@tanstack/react-query";

function useInteriors(by: { page: number }) {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["interiors", page],
    queryFn: () => getInteriorTemplates(page),
  });

  const templates = data?.templates ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { templates, totalPage, isLoading, refetch };
}

export default useInteriors;
