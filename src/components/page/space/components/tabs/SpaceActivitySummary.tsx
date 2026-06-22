import { getSpaceActivitySummary } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import SpaceStatTile from '../SpaceStatTile';

function SpaceActivitySummary({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-activity-summary', spaceId],
    queryFn: () => getSpaceActivitySummary(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[80px] items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  const rateText = data.lastCard ? `${Math.round(data.lastCard.rate * 100)}%` : '-';
  const rateSub = data.lastCard ? `${data.lastCard.replyCount}/${data.lastCard.activeMembers} 답변` : undefined;
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
      <SpaceStatTile label='최근 7일 접속 횟수' value={data.access7d} />
      <SpaceStatTile label='최근 30일 일기' value={data.diary30d} />
      <SpaceStatTile label='직전 카드 답변율' value={rateText} sub={rateSub} />
    </div>
  );
}

export default SpaceActivitySummary;
