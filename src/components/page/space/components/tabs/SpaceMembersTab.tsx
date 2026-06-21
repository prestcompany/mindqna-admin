import { getSpaceMembers } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function SpaceMembersTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => getSpaceMembers(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className='space-y-6'>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>멤버 ({data.profiles.length})</h3>
        {data.profiles.map((p) => (
          <div
            key={p.id}
            className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
          >
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='truncate font-medium text-slate-900'>{p.nickname}</span>
                {p.userId === data.ownerId ? <Badge variant='softNeutral'>OWNER</Badge> : null}
                {p.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
                {p.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
                {p.disabled ? <Badge variant='softNeutral'>비활성</Badge> : null}
                {p.removed ? <Badge variant='softDanger'>탈퇴</Badge> : null}
              </div>
              <div className='truncate text-xs text-slate-500'>
                @{p.user?.username ?? '-'}
                {p.user?.code ? ` · #${p.user.code}` : ''}
              </div>
            </div>
            <div className='shrink-0 text-xs text-slate-500'>{dayjs(p.createdAt).format('YY.MM.DD')}</div>
          </div>
        ))}
      </section>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>가입/초대 이력 ({data.joinMetas.length})</h3>
        {data.joinMetas.length ? (
          data.joinMetas.map((j) => (
            <div
              key={j.id}
              className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm'
            >
              <span className='font-mono text-xs text-slate-600'>{j.userId}</span>
              <div className='flex items-center gap-2'>
                <Badge variant={j.isAccepted ? 'softSuccess' : 'softWarning'}>{j.isAccepted ? '수락' : '대기'}</Badge>
                <span className='text-xs text-slate-500'>{dayjs(j.createdAt).format('YY.MM.DD HH:mm')}</span>
              </div>
            </div>
          ))
        ) : (
          <Card className='bg-card'>
            <CardContent className='py-6 text-center text-sm text-muted-foreground'>
              가입/초대 이력이 없습니다.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export default SpaceMembersTab;
