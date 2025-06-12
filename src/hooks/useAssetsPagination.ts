import { getAssets } from '@/client/assets';
import { useQuery } from '@tanstack/react-query';

function useAssetsPagination(page: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['assets-pagination', page],
    queryFn: () => getAssets(page),
  });

  const imgs = data?.imgs ?? [];
  const hasNext = data?.pageInfo?.hasNext ?? false;
  const endCursor = data?.pageInfo?.endCursor;

  return { imgs, hasNext, endCursor, isLoading, refetch };
}

export default useAssetsPagination;
