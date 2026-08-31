# 공간 상세 / 검색 사이드패널 대시보드 UIUX 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공간 상세 시트와 검색 결과 화면의 "뱃지 알약밭 + 색상 카니발 + 테두리 격자" 난잡함을, 정보 위계가 분명한 Data-Dense Dashboard 패턴(identity strip + KPI 타일 + 상태전용 뱃지 + soft 팔레트)으로 재구성한다.

**Architecture:** 원자 컴포넌트(soft 뱃지 variant, `SpaceStatTile`, `SpaceStatusDot`)를 먼저 추가하고 순수 표시 로직(`space-display.ts`)을 정리한 뒤, 이를 조합해 `SpaceDetailContent`를 재구성한다. 검색 화면은 무거운 풀-상세 카드(`SpaceDetailContent` × N + `getSpace` × N)를 가벼운 요약 카드(`SpaceResultCard`)로 교체하고, 적용된 필터를 칩으로 노출한다. "훑기(검색 요약) → 깊게보기(상세 시트)" 흐름을 정립한다.

**Tech Stack:** Next.js 13, TypeScript 5.1, Tailwind CSS, shadcn/ui (Radix), class-variance-authority, lucide-react, TanStack Query, dayjs.

> **검증 방식 안내 (중요):** 이 리포지토리에는 동작하는 테스트 러너가 없다(tsx/ts-node/vitest 미설치, `package.json`에 test 스크립트 없음). 따라서 각 태스크의 검증 게이트는 **`npx tsc --noEmit`(타입체크) + `npm run lint` + 수동 시각 확인**이다. 가짜 단위테스트를 작성하지 않는다. `npx tsc --noEmit`이 무설정으로 실패하면 `npx tsc --noEmit -p tsconfig.json`을 사용한다.

---

## File Structure

| 파일 | 책임 | 작업 |
|------|------|------|
| `src/components/ui/badge.tsx` | 뱃지 variant 정의. soft(저채도) variant 5종 추가 | Modify |
| `src/components/page/space/components/SpaceStatusDot.tsx` | ●/○ 활성 상태 점 표시 (상세·검색 공용) | Create |
| `src/components/page/space/components/SpaceStatTile.tsx` | KPI 타일 (큰 숫자 + 작은 레이블) | Create |
| `src/components/page/space/utils/space-display.ts` | 표시 순수 로직. 타입 색 중립화 + 지표 accent 헬퍼 추가 | Modify |
| `src/components/page/space/components/SpaceDetailContent.tsx` | 상세 본문 전체 재구성 | Modify (재작성) |
| `src/components/page/space/components/SpaceResultCard.tsx` | 검색 결과 1행 요약 카드 | Create |
| `src/components/page/space/components/SpaceActiveFilterChips.tsx` | 적용된 검색 필터 removable 칩 | Create |
| `src/components/page/space/SpaceSearch.tsx` | 카드뷰를 요약카드로 교체, 풀-상세 prefetch 제거, 필터칩 노출 | Modify |

각 태스크는 독립적으로 타입체크/린트를 통과하는 self-contained 변경을 만든다. Task 1~3은 원자 단위(부작용 0), Task 4는 상세 시트, Task 5~7은 검색 화면.

---

## Task 1: soft 뱃지 variant 추가

뱃지를 "숫자 알약"이 아니라 "상태/분류 라벨"로 되돌리기 위한 저채도 variant를 추가한다. 기존 solid variant(`success`/`warning`/`info`/`destructive`)는 그대로 두고(다른 화면에서 사용 중) soft 5종을 **추가**만 한다. 색은 이 리포가 이미 쓰는 Tailwind 팔레트(`SpaceList.tsx`의 `border-amber-200 bg-amber-50` 등)와 일치시킨다.

**Files:**
- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: soft variant 추가**

`badge.tsx`의 `variants.variant` 객체에서 마지막 항목 `muted` 뒤에 5개 항목을 추가한다. 기존:

```tsx
        muted:
          "border-transparent bg-muted text-muted-foreground",
      },
```

다음으로 교체:

```tsx
        muted:
          "border-transparent bg-muted text-muted-foreground",
        softNeutral:
          "border-border bg-muted/60 text-foreground/80 font-medium",
        softSuccess:
          "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium",
        softWarning:
          "border-amber-200 bg-amber-50 text-amber-700 font-medium",
        softDanger:
          "border-rose-200 bg-rose-50 text-rose-700 font-medium",
        softInfo:
          "border-blue-200 bg-blue-50 text-blue-700 font-medium",
      },
```

> 참고: cva base 문자열에 이미 `border`가 있으므로 soft variant는 테두리 **색**만 지정하면 가시적 테두리가 생긴다.

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (badge variant는 union 타입이 자동 확장됨)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat(ui): add soft badge variants for status/category labels"
```

---

## Task 2: SpaceStatusDot 컴포넌트

활성/비활성을 솔리드 뱃지(`ACTIVE` 빨강/회색) 대신 가벼운 점 + 텍스트로 표시한다. 상세 시트와 검색 카드 양쪽에서 재사용한다.

**Files:**
- Create: `src/components/page/space/components/SpaceStatusDot.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { cn } from '@/lib/utils';

interface SpaceStatusDotProps {
  active?: boolean;
  className?: string;
}

function SpaceStatusDot({ active, className }: SpaceStatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        )}
        aria-hidden
      />
      <span className={active ? 'text-emerald-700' : 'text-muted-foreground'}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

export default SpaceStatusDot;
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/components/page/space/components/SpaceStatusDot.tsx
git commit -m "feat(space): add SpaceStatusDot indicator"
```

---

## Task 3: SpaceStatTile + 표시 로직 정리

KPI 타일 컴포넌트를 추가하고, `space-display.ts`에 (a) 타입 색을 중립화하고 (b) 0값은 회색으로 떨어뜨리는 accent 헬퍼를 추가한다. 이것이 "하트 0이 새빨간 경고"를 해결한다.

**Files:**
- Create: `src/components/page/space/components/SpaceStatTile.tsx`
- Modify: `src/components/page/space/utils/space-display.ts`

- [ ] **Step 1: SpaceStatTile 작성**

```tsx
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SpaceStatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** 값에 적용할 Tailwind 텍스트 색 클래스. 미지정 시 기본 전경색 */
  accent?: string;
}

function SpaceStatTile({ label, value, sub, accent }: SpaceStatTileProps) {
  return (
    <div className='rounded-xl bg-muted/40 px-4 py-3'>
      <div className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold leading-tight tabular-nums', accent ?? 'text-foreground')}>
        {value}
      </div>
      {sub ? <div className='mt-0.5 text-xs text-muted-foreground'>{sub}</div> : null}
    </div>
  );
}

export default SpaceStatTile;
```

- [ ] **Step 2: space-display.ts — 타입 색 중립화 + accent 헬퍼 추가**

`getSpaceTypeConfig`를 중립 톤으로 바꾸고(카테고리에 의미색을 쓰지 않음), 파일 끝에 `getMetricAccent`를 추가한다.

기존 `getSpaceTypeConfig` 전체를 다음으로 교체:

```ts
export function getSpaceTypeConfig(type?: string | null) {
  const typeTextMap: Record<string, string> = {
    alone: '혼자',
    couple: '커플',
    family: '가족',
    friends: '친구',
  };

  // 카테고리(타입)는 의미색(빨강/초록 등) 대신 중립 톤으로 표기한다.
  return {
    text: typeTextMap[type ?? ''] ?? type ?? '-',
    variant: 'softNeutral' as const,
  };
}
```

파일 맨 끝(`formatDueRemovedAt` 함수 뒤)에 추가:

```ts
/**
 * 지표 값에 적용할 색을 결정한다. 0(또는 falsy)이면 회색으로 떨어뜨려
 * "값 없음"이 경고색으로 잘못 강조되는 것을 막는다.
 */
export function getMetricAccent(value: number | null | undefined, activeClass: string) {
  return value && value > 0 ? activeClass : 'text-muted-foreground';
}
```

> 주의: 이전에 `getSpaceTypeConfig`가 반환하던 `variant`(`info`/`destructive`/`success`/`warning`/`muted`)에 의존하는 호출부가 있는지 확인한다. `grep -rn "getSpaceTypeConfig" src` 결과는 `SpaceDetailContent.tsx`뿐이며, 해당 파일은 Task 4에서 전면 재작성되므로 안전하다. 다른 호출부가 나오면 그 호출부의 `typeConfig.variant` 사용도 `softNeutral` 기준으로 맞춘다.

- [ ] **Step 3: 호출부 확인**

Run: `grep -rn "getSpaceTypeConfig" src`
Expected: `SpaceDetailContent.tsx`만 출력 (Task 4에서 재작성). 다른 결과가 있으면 기록해 두고 그 파일도 동일 기준으로 점검.

- [ ] **Step 4: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (`SpaceDetailContent.tsx`가 아직 옛 `variant` 값을 쓰지만 `softNeutral`도 유효한 variant이므로 통과)

- [ ] **Step 5: Commit**

```bash
git add src/components/page/space/components/SpaceStatTile.tsx src/components/page/space/utils/space-display.ts
git commit -m "feat(space): add StatTile and neutral type/metric display helpers"
```

---

## Task 4: SpaceDetailContent 재구성

상세 본문을 4계층(identity strip → KPI 그리드 → 상세 정보 dl → 멤버/재화 리스트)으로 재작성한다. 테두리 격자 셀과 숫자 뱃지를 모두 제거한다.

**Files:**
- Modify (전면 재작성): `src/components/page/space/components/SpaceDetailContent.tsx`

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

```tsx
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
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (`getMetricAccent`, `SpaceStatTile`, `SpaceStatusDot`은 Task 2~3에서 생성됨)

- [ ] **Step 3: 수동 시각 확인**

Run: `npm run dev` (포트 4000)
확인 절차:
1. `/space/list` 진입 → 테이블 행 클릭 → 우측 상세 시트 오픈.
2. 다음을 눈으로 확인:
   - [ ] 상단에 이름 + 타입(중립색) + 언어 + `● Active/○ Inactive`가 한 줄로 통합됨
   - [ ] 하트/스타가 **0일 때 회색**, 값이 있을 때만 색(하트=rose, 스타=amber)
   - [ ] 필드마다 있던 테두리 박스 격자가 사라지고 KPI 타일 + dl로 정돈됨
   - [ ] 타입/언어/상태가 상·하단에 **중복 노출되지 않음**
   - [ ] 솔리드(꽉 찬 색) 뱃지가 화면에서 거의 사라짐
3. 375px / 768px / 1024px 폭에서 가로 스크롤 없는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/components/page/space/components/SpaceDetailContent.tsx
git commit -m "refactor(space): rebuild detail content with identity strip, KPI tiles, clean sections"
```

---

## Task 5: SpaceResultCard — 검색 결과 요약 카드

검색 카드뷰가 결과마다 풀 `SpaceDetailContent`를 렌더하던 것을, 1행 요약 카드로 교체한다. 풀-상세 데이터는 카드 클릭 시 상세 시트에서만 불러온다.

**Files:**
- Create: `src/components/page/space/components/SpaceResultCard.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';
import { getSpaceTypeConfig } from '../utils/space-display';
import SpaceStatusDot from './SpaceStatusDot';

interface SpaceResultCardProps {
  space: Space;
  onOpenDetail: (space: Space) => void;
  onOpenCoin: (space: Space) => void;
  copyId: (id: string) => void;
}

function SpaceResultCard({ space, onOpenDetail, onOpenCoin, copyId }: SpaceResultCardProps) {
  const typeConfig = getSpaceTypeConfig(space.spaceInfo?.type);
  const memberCount = space.spaceInfo?.members ?? space.profiles?.length ?? 0;
  const replies = space.spaceInfo?.replies ?? 0;
  const createdLabel = `D+${Math.max(dayjs().diff(dayjs(space.createdAt), 'day'), 0)}`;

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onOpenDetail(space)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetail(space);
        }
      }}
      className='flex cursor-pointer items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate font-semibold text-foreground'>{space.spaceInfo?.name ?? '-'}</span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{space.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={space.isActive} />
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              copyId(space.id);
            }}
            className='font-mono transition-colors hover:text-foreground'
          >
            {space.id}
          </button>
          <span>멤버 {memberCount}</span>
          <span>답변 {replies}</span>
          <span className='tabular-nums'>♥ {space.coin} · ★ {space.coinPaid}</span>
          <span>{createdLabel}</span>
        </div>
      </div>
      <div className='shrink-0' onClick={(event) => event.stopPropagation()}>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onOpenCoin(space)}
        >
          코인 관리
        </Button>
      </div>
    </div>
  );
}

export default SpaceResultCard;
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (`Space` 타입에 `spaceInfo.members`, `spaceInfo.replies`, `coin`, `coinPaid`, `isActive`가 있는지 타입체크가 검증. 만약 `replies`/`isActive`가 `Space`에 없고 `SpaceDetail`에만 있다는 에러가 나오면, 해당 필드를 `(space as any)` 대신 옵셔널 접근으로 두고 `0`/`undefined` fallback을 유지하되, `src/client/types.ts`에서 실제 필드 위치를 확인해 접근 경로를 맞춘다.)

- [ ] **Step 3: Commit**

```bash
git add src/components/page/space/components/SpaceResultCard.tsx
git commit -m "feat(space): add compact SpaceResultCard for search results"
```

---

## Task 6: SpaceSearch — 카드뷰 교체 + 풀-상세 prefetch 제거

검색 화면이 결과마다 `getSpace`를 호출하던 `useQueries` prefetch를 제거하고, 카드뷰를 `SpaceResultCard` 리스트로 교체한다.

**Files:**
- Modify: `src/components/page/space/SpaceSearch.tsx`

- [ ] **Step 1: import 정리**

`SpaceSearch.tsx` 상단 import에서 다음을 변경한다.

`import { getSpace, removeProfile, removeSpace, searchSpaces, type SearchSpacesParams } from '@/client/space';`
→
`import { removeProfile, removeSpace, searchSpaces, type SearchSpacesParams } from '@/client/space';`

`import { Space, SpaceDetail, SpaceType } from '@/client/types';`
→
`import { Space, SpaceType } from '@/client/types';`

> `SpaceDetail`은 삭제될 `renderCardItem`의 `detail as SpaceDetail`(현재 324행)에서만 쓰이므로 제거한다. `Space`(컬럼/포커스/상세타겟)와 `SpaceType`(필터)은 계속 사용되므로 유지.

`import { useQueries, useQuery } from '@tanstack/react-query';`
→
`import { useQuery } from '@tanstack/react-query';`

`import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';`
→
`import { Card, CardContent } from '@/components/ui/card';`

> `CardHeader`/`CardTitle`은 삭제될 `renderCardItem`의 에러 분기(현재 295~296행)에서만 쓰이므로 제거한다. `Card`/`CardContent`는 로딩(현재 472행)·빈결과(현재 543행) 카드에서 계속 사용되므로 유지. **이 변경을 누락하면 `next lint`가 미사용 import로 실패한다.**

다음 import 줄을 제거한다:
`import SpaceDetailContent from './components/SpaceDetailContent';`
→ (삭제)

다음 import를 추가한다 (`SpaceDetailSheet` import 옆):
`import SpaceResultCard from './components/SpaceResultCard';`

- [ ] **Step 2: useQueries 블록 제거**

다음 블록(현재 93~100행)을 통째로 삭제한다:

```tsx
  const detailQueries = useQueries({
    queries: items.map((space) => ({
      queryKey: ['space-search-detail', space.id],
      queryFn: () => getSpace(space.id),
      enabled: !!submittedSearchParams && viewMode === 'card',
      staleTime: 30_000,
    })),
  });
```

- [ ] **Step 3: renderCardItem 함수를 제거**

`const renderCardItem = (space: Space, index: number) => { ... };` 함수 전체(현재 281~329행)를 삭제한다. (이 함수가 유일하게 쓰던 `SpaceDetailContent`/상세 로딩/에러 분기가 함께 사라진다.)

- [ ] **Step 4: 카드뷰 렌더링 교체**

카드뷰 분기에서 기존:

```tsx
              <div className='space-y-4'>
                {items.map((space, index) => renderCardItem(space, index))}
                {totalCount > 0 && (
```

를 다음으로 교체:

```tsx
              <div className='space-y-3'>
                {items.map((space) => (
                  <SpaceResultCard
                    key={space.id}
                    space={space}
                    onOpenDetail={(target) => setDetailTarget(target)}
                    onOpenCoin={(target) => openCoinForSpace(target)}
                    copyId={copyId}
                  />
                ))}
                {totalCount > 0 && (
```

(이후 페이지네이션 블록은 그대로 둔다.)

- [ ] **Step 5: 타입체크 + 린트 (미사용 식별자 확인)**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. `getSpace`, `useQueries`, `SpaceDetailContent`, `renderCardItem` 미사용 경고/에러가 없어야 한다. (남아 있으면 해당 참조를 마저 제거한다.)

- [ ] **Step 6: 수동 시각 확인**

Run: `npm run dev`
확인 절차:
1. `/space/list` → 검색 시트 열기 → 검색어 입력 후 검색.
2. 확인:
   - [ ] 카드뷰가 1행 요약 카드 리스트로 표시됨 (풀 대시보드 적층 ❌)
   - [ ] 카드 클릭 시 우측 상세 시트(Task 4 디자인) 오픈
   - [ ] "코인 관리" 버튼 클릭 시 카드 클릭(상세)으로 전파되지 않고 코인 시트만 열림
   - [ ] ID 클릭 시 상세로 전파되지 않고 복사만 됨
   - [ ] 네트워크 탭에서 검색 직후 `getSpace`가 결과 수만큼 호출되지 않음 (상세 클릭 시 1회만)
3. 테이블 뷰 토글도 정상 동작하는지 확인.

- [ ] **Step 7: Commit**

```bash
git add src/components/page/space/SpaceSearch.tsx
git commit -m "perf(space): replace heavy search card view with summary cards, drop per-result detail prefetch"
```

---

## Task 7: 검색 필터 적용 칩 (SpaceActiveFilterChips)

적용 중인 검색 조건(타입/언어/기간)을 removable 칩으로 노출해 "무엇으로 거르는 중인지"를 즉시 보이게 한다.

**Files:**
- Create: `src/components/page/space/components/SpaceActiveFilterChips.tsx`
- Modify: `src/components/page/space/SpaceSearch.tsx`

- [ ] **Step 1: 칩 컴포넌트 작성**

```tsx
import { SearchSpacesParams } from '@/client/space';
import { X } from 'lucide-react';

interface ActiveChip {
  key: 'type' | 'locale' | 'date';
  label: string;
}

interface SpaceActiveFilterChipsProps {
  params: SearchSpacesParams | null;
  onRemove: (key: ActiveChip['key']) => void;
}

const TYPE_LABEL: Record<string, string> = { alone: '혼자', couple: '커플', family: '가족', friends: '친구' };

function buildChips(params: SearchSpacesParams | null): ActiveChip[] {
  if (!params) return [];
  const chips: ActiveChip[] = [];
  if (params.type) chips.push({ key: 'type', label: `타입: ${TYPE_LABEL[params.type] ?? params.type}` });
  if (params.locale) chips.push({ key: 'locale', label: `언어: ${params.locale.toUpperCase()}` });
  if (params.startDate || params.endDate) {
    chips.push({ key: 'date', label: `기간: ${params.startDate ?? '~'} ~ ${params.endDate ?? '~'}` });
  }
  return chips;
}

function SpaceActiveFilterChips({ params, onRemove }: SpaceActiveFilterChipsProps) {
  const chips = buildChips(params);
  if (!chips.length) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className='inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground/80'
        >
          {chip.label}
          <button
            type='button'
            aria-label={`${chip.label} 필터 제거`}
            onClick={() => onRemove(chip.key)}
            className='inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          >
            <X className='h-3 w-3' />
          </button>
        </span>
      ))}
    </div>
  );
}

export default SpaceActiveFilterChips;
```

- [ ] **Step 2: SpaceSearch에 칩 통합 — import 추가**

`SpaceResultCard` import 옆에 추가:
`import SpaceActiveFilterChips from './components/SpaceActiveFilterChips';`

- [ ] **Step 3: 칩 제거 핸들러 추가**

`SpaceSearch` 함수 안, `handleChangePage` 정의 아래에 추가:

```tsx
  const handleRemoveFilterChip = (key: 'type' | 'locale' | 'date') => {
    setSearchParams((prev) => ({
      ...prev,
      type: key === 'type' ? undefined : prev.type,
      locale: key === 'locale' ? undefined : prev.locale,
      dateRange: key === 'date' ? { start: null, end: null } : prev.dateRange,
    }));
    setSubmittedSearchParams((prev) => {
      if (!prev) return prev;
      const next = { ...prev, page: 1 };
      if (key === 'type') next.type = undefined;
      if (key === 'locale') next.locale = undefined;
      if (key === 'date') {
        next.startDate = undefined;
        next.endDate = undefined;
      }
      return next;
    });
  };
```

- [ ] **Step 4: 결과 헤더에 칩 노출**

검색 결과 카운트/뷰토글 블록(`{hasSubmittedSearch && ( ... )}`) 바로 아래(같은 부모 `div.space-y-4` 안)에 추가:

```tsx
        {hasSubmittedSearch && <SpaceActiveFilterChips params={submittedSearchParams} onRemove={handleRemoveFilterChip} />}
```

- [ ] **Step 5: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 수동 시각 확인**

Run: `npm run dev`
확인 절차:
1. 검색 시트에서 타입=커플, 언어=KO, 기간 지정 후 검색.
2. 확인:
   - [ ] 결과 위에 `타입: 커플 ✕` `언어: KO ✕` `기간: … ✕` 칩 노출
   - [ ] 칩의 ✕ 클릭 시 해당 조건만 제거되고 즉시 재검색됨
   - [ ] 조건이 없으면 칩 영역이 렌더되지 않음

- [ ] **Step 7: Commit**

```bash
git add src/components/page/space/components/SpaceActiveFilterChips.tsx src/components/page/space/SpaceSearch.tsx
git commit -m "feat(space): show applied search filters as removable chips"
```

---

## Self-Review

**1. Spec coverage (요청 대비):**
- 배치(layout) 개편 → Task 4 (4계층 구조), Task 6 (검색 요약 리스트) ✅
- 카드(card) 개편 → Task 3 `SpaceStatTile`, Task 4 (테두리 격자 제거), Task 5 `SpaceResultCard` ✅
- 뱃지(badge) 개편 → Task 1 (soft variant), Task 3 (타입 색 중립화), Task 4 (숫자 뱃지 → KPI 타일) ✅
- 칩(chip) 개편 → Task 7 (검색 필터 칩), Task 4/5 (분류 칩 = soft 뱃지) ✅
- "하트 0 = 빨강" 문제 → Task 3 `getMetricAccent` ✅
- 정보 중복(상단/기본정보) → Task 4 identity strip 단일화 ✅
- 검색 풀-상세 N개 적층 → Task 6 prefetch 제거 ✅

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "적절히 처리" 류 문구 없음. ✅

**3. Type consistency:**
- `getSpaceTypeConfig` 반환 `{ text, variant: 'softNeutral' }` → Task 4/5에서 `typeConfig.variant`, `typeConfig.text`로 일관 사용 ✅
- `getMetricAccent(value, activeClass)` 시그니처 → Task 4 호출과 일치 ✅
- `SpaceStatTile` props `{ label, value, sub?, accent? }` → Task 4 호출과 일치 ✅
- `SpaceStatusDot` props `{ active?, className? }` → Task 4/5 호출과 일치 ✅
- `SpaceResultCard` props `{ space, onOpenDetail, onOpenCoin, copyId }` → Task 6 호출과 일치 ✅

**리스크 노트:** `Space` 타입에 `isActive` / `spaceInfo.replies`가 실제로 존재하는지는 Task 5/6의 `tsc --noEmit`에서 확정 검증된다. 부재 시 Step 2 노트의 fallback 지침을 따른다. soft 뱃지는 라이트 모드 전용 색(`emerald-50` 등)이며 이 어드민은 라이트 모드 기준이므로 문제없으나, 다크 모드 도입 시 별도 보정 필요.
