import { getLocales } from "@/client/locale";
import { useQuery } from "@tanstack/react-query";

function useLocales(page: number) {
  const { data, isLoading } = useQuery({ queryKey: ["locales"], queryFn: () => getLocales(page) });

  const locales = data?.words ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { locales, totalPage, isLoading };
}

export default useLocales;
