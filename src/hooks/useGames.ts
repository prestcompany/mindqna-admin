import { getGames } from '@/client/game';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  limit: number;
};

function useGames(by: Props) {
  const { page, limit } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['games', page, limit],
    queryFn: () => getGames(page, limit),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useGames;
