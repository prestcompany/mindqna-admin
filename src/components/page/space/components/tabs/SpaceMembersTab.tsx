import { getSpaceMembers } from '@/client/space';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getMemberStatus } from '../../utils/space-display';
import SpaceMemberDetail from './SpaceMemberDetail';

interface SpaceMembersTabProps {
  spaceId: string;
  active: boolean;
  copyId?: (id: string) => void;
  onRemoveProfile?: (profileId: string, nickname: string) => void;
}

function SpaceMembersTab({ spaceId, active, copyId, onRemoveProfile }: SpaceMembersTabProps) {
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
        <span className='text-xs text-slate-600'>활성 {activeCount}명</span>
      </div>
      <div className='space-y-2'>
        {data.profiles.map((p) => {
          const initial = (p.nickname ?? '?').trim().charAt(0).toUpperCase() || '?';
          const isOwner = p.userId === data.ownerId;
          const expanded = expandedId === p.id;
          const status = getMemberStatus(p);
          return (
            <div key={p.id} className='overflow-hidden rounded-lg border border-border bg-white'>
              <div className='flex w-full items-start gap-2 px-3 py-2.5'>
                <button
                  type='button'
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  className='flex min-w-0 flex-1 items-start gap-3 rounded-md text-left transition-colors hover:bg-muted'
                >
                  <Avatar className='h-9 w-9 shrink-0'>
                    {p.img?.uri ? <AvatarImage src={p.img.uri} alt={p.nickname} className='object-cover' /> : null}
                    <AvatarFallback className='bg-muted text-sm font-semibold text-muted-foreground'>{initial}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='truncate font-medium text-foreground'>{p.nickname}</span>
                      {isOwner ? <Badge variant='softNeutral'>OWNER</Badge> : null}
                      {p.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
                      {p.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
                      {status.badgeVariant ? <Badge variant={status.badgeVariant}>{status.label}</Badge> : null}
                    </div>
                    <div className='truncate text-xs text-muted-foreground'>@{p.user?.username ?? '-'}</div>
                    <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
                      <span>가입 {dayjs(p.createdAt).format('YY.MM.DD')}</span>
                      {status.date ? <span>{status.label} {dayjs(status.date).format('YY.MM.DD')}</span> : null}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn('mt-1 h-4 w-4 shrink-0 text-mute transition-transform', expanded && 'rotate-180')}
                  />
                </button>
                {onRemoveProfile ? (
                  <button
                    type='button'
                    onClick={() => onRemoveProfile(p.id, p.nickname)}
                    className='mt-1 shrink-0 rounded-md px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10'
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              {expanded ? (
                <div className='border-t border-border bg-muted px-4 py-3'>
                  <SpaceMemberDetail spaceId={spaceId} profileId={p.id} copyId={copyId} />
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
