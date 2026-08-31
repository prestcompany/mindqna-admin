import { getCustomTemplates } from '@/client/custom';
import { useQuery } from '@tanstack/react-query';

function useCustoms(by: { page: number; search?: string }) {
  const { page, search } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customs', page, search],
    queryFn: () => getCustomTemplates({ page, search }),
  });

  const templates = data?.templates ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { templates, totalPage, isLoading, refetch };
}

export default useCustoms;
