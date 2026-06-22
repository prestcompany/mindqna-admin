import { getSpaceMemberDetail } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-lg bg-slate-50 px-3 py-2 text-center'>
      <div className='text-sm font-semibold tabular-nums text-slate-900'>{value.toLocaleString()}</div>
      <div className='text-[11px] text-slate-500'>{label}</div>
    </div>
  );
}

function SpaceMemberDetail({ spaceId, profileId }: { spaceId: string; profileId: string }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-member-detail', spaceId, profileId],
    queryFn: () => getSpaceMemberDetail(spaceId, profileId),
    enabled: !!spaceId && !!profileId,
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
    <div className='space-y-3'>
      <div className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
        <Stat label='답변' value={data.counts.replyCount} />
        <Stat label='일기' value={data.counts.diaryCount} />
        <Stat label='일정' value={data.counts.scheduleCount} />
        <Stat label='카드 댓글' value={data.counts.cardCommentCount} />
        <Stat label='일기 댓글' value={data.counts.diaryCommentCount} />
      </div>
      <div className='flex items-center gap-2 text-sm'>
        <span className='text-xs text-slate-500'>재화</span>
        <span className='tabular-nums text-emerald-600'>지급 {data.coin.given.toLocaleString()}</span>
        <span className='text-slate-300'>·</span>
        <span className='tabular-nums text-rose-600'>사용 {data.coin.used.toLocaleString()}</span>
      </div>
      <div>
        <div className='mb-1 text-xs font-medium text-slate-500'>프리미엄 티켓 ({data.premiumTickets.length})</div>
        {data.premiumTickets.length ? (
          <div className='space-y-1'>
            {data.premiumTickets.map((t) => (
              <div key={t.id} className='flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs'>
                <span className='truncate text-slate-700'>
                  {t.platform} · {t.productId}
                </span>
                <div className='flex shrink-0 items-center gap-2'>
                  <Badge variant={t.isActive ? 'softSuccess' : 'softNeutral'}>{t.isActive ? '활성' : '만료'}</Badge>
                  <span className='text-slate-500'>{t.dueAt ? `~${dayjs(t.dueAt).format('YY.MM.DD')}` : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-xs text-slate-500'>프리미엄 티켓 없음</div>
        )}
      </div>
    </div>
  );
}

export default SpaceMemberDetail;
