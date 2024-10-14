import { getCustomTemplates } from '@/client/custom';
import { useQuery } from '@tanstack/react-query';

function useCustoms(by: { page: number }) {
  const { page } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customs', page],
    queryFn: () => getCustomTemplates(page),
  });

  const templates = data?.templates ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { templates, totalPage, isLoading, refetch };
}

export default useCustoms;
