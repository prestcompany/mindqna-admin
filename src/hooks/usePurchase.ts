import { getPurchases } from '@/client/premium';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  username?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  status?: 'success' | 'failed' | 'expired';
  isProduction?: boolean;
  isSubscribe?: boolean;
};

function usePurchases(by: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchases', by],
    queryFn: () => getPurchases(by),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default usePurchases;
