import { getSpaceCoins } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceCoinStats from './SpaceCoinStats';
import SpaceTabList from './SpaceTabList';

function SpaceCoinsTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['space-coins', spaceId, page],
    queryFn: () => getSpaceCoins(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <div className='space-y-4'>
      <SpaceCoinStats spaceId={spaceId} active={active} />
      <SpaceTabList
        isLoading={isFetching && !data}
        isEmpty={!!data && items.length === 0}
        emptyText='재화 이용 내역이 없습니다.'
        page={page}
        totalPage={data?.pageInfo.totalPage ?? 1}
        totalCount={data?.totalCount ?? 0}
        onPageChange={setPage}
      >
        {items.map((meta) => {
        const isSpend = meta.isUse || meta.amount < 0;
        const actor = meta.profile?.nickname ?? meta.profile?.user?.username ?? '-';
        return (
          <div
            key={meta.id}
            className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
          >
            <Badge variant={meta.isPaid ? 'softWarning' : 'softDanger'} className='w-11 shrink-0 justify-center'>
              {meta.isPaid ? '스타' : '하트'}
            </Badge>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-slate-900'>{actor}</div>
              <div className='truncate text-xs text-slate-500'>
                {isSpend ? '사용' : '지급'} · {meta.description || '사유 없음'}
              </div>
            </div>
            <div className='shrink-0 text-right'>
              <div className={cn('text-sm font-bold tabular-nums', isSpend ? 'text-rose-600' : 'text-emerald-600')}>
                {isSpend ? '-' : '+'}
                {Math.abs(meta.amount)}
              </div>
              <div className='text-[11px] text-slate-500'>{dayjs(meta.createdAt).format('MM.DD HH:mm')}</div>
            </div>
          </div>
        );
      })}
      </SpaceTabList>
    </div>
  );
}

export default SpaceCoinsTab;
