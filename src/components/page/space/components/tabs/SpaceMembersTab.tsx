import { getSpaceMembers } from '@/client/space';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import SpaceMemberDetail from './SpaceMemberDetail';

function SpaceMembersTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
  const activeCount = data.profiles.filter((p) => !p.removed && !p.disabled).length;
  return (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <h3 className='text-base font-semibold text-slate-900'>멤버 {data.profiles.length}</h3>
        <span className='text-xs text-slate-500'>활성 {activeCount}명</span>
      </div>
      <div className='space-y-2'>
        {data.profiles.map((p) => {
          const initial = (p.nickname ?? '?').trim().charAt(0).toUpperCase() || '?';
          const isOwner = p.userId === data.ownerId;
          const expanded = expandedId === p.id;
          return (
            <div key={p.id} className='overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm'>
              <button
                type='button'
                onClick={() => setExpandedId(expanded ? null : p.id)}
                className='flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50'
              >
                <Avatar className='h-9 w-9 shrink-0'>
                  {p.img?.uri ? <AvatarImage src={p.img.uri} alt={p.nickname} className='object-cover' /> : null}
                  <AvatarFallback className='bg-slate-100 text-sm font-semibold text-slate-500'>{initial}</AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='truncate font-medium text-slate-900'>{p.nickname}</span>
                    {isOwner ? <Badge variant='softNeutral'>OWNER</Badge> : null}
                    {p.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
                    {p.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
                    {p.disabled ? <Badge variant='softNeutral'>비활성</Badge> : null}
                    {p.removed ? <Badge variant='softDanger'>탈퇴</Badge> : null}
                  </div>
                  <div className='truncate text-xs text-slate-500'>@{p.user?.username ?? '-'}</div>
                  <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500'>
                    <span>가입 {dayjs(p.createdAt).format('YY.MM.DD')}</span>
                    {p.removed && p.removedAt ? <span>탈퇴 {dayjs(p.removedAt).format('YY.MM.DD')}</span> : null}
                  </div>
                </div>
                <ChevronDown
                  className={cn('mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')}
                />
              </button>
              {expanded ? (
                <div className='border-t border-slate-100 bg-slate-50/40 px-4 py-3'>
                  <SpaceMemberDetail spaceId={spaceId} profileId={p.id} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SpaceMembersTab;
