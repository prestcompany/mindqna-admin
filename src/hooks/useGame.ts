import { createGameRewardForTest, getGamePlays, getGameRankings, getGameRewardPolicies, getGameRewards, getGames } from '@/client/game';
import { useMutation, useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
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

export const useGameRewards = (by: Props) => {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gameRewards', page],
    queryFn: () => getGameRewards(page),
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
