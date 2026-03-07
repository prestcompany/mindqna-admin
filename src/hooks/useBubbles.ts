import { getBubbless } from '@/client/bubble';
import { BubbleType } from '@/client/types';
import { useQuery } from '@tanstack/react-query';

type UseBubblesParams = {
  page: number;
  type?: BubbleType[];
  locale?: string[];
  level?: number;
  search?: string;
};

function useBubbles({ page, type, locale, level, search }: UseBubblesParams) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bubbles', page, type, locale, level, search],
    queryFn: () => getBubbless({ page, type, locale, level, search }),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useBubbles;
