import { getCardTemplates } from "@/client/card";
import { GetCardTemplatesParams } from "@/client/types";
import { useQuery } from "@tanstack/react-query";

function useCardTemplates(by: GetCardTemplatesParams) {
  const { page, ...filter } = by;

  const { data, isLoading } = useQuery({
    queryKey: ["cardTemplates", page, by.locale, by.spaceType, by.type],
    queryFn: () => getCardTemplates({ page, ...filter }),
  });

  const templates = data?.templates ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { templates, totalPage, isLoading };
}

export default useCardTemplates;
