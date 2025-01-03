import { getGamePlays, getGameRankings, getGames } from '@/client/game';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
};

export const useGames = (by: Props) => {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['games', page],
    queryFn: () => getGames(page),
  });

  console.log('data', data);

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
};

export const useGameRankings = (by: Props) => {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gameRankings', page],
    queryFn: () => getGameRankings(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
};

export const useGamePlays = (by: Props) => {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gamePlays', page],
    queryFn: () => getGamePlays(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
};
