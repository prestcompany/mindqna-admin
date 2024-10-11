import { getLocales } from '@/client/locale';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
  key?: string;
  value?: string;
};

function useLocales(by: Props) {
  const { page, locale, key, value } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['locales', page, locale, key, value],
    queryFn: () => getLocales(page, locale, key, value),
  });

  const locales = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { locales, totalPage, isLoading, refetch };
}

export default useLocales;
