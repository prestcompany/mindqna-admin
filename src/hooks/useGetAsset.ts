import { getAsset } from "@/client/assets";
import { useQuery } from "@tanstack/react-query";

function useGetAsset(id: number) {
  const { data } = useQuery({ queryKey: ["asset", id], queryFn: () => getAsset(id) });

  return data;
}

export default useGetAsset;
