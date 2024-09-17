import { getPushes } from '@/client/push';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
};

function usePushes(by: Props) {
  const { page, locale } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pushes', page, locale],
    queryFn: () => getPushes(page, locale),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default usePushes;
