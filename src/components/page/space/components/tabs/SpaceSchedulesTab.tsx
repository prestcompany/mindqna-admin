import { getSpaceSchedules } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import SpaceScheduleDetail from './SpaceScheduleDetail';
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
      emptyText='이 공간에 등록된 캘린더 일정이 없습니다. (멤버가 앱에서 일정을 추가하면 표시됩니다)'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((schedule) => {
        const expanded = expandedId === schedule.id;
        return (
          <div key={schedule.id} className='overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm'>
            <button
              type='button'
              onClick={() => setExpandedId(expanded ? null : schedule.id)}
              className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50'
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
              <div className='flex shrink-0 items-center gap-2'>
                <Badge variant='softNeutral'>{INTERVAL_LABEL[schedule.intervalType] ?? schedule.intervalType}</Badge>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
              </div>
            </button>
            {expanded ? (
              <div className='border-t border-slate-100 bg-slate-50/40 px-4 py-3'>
                <SpaceScheduleDetail spaceId={spaceId} scheduleId={schedule.id} />
              </div>
            ) : null}
          </div>
        );
      })}
    </SpaceTabList>
  );
}

export default SpaceSchedulesTab;
