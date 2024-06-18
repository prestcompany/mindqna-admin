import { getToalRooms } from "@/client/room";
import { useQuery } from "@tanstack/react-query";

function useTotalRooms() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["total-rooms"],
    queryFn: () => getToalRooms(),
  });

  const items = data ?? [];

  return { items, isLoading, refetch };
}

export default useTotalRooms;
