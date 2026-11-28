import { getBannerStats } from '@/client/banner';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

type Props = {
  id?: number;
  from: string;
  to: string;
  /** False while the range is invalid, so an impossible request is never sent. */
  enabled?: boolean;
};

function useBannerStats(by: Props) {
  const { id, from, to, enabled = true } = by;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['banner-stats', id, from, to],
    queryFn: () => getBannerStats(id!, { from, to }),
    enabled: enabled && id != null,
    // Keep the last range on screen while the next one loads instead of blanking the sheet.
    placeholderData: keepPreviousData,
  });

  return { stats: data, isLoading, isError, error };
}

export default useBannerStats;
