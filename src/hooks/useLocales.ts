import { getLocales } from "@/client/locale";
import { useQuery } from "@tanstack/react-query";

function useLocales(page: number) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["locales", page], queryFn: () => getLocales(page) });

  const locales = data?.words ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { locales, totalPage, isLoading, refetch };
}

export default useLocales;
