import { getRooms } from "@/client/room";
import { useQuery } from "@tanstack/react-query";

function useRooms(page: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rooms", page],
    queryFn: () => getRooms(page),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useRooms;
