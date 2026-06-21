import { getSpaceSchedules } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceTabList from './SpaceTabList';

const INTERVAL_LABEL: Record<string, string> = {
  none: '단발',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
};

function SpaceSchedulesTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['space-schedules', spaceId, page],
    queryFn: () => getSpaceSchedules(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='등록된 일정이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((schedule) => (
        <div
          key={schedule.id}
          className='flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='flex min-w-0 items-center gap-2.5'>
            <span
              className='h-2.5 w-2.5 shrink-0 rounded-full'
              style={{ backgroundColor: schedule.color }}
              aria-hidden
            />
            <div className='min-w-0'>
              <div className='truncate text-sm font-medium text-slate-900'>{schedule.title}</div>
              <div className='text-xs text-slate-500'>
                {dayjs(schedule.startedAt).format('YY.MM.DD')} ~ {dayjs(schedule.endedAt).format('YY.MM.DD')}
              </div>
            </div>
          </div>
          <Badge variant='softNeutral' className='shrink-0'>
            {INTERVAL_LABEL[schedule.intervalType] ?? schedule.intervalType}
          </Badge>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default SpaceSchedulesTab;
