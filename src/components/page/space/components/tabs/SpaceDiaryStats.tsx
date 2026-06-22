import { getSpaceDiaryStats } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const EMOTION_LABEL: Record<string, string> = {
  happy: '행복',
  joy: '기쁨',
  good: '좋음',
  soso: '그냥',
  sad: '슬픔',
  angry: '화남',
  tired: '지침',
  anxious: '불안',
  love: '사랑',
};

function SpaceDiaryStats({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-diary-stats', spaceId],
    queryFn: () => getSpaceDiaryStats(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[96px] items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data || data.total === 0) return null;
  const max = Math.max(...data.byEmotion.map((e) => e.count), 1);
  return (
    <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
      <div className='mb-3 flex items-center gap-2'>
        <span className='text-xs font-medium text-slate-500'>감정 분포</span>
        <span className='text-xs text-slate-500'>총 {data.total.toLocaleString()}건</span>
      </div>
      <div className='space-y-2'>
        {data.byEmotion.map((e) => (
          <div key={e.emotion} className='flex items-center gap-3'>
            <span className='w-14 shrink-0 truncate text-xs text-slate-600'>{EMOTION_LABEL[e.emotion] ?? e.emotion}</span>
            <div className='h-2 flex-1 overflow-hidden rounded-full bg-slate-100'>
              <div className='h-full rounded-full bg-slate-400' style={{ width: `${(e.count / max) * 100}%` }} />
            </div>
            <span className='w-16 shrink-0 text-right text-xs tabular-nums text-slate-500'>
              {e.count} ({Math.round((e.count / data.total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpaceDiaryStats;
