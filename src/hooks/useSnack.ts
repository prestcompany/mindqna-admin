import { getSnacks } from "@/client/snack";
import { useQuery } from "@tanstack/react-query";

function useSnacks(page: number) {
  const { data, isLoading } = useQuery({ queryKey: ["snacks", page], queryFn: () => getSnacks(page) });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading };
}

export default useSnacks;
