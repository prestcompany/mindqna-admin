import { getUserPurchases } from '@/client/user';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import PurchaseHistoryRow from '@/components/shared/purchase/PurchaseHistoryRow';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

function UserPurchasesTab({ username, active }: { username: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['user-purchases', username, page],
    queryFn: () => getUserPurchases(username, page),
    enabled: active && !!username,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='결제 내역이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((row) => (
        <PurchaseHistoryRow key={row.id} row={row} />
      ))}
    </SpaceTabList>
  );
}

export default UserPurchasesTab;
