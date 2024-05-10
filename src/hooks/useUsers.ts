import { getUsers } from "@/client/user";
import { useQuery } from "@tanstack/react-query";

type Props = {
  page: number;
  locale?: string[];
};

function useUsers(by: Props) {
  const { page, locale } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users", page, locale],
    queryFn: () => getUsers(page, locale),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useUsers;
