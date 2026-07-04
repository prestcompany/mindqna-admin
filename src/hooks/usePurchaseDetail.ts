import { getPurchaseDetail } from '@/client/premium';
import { useQuery } from '@tanstack/react-query';

function usePurchaseDetail(id: number | null) {
  return useQuery({
    queryKey: ['purchase-detail', id],
    queryFn: () => getPurchaseDetail(id as number),
    enabled: id !== null,
  });
}

export default usePurchaseDetail;
