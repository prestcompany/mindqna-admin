import { getSpaceScheduleDetail } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function SpaceScheduleDetail({ spaceId, scheduleId }: { spaceId: string; scheduleId: number }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-schedule-detail', spaceId, scheduleId],
    queryFn: () => getSpaceScheduleDetail(spaceId, scheduleId),
    enabled: !!spaceId && !!scheduleId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[64px] items-center justify-center'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className='space-y-3 text-sm'>
      {data.memo ? (
        <div>
          <div className='text-xs font-medium text-slate-500'>메모</div>
          <p className='mt-0.5 whitespace-pre-wrap break-words text-slate-600'>{data.memo}</p>
        </div>
      ) : null}
      <div>
        <div className='mb-1 text-xs font-medium text-slate-500'>일정 날짜 ({data.items.length})</div>
        {data.items.length ? (
          <div className='flex flex-wrap gap-1.5'>
            {data.items.map((it) => (
              <Badge key={it.id} variant='softNeutral'>
                {dayjs(it.date).format('YY.MM.DD')}
              </Badge>
            ))}
          </div>
        ) : (
          <div className='text-xs text-slate-500'>등록된 날짜 없음</div>
        )}
      </div>
      <div>
        <div className='mb-1 text-xs font-medium text-slate-500'>참여 멤버 ({data.memberMetas.length})</div>
        {data.memberMetas.length ? (
          <div className='flex flex-wrap gap-1.5'>
            {data.memberMetas.map((m) => (
              <span key={m.id} className='rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'>
                {m.profile?.nickname ?? '-'}
              </span>
            ))}
          </div>
        ) : (
          <div className='text-xs text-slate-500'>참여 멤버 없음</div>
        )}
      </div>
    </div>
  );
}

export default SpaceScheduleDetail;
