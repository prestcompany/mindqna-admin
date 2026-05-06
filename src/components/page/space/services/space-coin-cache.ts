import { QueryClient } from '@tanstack/react-query';

type CoinMutationQueryClient = Pick<QueryClient, 'invalidateQueries'>;

type RefreshSpaceCoinMutationCachesParams = {
  spaceId: string;
  queryClient: CoinMutationQueryClient;
  reload: () => Promise<unknown>;
};

const getSpaceCoinMutationInvalidationFilters = (spaceId: string) => [
  { queryKey: ['space-search-detail', spaceId] },
  { queryKey: ['space-detail', spaceId] },
];

export async function refreshSpaceCoinMutationCaches({
  spaceId,
  queryClient,
  reload,
}: RefreshSpaceCoinMutationCachesParams) {
  const detailRefresh = spaceId
    ? Promise.all(getSpaceCoinMutationInvalidationFilters(spaceId).map((filters) => queryClient.invalidateQueries(filters)))
    : Promise.resolve();

  await Promise.all([reload(), detailRefresh]);
}
