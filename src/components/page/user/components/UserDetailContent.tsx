import { UserDetail, UserSummary } from '@/client/types';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, Copy, Globe, History, KeyRound, Link2, LogIn, type LucideIcon, Mail, Ticket, Trash2, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  formatDate,
  formatRelativeAccess,
  formatReserveUnregister,
  getDaysSince,
  getJoinStatusConfig,
  getLocaleLabel,
  getMetricAccent,
  getProviderConfig,
} from '../utils/user-display';

interface UserDetailContentProps {
  user: UserDetail;
  copyId: (value: string) => void;
  onOpenTicket?: (user: UserSummary) => void;
  onRemove?: (user: UserSummary) => void;
}

function StatTile({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
      <div className='text-sm font-medium text-slate-600'>{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', accent ?? 'text-slate-950')}>{value}</div>
      {sub ? <div className='mt-0.5 text-xs text-slate-500'>{sub}</div> : null}
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className='flex items-start gap-3'>
      <span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500'>
        <Icon className='h-4 w-4' />
      </span>
      <div className='min-w-0'>
        <div className='text-xs text-slate-500'>{label}</div>
        <div className={cn('mt-0.5 break-words text-sm font-medium text-slate-900', valueClassName)}>{value}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className='mb-2 text-base font-semibold text-slate-900'>{children}</h3>;
}

function UserDetailContent({ user, copyId, onOpenTicket, onRemove }: UserDetailContentProps) {
  const {
    id,
    code,
    username,
    locale,
    socialAccount,
    createdAt,
    updateAt,
    _count,
    reserveUnregisterAt,
    spaceMaxCount,
    representativeNickname,
    latestAccessAt,
    ticketSummary,
  } = user;

  const isCompleted = (_count?.profiles ?? 0) > 0;
  const joinStatus = getJoinStatusConfig(isCompleted);
  const provider = getProviderConfig(socialAccount?.provider);
  const summary = ticketSummary ?? { owned: 0, applied: 0, unapplied: 0, used: 0, expired: 0 };
  const accessMeta = formatRelativeAccess(latestAccessAt);
  const reserveMeta = formatReserveUnregister(createdAt, reserveUnregisterAt);
  const createdDiff = getDaysSince(createdAt);

  return (
    <div className='space-y-6'>
      {/* 1. Identity strip — 아바타/유저코드/상태/로그인/언어/ID/이메일 통합 */}
      <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <Avatar className='h-11 w-11 border border-slate-200/80'>
              <AvatarFallback className='bg-slate-100 text-sm font-semibold uppercase text-slate-600'>{username.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
                <span className='truncate text-lg font-semibold text-slate-900'>{username}</span>
                <Badge variant={joinStatus.variant}>{joinStatus.text}</Badge>
                <Badge variant={provider.variant}>{provider.text}</Badge>
                <Badge variant='softNeutral'>{getLocaleLabel(locale)}</Badge>
              </div>
              <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500'>
                <button
                  type='button'
                  onClick={() => copyId(id)}
                  className='-mx-1.5 -my-1 inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'
                >
                  <Copy className='h-3 w-3' />
                  {id}
                </button>
                {typeof code === 'number' ? <span className='font-mono'>#{code}</span> : null}
                <span className='truncate'>{socialAccount?.email || '이메일 없음'}</span>
              </div>
            </div>
          </div>

          {onOpenTicket || onRemove ? (
            <div className='flex shrink-0 items-center gap-1.5'>
              {onOpenTicket ? (
                <Button size='sm' variant='outline' className='h-9' onClick={() => onOpenTicket(user)}>
                  <Ticket className='h-4 w-4' />
                  티켓 관리
                </Button>
              ) : null}
              {onRemove ? (
                <TableRowActions
                  items={[
                    { label: 'ID 복사', onClick: () => copyId(id) },
                    { label: '사용자 삭제', onClick: () => onRemove(user), destructive: true },
                  ]}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. KPI 타일 — 공간/티켓 핵심 수치 (중립 숫자) */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        <StatTile label='공간' value={_count?.profiles ?? 0} accent={getMetricAccent(_count?.profiles, 'text-slate-950')} />
        <StatTile label='최대 공간' value={spaceMaxCount ?? 0} />
        <StatTile label='보유 티켓' value={summary.owned} accent={getMetricAccent(summary.owned, 'text-slate-950')} />
        <StatTile label='적용 티켓' value={summary.applied} accent={getMetricAccent(summary.applied, 'text-slate-950')} />
        <StatTile label='미적용 티켓' value={summary.unapplied} accent={getMetricAccent(summary.unapplied, 'text-slate-950')} />
        <StatTile label='사용 티켓' value={summary.used} accent={getMetricAccent(summary.used, 'text-slate-950')} />
        <StatTile label='만료 티켓' value={summary.expired} accent={getMetricAccent(summary.expired, 'text-slate-950')} />
      </div>

      {/* 3. 상세 정보 */}
      <section>
        <SectionTitle>상세 정보</SectionTitle>
        <div className='grid grid-cols-1 gap-x-6 gap-y-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm sm:grid-cols-2 xl:grid-cols-3'>
          <DetailField icon={UserIcon} label='닉네임' value={representativeNickname?.trim() || '-'} />
          <DetailField icon={Mail} label='이메일' value={socialAccount?.email || '미등록'} />
          <DetailField icon={LogIn} label='로그인 수단' value={provider.text} />
          {socialAccount?.socialId ? <DetailField icon={KeyRound} label='소셜 ID' value={socialAccount.socialId} /> : null}
          {socialAccount?.createdAt ? <DetailField icon={Link2} label='소셜 연동일' value={formatDate(socialAccount.createdAt)} /> : null}
          <DetailField icon={Globe} label='언어' value={getLocaleLabel(locale)} />
          <DetailField icon={CalendarDays} label='가입일' value={`D+${createdDiff} · ${formatDate(createdAt)}`} />
          {updateAt ? <DetailField icon={History} label='정보 수정일' value={formatDate(updateAt)} /> : null}
          <DetailField
            icon={Clock}
            label='마지막 접속'
            value={accessMeta.description ? `${accessMeta.label} · ${accessMeta.description}` : accessMeta.label}
          />
          <DetailField
            icon={Trash2}
            label='탈퇴예정일'
            value={reserveMeta ? `${reserveMeta.dateText} (${reserveMeta.label})` : '예정 없음'}
            valueClassName={reserveMeta ? 'text-rose-600' : undefined}
          />
        </div>
      </section>
    </div>
  );
}

export default UserDetailContent;
