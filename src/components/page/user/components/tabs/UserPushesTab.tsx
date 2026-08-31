import { getUserPushes } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';

function UserPushesTab({ username, active }: { username: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['user-pushes', username, page],
    queryFn: () => getUserPushes(username, page),
    enabled: active && !!username,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='푸시 내역이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((row) => (
        <div key={row.id} className='flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3'>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-foreground'>{row.title}</div>
            {row.desc ? <div className='truncate text-xs text-muted-foreground'>{row.desc}</div> : null}
            <div className='text-xs text-muted-foreground'>{dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}</div>
          </div>
          <Badge variant={row.isChecked ? 'softSuccess' : 'softNeutral'} className='shrink-0'>
            {row.isChecked ? '확인' : '미확인'}
          </Badge>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default UserPushesTab;
