import { getInteriorTemplates, type GetInteriorTemplatesParams } from '@/client/interior';
import { useQuery } from '@tanstack/react-query';

function useInteriors(params: GetInteriorTemplatesParams) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['interiors', params],
    queryFn: () => getInteriorTemplates(params),
  });

  const templates = data?.templates ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { templates, totalPage, isLoading, refetch };
}

export default useInteriors;
