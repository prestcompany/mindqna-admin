import { getLocales } from '@/client/locale';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
};

function useLocales(by: Props) {
  const { page, locale } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['locales', page, locale],
    queryFn: () => getLocales(page, locale),
  });

  const locales = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { locales, totalPage, isLoading, refetch };
}

export default useLocales;
