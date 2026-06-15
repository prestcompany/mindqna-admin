import { SpaceCoinHistoryMeta, SpaceDetail } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bell, CalendarClock, Cat, Copy, CreditCard, Flag, History, Home, Trash2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  buildRoomCategorySummary,
  formatDate,
  formatDueRemovedAt,
  formatSpaceAge,
  getMetricAccent,
  getPetTypeLabel,
  getSpaceTypeConfig,
} from '../utils/space-display';
import SpaceStatTile from './SpaceStatTile';
import SpaceStatusDot from './SpaceStatusDot';

interface SpaceDetailContentProps {
  detail: SpaceDetail;
  copyId: (id: string) => void;
}

function buildCoinMetaLabel(meta: SpaceCoinHistoryMeta) {
  // amount는 양수 크기로 저장되고 isUse 플래그가 방향(사용/지급)을 결정한다.
  // 부호를 isUse 기준으로 계산해 "사용"이 +로 표기되는 오류를 막는다.
  const isSpend = meta.isUse || meta.amount < 0;
  const magnitude = Math.abs(meta.amount);
  return `${isSpend ? '-' : '+'}${magnitude}`;
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

function SpaceDetailContent({ detail, copyId }: SpaceDetailContentProps) {
  const hasPremiumMember = detail.hasPremiumMember ?? detail.profiles?.some((profile) => profile.isPremium);
  const hasGoldClubMember = detail.hasGoldClubMember ?? detail.profiles?.some((profile) => profile.isGoldClub);
  const createdMeta = formatSpaceAge(detail.createdAt);
  const dueRemovedMeta = formatDueRemovedAt(detail.dueRemovedAt, detail.createdAt, hasPremiumMember);
  const typeConfig = getSpaceTypeConfig(detail.spaceInfo?.type);

  const memberCount = detail.spaceInfo?.members ?? detail.profiles?.length ?? 0;
  const replies = detail.spaceInfo?.replies ?? 0;
  const petLevel = detail.pet?.level ?? 0;
  const petExp = detail.pet?.exp ?? 0;
  const roomCount = detail.rooms?.length ?? 0;
  const interiorCount = detail.InteriorItem?.length ?? 0;
  const petTypeLabel = getPetTypeLabel(detail.pet?.type);
  const petNameValue = `${detail.spaceInfo?.petName || '-'}${petTypeLabel ? ` · ${petTypeLabel}` : ''}`;
  const roomSummary = buildRoomCategorySummary(detail.rooms);

  return (
    <div className='space-y-6'>
      {/* 1. Identity strip — 이름/타입/언어/상태/ID/생성·삭제를 한 곳으로 통합 */}
      <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
          <span className='truncate text-lg font-semibold text-slate-900'>{detail.spaceInfo?.name ?? '공간 상세'}</span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={detail.isActive} className='ml-1' />
          {hasPremiumMember ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
          {hasGoldClubMember ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500'>
          <button
            type='button'
            onClick={() => copyId(detail.id)}
            className='-mx-1.5 -my-1 inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'
          >
            {detail.id}
            <Copy className='h-3 w-3' />
          </button>
          <span aria-hidden>·</span>
          <span>
            생성 {createdMeta.diffLabel} · {createdMeta.dateText}
          </span>
          {dueRemovedMeta ? (
            <>
              <span aria-hidden>·</span>
              <span className='font-medium text-rose-600'>삭제예정 {dueRemovedMeta.dateText}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* 2. KPI 그리드 — 숫자가 주인공. 0은 회색으로 */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6'>
        <SpaceStatTile label='하트' value={detail.coin} accent={getMetricAccent(detail.coin, 'text-rose-500')} />
        <SpaceStatTile label='스타' value={detail.coinPaid} accent={getMetricAccent(detail.coinPaid, 'text-amber-500')} />
        <SpaceStatTile label='멤버' value={memberCount} accent={getMetricAccent(memberCount, 'text-slate-950')} />
        <SpaceStatTile label='답변' value={replies} accent={getMetricAccent(replies, 'text-slate-950')} />
        <SpaceStatTile label='펫' value={`Lv.${petLevel}`} sub={`EXP ${petExp.toFixed(1)}`} />
        <SpaceStatTile label='방 / 인테리어' value={`${roomCount} / ${interiorCount}`} />
      </div>

      {/* 3. 상세 정보 — 아이콘 기반 필드 그리드 */}
      <section>
        <SectionTitle>상세 정보</SectionTitle>
        <div className='grid grid-cols-1 gap-x-6 gap-y-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm sm:grid-cols-2 xl:grid-cols-3'>
          <DetailField icon={Cat} label='펫 이름 / 종류' value={petNameValue} />
          <DetailField icon={Bell} label='카드 발급 시간' value={detail.spaceInfo?.noticeTime || '-'} />
          <DetailField
            icon={Flag}
            label='시작일'
            value={detail.spaceInfo?.startedAt ? formatDate(detail.spaceInfo.startedAt, 'YY.MM.DD') : '-'}
          />
          <DetailField icon={Home} label='방 구성' value={roomSummary ?? `방 ${roomCount}`} />
          <DetailField
            icon={CreditCard}
            label='카드 / 최근 발급'
            value={`카드 ${detail.cardOrder ?? 0} · ${detail.latestCardIssuedAt ? formatDate(detail.latestCardIssuedAt, 'YY.MM.DD HH:mm') : '발급 없음'}`}
          />
          <DetailField icon={CalendarClock} label='다음 카드 생성 기준' value={detail.cardGenDate ?? '-'} />
          <DetailField icon={History} label='최근 수정일' value={detail.updatedAt ? formatDate(detail.updatedAt) : '-'} />
          <DetailField
            icon={Trash2}
            label='삭제예정일'
            value={dueRemovedMeta ? `${dueRemovedMeta.dateText} (${dueRemovedMeta.gapLabel})` : '예정 없음'}
            valueClassName={dueRemovedMeta ? 'text-rose-600' : undefined}
          />
        </div>
      </section>

      {/* 4. 멤버 */}
      <section>
        <SectionTitle>멤버 {memberCount > 0 ? `(${memberCount})` : ''}</SectionTitle>
        {detail.profiles?.length ? (
          <div className='space-y-2'>
            {detail.profiles.map((profile) => {
              const isOwner = profile.userId === detail.spaceInfo?.ownerId;
              const initial = (profile.nickname ?? '?').trim().charAt(0).toUpperCase() || '?';
              const userCode = profile.user?.code;
              const latestAccessAt = profile.user?.latestAccessAt;
              const showAccessLine = Boolean(latestAccessAt) || (profile.removed && Boolean(profile.removedAt));
              return (
                <div key={profile.id} className='flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500'>
                    {initial}
                  </div>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='truncate font-medium text-slate-900'>{profile.nickname}</span>
                      {isOwner ? <Badge variant='softNeutral'>OWNER</Badge> : null}
                      {profile.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
                      {profile.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
                      {profile.isAccepted === false ? <Badge variant='softWarning'>수락대기</Badge> : null}
                      {profile.disabled ? <Badge variant='softNeutral'>비활성</Badge> : null}
                      {profile.removed ? <Badge variant='softDanger'>탈퇴</Badge> : null}
                    </div>
                    <div className='truncate text-xs text-slate-500'>
                      @{profile.user?.username ?? '-'}
                      {userCode ? ` · #${userCode}` : ''}
                    </div>
                    {showAccessLine ? (
                      <div className='flex flex-wrap gap-x-3 text-xs text-slate-500'>
                        {latestAccessAt ? <span>최근 접속 {formatDate(latestAccessAt, 'YY.MM.DD HH:mm')}</span> : null}
                        {profile.removed && profile.removedAt ? <span>탈퇴 {formatDate(profile.removedAt, 'YY.MM.DD')}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <Button type='button' variant='ghost' size='sm' className='h-9 shrink-0' onClick={() => copyId(profile.user?.username ?? profile.id)}>
                    복사
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm'>멤버 정보가 없습니다.</div>
        )}
      </section>

      {/* 5. 최근 재화 이용 내역 — 타임라인 */}
      <section>
        <SectionTitle>최근 재화 이용 내역</SectionTitle>
        {detail.recentCoinMetas?.length ? (
          <div className='max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 bg-white px-4 shadow-sm'>
            {detail.recentCoinMetas.map((meta) => {
              const actorName = meta.profile?.nickname ?? meta.profile?.user?.username ?? '-';
              const isSpend = meta.isUse || meta.amount < 0;
              return (
                <div key={meta.id} className='flex items-center gap-3 py-3'>
                  <Badge variant={meta.isPaid ? 'softWarning' : 'softDanger'} className='w-11 shrink-0 justify-center'>
                    {meta.isPaid ? '스타' : '하트'}
                  </Badge>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium text-slate-900'>{actorName}</div>
                    <div className='truncate text-xs text-slate-500'>
                      {isSpend ? '사용' : '지급'} · {meta.description || '사유 없음'}
                    </div>
                  </div>
                  <div className='shrink-0 text-right'>
                    <div className={cn('text-sm font-bold tabular-nums', isSpend ? 'text-rose-600' : 'text-emerald-600')}>
                      {buildCoinMetaLabel(meta)}
                    </div>
                    <div className='text-[11px] text-slate-500'>{formatDate(meta.createdAt, 'MM.DD HH:mm')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm'>최근 재화 이용 내역이 없습니다.</div>
        )}
      </section>
    </div>
  );
}

export default SpaceDetailContent;
