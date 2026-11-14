import { getInteriorTemplates, type GetInteriorTemplatesParams } from '@/client/interior';
import { listTotal } from '@/lib/list-total';
import { useQuery } from '@tanstack/react-query';

const PAGE_SIZE = 10;

function useInteriors(params: GetInteriorTemplatesParams) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['interiors', params],
    queryFn: () => getInteriorTemplates(params),
  });

  const templates = data?.templates ?? [];

  const total = listTotal({ pageInfo: data?.pageInfo, page: params.page, rows: templates.length, pageSize: PAGE_SIZE });

  return { templates, total, isLoading, refetch };
}

export default useInteriors;
