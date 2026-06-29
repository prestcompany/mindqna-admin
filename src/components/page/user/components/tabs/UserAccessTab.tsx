import { getUserAccess } from '@/client/user';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Heart } from 'lucide-react';
import { useState } from 'react';

function UserAccessTab({ username, active }: { username: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['user-access', username, page],
    queryFn: () => getUserAccess(username, page),
    enabled: active && !!username,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='접속 기록이 없습니다.'
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
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-slate-900'>{row.spaceName ?? row.spaceId}</div>
            <div className='truncate text-[11px] text-slate-500'>{dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}</div>
          </div>
          <div
            className={cn(
              'flex shrink-0 items-center gap-1 text-sm tabular-nums',
              row.heart > 0 ? 'text-rose-600' : 'text-slate-500',
            )}
          >
            <Heart className='h-3.5 w-3.5' />
            {row.heart}
          </div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default UserAccessTab;
