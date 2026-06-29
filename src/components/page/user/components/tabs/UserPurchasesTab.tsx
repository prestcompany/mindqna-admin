import { getUserPurchases } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
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
        <div
          key={row.id}
          className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <Badge variant='softNeutral' className='w-16 shrink-0 justify-center uppercase'>
            {row.platform}
          </Badge>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-slate-900'>{row.productId}</div>
            <div className='truncate text-[11px] text-slate-500'>
              {row.isSubscribe ? '구독' : '단건'} · {dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}
            </div>
          </div>
          <div className='shrink-0 text-sm font-semibold tabular-nums text-slate-900'>{row.price}</div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default UserPurchasesTab;
