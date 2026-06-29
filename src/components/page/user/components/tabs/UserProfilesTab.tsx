import { getUserProfiles } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function UserProfilesTab({ username, active }: { username: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['user-profiles', username],
    queryFn: () => getUserProfiles(username),
    enabled: active && !!username,
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (data && data.length === 0) {
    return (
      <Card className='bg-card'>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>참여 중인 공간이 없습니다.</CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-3'>
      {(data ?? []).map((profile) => (
        <div
          key={profile.id}
          className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='truncate text-sm font-medium text-slate-900'>
                {profile.spaceName ?? (
                  profile.spaceId ? (
                    <span className='font-mono text-slate-500'>{profile.spaceId.slice(0, 8)}…</span>
                  ) : (
                    '-'
                  )
                )}
              </span>
              {profile.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
              {profile.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
              {profile.disabled || profile.removed ? <Badge variant='softNeutral'>비활성</Badge> : null}
            </div>
            <div className='truncate text-xs text-slate-500'>
              {profile.nickname} · 가입 {dayjs(profile.createdAt).format('YYYY.MM.DD')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UserProfilesTab;
