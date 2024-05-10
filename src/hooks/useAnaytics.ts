import { getAnalytics } from "@/client/dashboard";
import { SpaceType } from "@/client/types";
import { useQuery } from "@tanstack/react-query";

type Props = {
  startedAt?: string;
  endedAt?: string;
  spaceType?: SpaceType[];
  locale?: string[];
};

function useAnalytics(by: Props) {
  const { startedAt, endedAt, spaceType, locale } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["analytics", by],
    queryFn: () => getAnalytics({ startedAt, endedAt, locale, spaceType }),
  });

  return { data, isLoading, refetch };
}

export default useAnalytics;
