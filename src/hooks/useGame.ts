import { createGameRewardForTest, getGamePlays, getGameRankings, getGameRewardPolicies, getGameRewards, getGames } from '@/client/game';
import { useMutation, useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
};

export type GameRankingsParams = {
  page: number;
  gameId?: number;
  year?: number;
  month?: number;
  week?: number;
};

export const useGames = (by: Props) => {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['games', page],
    queryFn: () => getGames(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
};

export const useGameRankings = (by: GameRankingsParams) => {
  const { page, ...filter } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gameRankings', page, by.gameId, by.year, by.month, by.week],
    queryFn: () => getGameRankings({ page, ...filter }),
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

export const useGameRewards = (by: GameRankingsParams) => {
  const { page, ...filter } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gameRewards', page, by.gameId, by.year, by.month, by.week],
    queryFn: () => getGameRewards({ page, ...filter }),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
};

export const useGameRewardPolicies = (by: Props) => {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gameRewardPolicies', page],
    queryFn: () => getGameRewardPolicies(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
};

export const useGameRankingRewardCreate = () => {
  const { mutate, data } = useMutation({ mutationFn: () => createGameRewardForTest() });

  return { mutate, data };
};
