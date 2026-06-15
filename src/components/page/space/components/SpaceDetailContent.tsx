import { SpaceCoinHistoryMeta, SpaceDetail } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatDueRemovedAt, formatSpaceAge, getMetricAccent, getSpaceTypeConfig } from '../utils/space-display';
import SpaceStatTile from './SpaceStatTile';
import SpaceStatusDot from './SpaceStatusDot';

interface SpaceDetailContentProps {
  detail: SpaceDetail;
  copyId: (id: string) => void;
}

function buildCoinMetaLabel(meta: SpaceCoinHistoryMeta) {
  const signedAmount = meta.amount > 0 ? `+${meta.amount}` : `${meta.amount}`;
  return signedAmount;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='flex items-start justify-between gap-4 px-4 py-2.5'>
      <dt className='shrink-0 text-sm text-muted-foreground'>{label}</dt>
      <dd className='min-w-0 break-words text-right text-sm font-medium text-foreground'>{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className='mb-2 text-sm font-semibold text-foreground'>{children}</h3>;
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

  return (
    <div className='space-y-6'>
      {/* 1. Identity strip — 이름/타입/언어/상태/ID/생성·삭제를 한 곳으로 통합 */}
      <div className='rounded-xl bg-muted/30 px-4 py-3'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
          <span className='truncate text-lg font-semibold text-foreground'>{detail.spaceInfo?.name ?? '공간 상세'}</span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={detail.isActive} className='ml-1' />
          {hasPremiumMember ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
          {hasGoldClubMember ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
          <button
            type='button'
            onClick={() => copyId(detail.id)}
            className='inline-flex items-center gap-1 rounded font-mono text-foreground/80 transition-colors hover:text-foreground'
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
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
        <SpaceStatTile label='하트' value={detail.coin} accent={getMetricAccent(detail.coin, 'text-rose-600')} />
        <SpaceStatTile label='스타' value={detail.coinPaid} accent={getMetricAccent(detail.coinPaid, 'text-amber-600')} />
        <SpaceStatTile label='멤버' value={memberCount} accent={getMetricAccent(memberCount, 'text-foreground')} />
        <SpaceStatTile label='답변' value={replies} accent={getMetricAccent(replies, 'text-foreground')} />
        <SpaceStatTile label='펫' value={`Lv.${petLevel}`} sub={`EXP ${petExp.toFixed(1)}`} />
        <SpaceStatTile label='방 / 인테리어' value={`${roomCount} / ${interiorCount}`} />
      </div>

      {/* 3. 상세 정보 — 테두리 격자 대신 깔끔한 dl */}
      <section>
        <SectionTitle>상세 정보</SectionTitle>
        <dl className='divide-y rounded-xl border'>
          <DetailRow label='카드 / 최근 발급' value={`카드 ${detail.cardOrder ?? 0} · ${detail.latestCardIssuedAt ? formatDate(detail.latestCardIssuedAt, 'YY.MM.DD HH:mm') : '발급 기록 없음'}`} />
          <DetailRow
            label='삭제예정일'
            value={dueRemovedMeta ? `${dueRemovedMeta.dateText} (${dueRemovedMeta.gapLabel})` : '예정 없음'}
          />
          <DetailRow label='다음 카드 생성 기준' value={detail.cardGenDate ?? '-'} />
        </dl>
      </section>

      {/* 4. 멤버 */}
      <section>
        <SectionTitle>멤버 {memberCount > 0 ? `(${memberCount})` : ''}</SectionTitle>
        {detail.profiles?.length ? (
          <div className='space-y-2'>
            {detail.profiles.map((profile) => {
              const isOwner = profile.userId === detail.spaceInfo?.ownerId;
              const initial = (profile.nickname ?? '?').trim().charAt(0).toUpperCase() || '?';
              return (
                <div key={profile.id} className='flex items-center gap-3 rounded-xl border px-4 py-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground'>
                    {initial}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='truncate font-medium text-foreground'>{profile.nickname}</span>
                      {isOwner ? <Badge variant='softNeutral'>OWNER</Badge> : null}
                      {profile.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
                      {profile.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
                    </div>
                    <div className='truncate text-xs text-muted-foreground'>@{profile.user?.username ?? '-'}</div>
                  </div>
                  <Button type='button' variant='ghost' size='sm' className='shrink-0' onClick={() => copyId(profile.user?.username ?? profile.id)}>
                    복사
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className='rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground'>멤버 정보가 없습니다.</div>
        )}
      </section>

      {/* 5. 최근 재화 이용 내역 — 타임라인 */}
      <section>
        <SectionTitle>최근 재화 이용 내역</SectionTitle>
        {detail.recentCoinMetas?.length ? (
          <div className='max-h-[420px] overflow-y-auto rounded-xl border px-4'>
            {detail.recentCoinMetas.map((meta, index) => {
              const actorName = meta.profile?.nickname ?? meta.profile?.user?.username ?? '-';
              const isNegative = meta.amount < 0 || meta.isUse;
              return (
                <div key={meta.id}>
                  <div className='flex items-start gap-3 py-3'>
                    <div className={cn('w-12 shrink-0 text-sm font-semibold tabular-nums', isNegative ? 'text-rose-600' : 'text-emerald-600')}>
                      {buildCoinMetaLabel(meta)}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-x-2 text-sm'>
                        <span className='truncate font-medium text-foreground'>{actorName}</span>
                        <span className='text-xs text-muted-foreground'>
                          {meta.isUse ? '사용' : '지급/획득'} · {meta.isPaid ? '스타' : '하트'}
                        </span>
                      </div>
                      <div className='break-words text-xs text-muted-foreground'>{meta.description || '사유 없음'}</div>
                    </div>
                    <div className='shrink-0 text-xs text-muted-foreground'>{formatDate(meta.createdAt)}</div>
                  </div>
                  {index < detail.recentCoinMetas.length - 1 ? <Separator /> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className='rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground'>최근 재화 이용 내역이 없습니다.</div>
        )}
      </section>
    </div>
  );
}

export default SpaceDetailContent;
