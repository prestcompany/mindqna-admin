import { getCardTemplates } from '@/client/card';
import { GetCardTemplatesParams } from '@/client/types';
import { useQuery } from '@tanstack/react-query';

function useCardTemplates(by: GetCardTemplatesParams) {
  const { page, ...filter } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cardTemplates', page, by.locale, by.spaceType, by.type],
    queryFn: () => getCardTemplates({ page, ...filter }),
  });

  const templates = data?.templates ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { templates, totalPage, isLoading, refetch };
}

export default useCardTemplates;
