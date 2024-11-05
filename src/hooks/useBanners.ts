import { getBanners } from '@/client/banner';
import { BannerLocationType } from '@/client/types';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
  location?: BannerLocationType[];
};

function useBanners(by: Props) {
  const { page, locale, location } = by;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['banners', page, locale, location],
    queryFn: () => getBanners(page, locale, location),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useBanners;
