import { UserDetail, UserSummary } from '@/client/types';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from 'dayjs';
import { Ticket } from 'lucide-react';

interface UserDetailContentProps {
  user: UserDetail;
  copyId: (value: string) => void;
  onOpenTicket?: (user: UserSummary) => void;
  onRemove?: (user: UserSummary) => void;
}

function formatRelativeAccess(value?: string | null) {
  if (!value) {
    return { label: '기록 없음', description: '' };
  }

  const day = dayjs(value);
  const diffMinutes = Math.max(dayjs().diff(day, 'minute'), 0);
  const diffHours = Math.max(dayjs().diff(day, 'hour'), 0);
  const diffDays = Math.max(dayjs().diff(day, 'day'), 0);
  const label =
    diffMinutes < 60 ? `${diffMinutes}분 전` : diffHours < 24 ? `${diffHours}시간 전` : `${diffDays}일 전`;

  return {
    label,
    description: day.format('YYYY.MM.DD HH:mm:ss'),
  };
}

function formatReserveUnregister(createdAt: string, value?: string | null) {
  if (!value) {
    return null;
  }

  const day = dayjs(value);
  const diff = day.add(-48, 'hour').diff(createdAt, 'minute');
  const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;

  return {
    label: `${gap}만에 삭제`,
    dateText: day.format('YYYY.MM.DD HH:mm:ss'),
    isUrgent: diff < 60,
  };
}

function UserDetailContent({ user, copyId, onOpenTicket, onRemove }: UserDetailContentProps) {
  const {
    id,
    username,
    locale,
    socialAccount,
    createdAt,
    _count,
    reserveUnregisterAt,
    spaceMaxCount,
    representativeNickname,
    latestAccessAt,
    ticketSummary,
  } = user;

  const created = dayjs(createdAt);
  const diffFromNow = dayjs().diff(created, 'day');
  const accessMeta = formatRelativeAccess(latestAccessAt);
  const summary = ticketSummary ?? { owned: 0, used: 0, expired: 0 };
  const reserveMeta = formatReserveUnregister(createdAt, reserveUnregisterAt);

  const providerMap: Record<string, { variant: 'destructive' | 'warning' | 'muted' | 'success'; text: string }> = {
    GOOGLE: { variant: 'destructive', text: 'Google' },
    KAKAO: { variant: 'warning', text: 'Kakao' },
    APPLE: { variant: 'muted', text: 'Apple' },
    LINE: { variant: 'success', text: 'Line' },
  };

  const providerConfig = providerMap[socialAccount?.provider as string] || {
    variant: 'muted' as const,
    text: socialAccount?.provider ?? '-',
  };

  const isCompleted = _count.profiles > 0;

  return (
    <Card className='overflow-hidden border-border/70 bg-white shadow-sm'>
      <CardHeader className='gap-3 border-b border-border/70 bg-muted/[0.08] px-4 py-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <Avatar className='h-11 w-11 border border-border/70 bg-background'>
              <AvatarFallback className='text-sm font-semibold uppercase'>{username.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 space-y-1.5'>
              <div className='flex flex-wrap items-center gap-2'>
                <CardTitle className='text-lg font-semibold tracking-tight text-foreground'>{username}</CardTitle>
                <Badge variant={isCompleted ? 'success' : 'warning'} className='rounded-full px-2.5 py-0.5'>
                  {isCompleted ? '완료' : '진행중'}
                </Badge>
                <Badge variant={providerConfig.variant} className='rounded-full px-2.5 py-0.5'>
                  {providerConfig.text}
                </Badge>
                <Badge variant='muted' className='rounded-full px-2.5 py-0.5 uppercase'>
                  {locale?.toUpperCase()}
                </Badge>
              </div>
              <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                <Button
                  type='button'
                  variant='link'
                  size='sm'
                  className='h-auto p-0 font-mono text-[11px] text-muted-foreground'
                  onClick={() => copyId(id)}
                >
                  {id}
                </Button>
                <span className='hidden sm:inline'>•</span>
                <span className='truncate'>{socialAccount?.email || '이메일 없음'}</span>
              </div>
            </div>
          </div>

          {onOpenTicket || onRemove ? (
            <div className='flex items-center gap-1.5 self-start'>
              {onOpenTicket ? (
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-8 rounded-full px-2.5 text-muted-foreground hover:text-foreground'
                  onClick={() => onOpenTicket(user)}
                >
                  <Ticket className='w-4 h-4' />
                  티켓 지급
                </Button>
              ) : null}
              {onRemove ? (
                <TableRowActions
                  items={[
                    {
                      label: 'ID 복사',
                      onClick: () => copyId(id),
                    },
                    {
                      label: '사용자 삭제',
                      onClick: () => onRemove(user),
                      destructive: true,
                    },
                  ]}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className='space-y-4 px-4 py-4'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>유저 ID</p>
            <Button
              type='button'
              variant='link'
              size='sm'
              className='mt-2 h-auto p-0 text-left font-mono text-xs text-foreground'
              onClick={() => copyId(id)}
            >
              {id}
            </Button>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>유저코드</p>
            <Button
              type='button'
              variant='link'
              size='sm'
              className='mt-2 h-auto p-0 text-left text-sm font-semibold text-foreground'
              onClick={() => copyId(username)}
            >
              {username}
            </Button>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>닉네임</p>
            <p className='mt-2 truncate text-sm font-semibold text-foreground'>{representativeNickname?.trim() || '-'}</p>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>가입상태</p>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Badge variant={isCompleted ? 'success' : 'warning'}>{isCompleted ? '완료' : '진행중'}</Badge>
              <span className='text-xs text-muted-foreground'>{isCompleted ? '공간 생성 완료' : '온보딩 진행 중'}</span>
            </div>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>로그인 / 언어</p>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Badge variant={providerConfig.variant}>{providerConfig.text}</Badge>
              <Badge variant='secondary'>{locale?.toUpperCase() || '-'}</Badge>
            </div>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>이메일</p>
            <p className='mt-2 break-all text-sm font-medium text-foreground'>{socialAccount?.email || '미등록'}</p>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>공간 / 최대</p>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Badge variant='info'>공간 {_count.profiles || 0}</Badge>
              <Badge variant={spaceMaxCount > 5 ? 'warning' : spaceMaxCount > 2 ? 'success' : 'muted'}>
                최대 {spaceMaxCount}
              </Badge>
            </div>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>가입일</p>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Badge variant={diffFromNow < 7 ? 'success' : diffFromNow < 30 ? 'warning' : 'muted'}>D+{diffFromNow}</Badge>
              <span className='text-sm font-medium text-foreground'>{created.format('YYYY.MM.DD HH:mm:ss')}</span>
            </div>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>마지막 접속</p>
            <p className='mt-2 text-sm font-semibold text-foreground'>{accessMeta.label}</p>
            {accessMeta.description ? <p className='mt-1 text-xs text-muted-foreground'>{accessMeta.description}</p> : null}
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>티켓</p>
            <p className='mt-2 text-sm font-semibold text-foreground'>보유 {summary.owned}</p>
            <p className='mt-1 text-xs text-muted-foreground'>사용 {summary.used} · 만료 {summary.expired}</p>
          </div>

          <div className='rounded-xl border border-border/70 bg-white px-3 py-3 md:col-span-2 xl:col-span-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>탈퇴예정일</p>
            {reserveMeta ? (
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <Badge variant={reserveMeta.isUrgent ? 'destructive' : 'warning'}>{reserveMeta.label}</Badge>
                <span className='text-sm font-medium text-foreground'>{reserveMeta.dateText}</span>
              </div>
            ) : (
              <p className='mt-2 text-sm text-muted-foreground'>예정 없음</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserDetailContent;
