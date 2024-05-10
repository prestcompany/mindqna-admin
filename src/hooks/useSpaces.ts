import { getSpaces } from "@/client/space";
import { SpaceType } from "@/client/types";
import { useQuery } from "@tanstack/react-query";

type Props = {
  page: number;
  type?: SpaceType[];
  locale?: string[];
};

function useSpaces(by: Props) {
  const { page, type, locale } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["spaces", by],
    queryFn: () => getSpaces(page, type, locale),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useSpaces;
