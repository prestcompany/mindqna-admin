# 카드 발급 진단(read-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 관리자가 공간 Overview에서 "왜 카드가 발급되지 않았는지"를 게이트별 체크리스트로 즉시 확인하도록 read-only 진단 API와 패널을 추가한다. 판정 로직은 발급 크론과 단일 소스(공유 순수 평가기)로 통일한다.

**Architecture:** 발급 게이트 판정부를 `src/card/card-eligibility.ts`(순수 함수)로 추출하고, `CardCreateCron`을 behavior-preserving 리팩터해 이를 사용한다(기존 `card-create.cron.spec.ts`가 가드). 어드민 `SpaceService`는 동일 순수 평가기로 `GET /admin/space/:id/card-eligibility`를 제공한다. 프론트는 Overview 탭에 체크리스트 패널을 lazy-load한다. **운영 데이터 변경(mutation) 없음.**

**Tech Stack:** NestJS 10, Prisma 5.8, dayjs, Jest; Next 13, React Query, shadcn/ui.

**Repos:** 백엔드 `/Users/gargoyle92/Documents/backend/mindqna-server`, 프론트 `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**발급 게이트(근거: `src/card/cron/card-create.cron.ts`)**
1. `dueRemovedAt == null` (`:95`) 2. `isActive == true` (`:96`) 3. `spaceInfo != null` (`:97`)
4. 다음 `basic` 템플릿 존재(locale·spaceType·isPublished·`order > cardOrder`) (`getCardTemplate:272`)
5. 발급 시각 도래 `hasValidTiming` (`:166`) 6. 멤버 자격: alone이거나 활성멤버≥2 (`:152`)
7. 참여율: 첫 카드면 통과, 아니면 직전 카드 답변율 ≥50%(2인은 >50%) (`:222`)
활성 멤버 = `{ disabled:false, removed:false }` (`member-count.util.ts`).

---

## File Structure
- Create `src/card/card-eligibility.ts` — 순수 게이트 술어 + `evaluateCardEligibility`.
- Create `src/card/card-eligibility.spec.ts` — 순수 평가기 단위 테스트.
- Modify `src/card/cron/card-create.cron.ts` — 술어를 공유 util로 위임(동작 보존).
- Modify `src/admin/space/space.service.ts` — `diagnoseCardEligibility(id)`.
- Modify `src/admin/space/space.controller.ts` — `GET :id/card-eligibility`.
- Modify `src/admin/space/space.service.spec.ts` — diagnose 테스트.
- 프론트: `src/client/types.ts`, `src/client/space.ts`, `src/components/page/space/components/tabs/SpaceCardEligibilityPanel.tsx`(신규), `SpaceDetailSheet.tsx`(Overview 탭에 패널 삽입).

---

## Task 1: 순수 게이트 평가기 추출

**Files:** Create `src/card/card-eligibility.ts`, `src/card/card-eligibility.spec.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/card/card-eligibility.spec.ts`:

```typescript
import dayjs from 'dayjs';
import {
  hasValidTiming,
  isMemberEligible,
  hasEnoughParticipation,
  evaluateCardEligibility,
} from './card-eligibility';

describe('card-eligibility predicates', () => {
  it('hasValidTiming: true when genDate+noticeTime is not after now', () => {
    const now = dayjs('2026-03-10T10:00:00.000Z');
    expect(hasValidTiming('2026-03-10', '09:00', now)).toBe(true);
    expect(hasValidTiming('2026-03-10', '23:00', now)).toBe(false);
  });

  it('isMemberEligible: alone always true; group needs >=2 active', () => {
    expect(isMemberEligible('alone', 1)).toBe(true);
    expect(isMemberEligible('family', 1)).toBe(false);
    expect(isMemberEligible('family', 2)).toBe(true);
  });

  it('hasEnoughParticipation: 2 members need >50%, others >=50%', () => {
    expect(hasEnoughParticipation(2, 1)).toBe(false);
    expect(hasEnoughParticipation(2, 2)).toBe(true);
    expect(hasEnoughParticipation(4, 2)).toBe(true);
    expect(hasEnoughParticipation(4, 1)).toBe(false);
  });
});

describe('evaluateCardEligibility', () => {
  const now = dayjs('2026-03-10T10:00:00.000Z');

  it('canIssue true for active alone space at first card', () => {
    const result = evaluateCardEligibility(
      {
        dueRemovedAt: null,
        isActive: true,
        spaceInfo: { type: 'alone', noticeTime: '09:00' },
        cardOrder: 0,
        cardGenDate: null,
        activeMembers: 1,
        hasNextTemplate: true,
        lastCard: null,
      },
      now,
    );
    expect(result.canIssue).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('flags isActive and member gates for inactive single-member group', () => {
    const result = evaluateCardEligibility(
      {
        dueRemovedAt: null,
        isActive: false,
        spaceInfo: { type: 'family', noticeTime: '09:00' },
        cardOrder: 3,
        cardGenDate: '2026-03-10',
        activeMembers: 1,
        hasNextTemplate: true,
        lastCard: { order: 3, replyCount: 0 },
      },
      now,
    );
    expect(result.canIssue).toBe(false);
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.key);
    expect(failed).toEqual(expect.arrayContaining(['isActive', 'memberEligible', 'participation']));
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/card/card-eligibility.spec.ts` → FAIL (module not found).

- [ ] **Step 3: 평가기 구현** — `src/card/card-eligibility.ts`:

```typescript
import dayjs from 'dayjs';

const PARTICIPATION_THRESHOLD = 0.5;

export function hasValidTiming(cardGenDate: string | null, noticeTime: string, now: dayjs.Dayjs): boolean {
  const [hour, mins] = noticeTime.split(':').map(Number);
  const targetGenDate = dayjs(cardGenDate ?? undefined)
    .set('hour', hour)
    .set('minute', mins);
  return !targetGenDate.isAfter(now);
}

export function isMemberEligible(type: string, activeMembers: number): boolean {
  if (type === 'alone') return true;
  return activeMembers > 1;
}

export function hasEnoughParticipation(activeMembers: number, replyCount: number): boolean {
  if (activeMembers <= 0) return false;
  const rate = replyCount / activeMembers;
  if (activeMembers === 2) return rate > PARTICIPATION_THRESHOLD;
  return rate >= PARTICIPATION_THRESHOLD;
}

export interface CardEligibilityInput {
  dueRemovedAt: Date | string | null;
  isActive: boolean;
  spaceInfo: { type: string; noticeTime: string } | null;
  cardOrder: number;
  cardGenDate: string | null;
  activeMembers: number;
  hasNextTemplate: boolean;
  lastCard: { order: number; replyCount: number } | null;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface CardEligibilityResult {
  canIssue: boolean;
  checks: EligibilityCheck[];
}

export function evaluateCardEligibility(input: CardEligibilityInput, now: dayjs.Dayjs): CardEligibilityResult {
  const checks: EligibilityCheck[] = [];
  const info = input.spaceInfo;
  const isFirstCard = input.cardOrder === 0;

  checks.push({
    key: 'notScheduledForRemoval',
    label: '삭제 예정 아님',
    passed: input.dueRemovedAt == null,
    detail: input.dueRemovedAt ? '삭제 예정 상태' : undefined,
  });
  checks.push({
    key: 'isActive',
    label: '공간 활성',
    passed: input.isActive === true,
    detail: input.isActive ? undefined : '비활성 — owner 첫 답변 시 자동 활성화',
  });
  checks.push({
    key: 'hasSpaceInfo',
    label: '공간 정보 존재',
    passed: !!info,
    detail: info ? undefined : '공간 정보 없음',
  });
  checks.push({
    key: 'hasNextTemplate',
    label: '다음 카드 템플릿 존재',
    passed: input.hasNextTemplate,
    detail: input.hasNextTemplate ? undefined : '다음 템플릿 없음 (소진 또는 미발행)',
  });

  const timingPassed = isFirstCard && input.cardGenDate == null ? true : !!info && hasValidTiming(input.cardGenDate, info.noticeTime, now);
  checks.push({
    key: 'timingArrived',
    label: '발급 시각 도래',
    passed: timingPassed,
    detail: timingPassed ? undefined : '다음 발급 예정 시각 미도래',
  });

  const memberPassed = !!info && isMemberEligible(info.type, input.activeMembers);
  checks.push({
    key: 'memberEligible',
    label: '멤버 자격',
    passed: memberPassed,
    detail: memberPassed ? undefined : `그룹 공간 활성 멤버 ${input.activeMembers}명 (2명 이상 필요)`,
  });

  const participationPassed =
    isFirstCard || !input.lastCard || hasEnoughParticipation(input.activeMembers, input.lastCard.replyCount);
  checks.push({
    key: 'participation',
    label: '참여율 충족',
    passed: participationPassed,
    detail: participationPassed
      ? undefined
      : `직전 카드 참여 부족 (${input.lastCard?.replyCount ?? 0}/${input.activeMembers})`,
  });

  return { canIssue: checks.every((c) => c.passed), checks };
}
```

- [ ] **Step 4: 통과 확인** — Run: `yarn test src/card/card-eligibility.spec.ts` → PASS.

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/card/card-eligibility.ts src/card/card-eligibility.spec.ts
git commit -m "feat(card): extract pure card-eligibility evaluator (single source for issuance gates)"
```

## Task 2: 크론을 공유 술어로 위임 (behavior-preserving)

**Files:** Modify `src/card/cron/card-create.cron.ts`

- [ ] **Step 1: import 추가** — 파일 상단 import 블록에:

```typescript
import { hasValidTiming as evalHasValidTiming, isMemberEligible, hasEnoughParticipation } from 'src/card/card-eligibility';
```

- [ ] **Step 2: 술어 3곳을 위임으로 교체**

`hasValidTiming`(166-172) 본문을 교체:
```typescript
  private hasValidTiming(space: any, today: dayjs.Dayjs): boolean {
    return evalHasValidTiming(space.cardGenDate, space.spaceInfo.noticeTime, today);
  }
```

`isEligibleForCardCreation`(152-161) 본문의 판정부를 교체:
```typescript
  private async isEligibleForCardCreation(space: any, prisma?: any): Promise<boolean> {
    const info = space.spaceInfo;
    if (info.type === 'alone') return true;
    const activeProfilesCount = await this.getActiveProfileCount(space.id, prisma);
    return isMemberEligible(info.type, activeProfilesCount);
  }
```

`hasHighParticipation`(239-245) 본문을 교체:
```typescript
  private async hasHighParticipation(space: any, lastCard: any, prisma?: any): Promise<boolean> {
    const totalMembers = await this.getActiveProfileCount(space.id, prisma);
    return hasEnoughParticipation(totalMembers, lastCard.replies.length);
  }
```

> `PARTICIPATION_THRESHOLD` 상수는 더 이상 참조되지 않으면 제거(미사용 린트 방지). `this.PARTICIPATION_THRESHOLD` 잔존 참조가 없는지 확인.

- [ ] **Step 3: 크론 회귀 테스트 통과 확인** — Run: `yarn test src/card/cron/card-create.cron.spec.ts` → 기존 7개 PASS(동작 보존).

- [ ] **Step 4: 빌드** — Run: `yarn build` → 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/card/cron/card-create.cron.ts
git commit -m "refactor(card): delegate cron issuance gates to shared evaluator (no behavior change)"
```

## Task 3: 어드민 진단 엔드포인트

**Files:** Modify `src/admin/space/space.service.ts`, `space.controller.ts`, `space.service.spec.ts`

- [ ] **Step 1: 실패 테스트** — `space.service.spec.ts`에 mock 보강 + describe 추가. `createPrismaServiceMock`에 `cardTemplate: { findFirst: jest.fn() }` 추가, `card`/`profile`은 기존 존재. 그리고:

```typescript
  describe('diagnoseCardEligibility', () => {
    it('returns canIssue=false with failed isActive check for inactive group space', async () => {
      prisma.space.findUnique.mockResolvedValue({
        id: 'space-1',
        isActive: false,
        dueRemovedAt: null,
        cardOrder: 3,
        cardGenDate: '2026-03-10',
        spaceInfo: { type: 'family', noticeTime: '09:00', locale: 'ko' },
        cards: [{ order: 3, replies: [{ profileId: 'p1' }] }],
      });
      prisma.profile.count.mockResolvedValue(1);
      prisma.cardTemplate.findFirst.mockResolvedValue({ id: 7, order: 4 });

      const result = (await service.diagnoseCardEligibility('space-1')) as {
        canIssue: boolean;
        activeMembers: number;
        checks: { key: string; passed: boolean }[];
      };

      expect(result.canIssue).toBe(false);
      expect(result.activeMembers).toBe(1);
      expect(result.checks.find((c) => c.key === 'isActive')?.passed).toBe(false);
      expect(result.checks.find((c) => c.key === 'hasNextTemplate')?.passed).toBe(true);
    });
  });
```

`SpaceService` 타입 헬퍼에 `diagnoseCardEligibility: (id: string) => Promise<unknown>;` 추가.

- [ ] **Step 2: 실패 확인** — Run: `yarn test src/admin/space/space.service.spec.ts` → FAIL.

- [ ] **Step 3: 서비스 구현** — `space.service.ts` 상단 import에 추가:

```typescript
import { evaluateCardEligibility } from 'src/card/card-eligibility';
import { getActiveMemberWhere } from 'src/space/member-count.util';
import DateUtil from 'src/utils/DateUtil';
```
(이미 `DateUtil` import가 있으면 중복 추가하지 말 것.)

클래스에 메서드 추가(`getSpaceActivity` 뒤):

```typescript
  async diagnoseCardEligibility(id: string) {
    const space = await this.prisma.space.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        dueRemovedAt: true,
        cardOrder: true,
        cardGenDate: true,
        spaceInfo: { select: { type: true, noticeTime: true, locale: true } },
        cards: {
          orderBy: { createdAt: Prisma.SortOrder.desc },
          take: 1,
          select: { order: true, replies: { where: { profile: { disabled: false } }, select: { profileId: true } } },
        },
      },
    });
    if (!space) throw NotFoundException();

    const activeMembers = await this.prisma.profile.count({ where: getActiveMemberWhere(id) });
    const lastCard = space.cards[0];
    const hasNextTemplate = space.spaceInfo
      ? !!(await this.prisma.cardTemplate.findFirst({
          where: {
            type: 'basic',
            locale: space.spaceInfo.locale,
            isPublished: true,
            spaceType: space.spaceInfo.type,
            order: { gt: space.cardOrder },
          },
          select: { id: true },
        }))
      : false;

    const { canIssue, checks } = evaluateCardEligibility(
      {
        dueRemovedAt: space.dueRemovedAt,
        isActive: space.isActive,
        spaceInfo: space.spaceInfo ? { type: space.spaceInfo.type, noticeTime: space.spaceInfo.noticeTime } : null,
        cardOrder: space.cardOrder,
        cardGenDate: space.cardGenDate,
        activeMembers,
        hasNextTemplate,
        lastCard: lastCard ? { order: lastCard.order, replyCount: lastCard.replies.length } : null,
      },
      DateUtil.now(),
    );

    return {
      canIssue,
      cardOrder: space.cardOrder,
      nextGenAt: space.cardGenDate,
      activeMembers,
      lastCard: lastCard ? { order: lastCard.order, replyCount: lastCard.replies.length } : null,
      checks,
    };
  }
```

- [ ] **Step 4: 통과 확인** — Run: `yarn test src/admin/space/space.service.spec.ts` → PASS.

- [ ] **Step 5: 컨트롤러 라우트** — `space.controller.ts`에:

```typescript
  @TypedRoute.Get(':id/card-eligibility')
  async diagnoseCardEligibility(@TypedParam('id') id: string) {
    return (await this.spaceService.diagnoseCardEligibility(id)) as any;
  }
```

- [ ] **Step 6: 빌드** — Run: `yarn build` → 성공(`cardTemplate` 필드/타입 검증).

- [ ] **Step 7: 커밋**

```bash
git add src/admin/space/space.service.ts src/admin/space/space.service.spec.ts src/admin/space/space.controller.ts
git commit -m "feat(admin/space): add GET :id/card-eligibility diagnosis endpoint"
```

## Task 4: 프론트 — Overview 진단 패널

**Files:** Modify `src/client/types.ts`, `src/client/space.ts`; Create `SpaceCardEligibilityPanel.tsx`; Modify `SpaceDetailSheet.tsx`.

- [ ] **Step 1: 타입** — `types.ts`에:

```typescript
export type CardEligibilityCheck = { key: string; label: string; passed: boolean; detail?: string | null };

export type CardEligibilityResult = {
  canIssue: boolean;
  cardOrder: number;
  nextGenAt: string | null;
  activeMembers: number;
  lastCard: { order: number; replyCount: number } | null;
  checks: CardEligibilityCheck[];
};
```

- [ ] **Step 2: fetch** — `space.ts`에(타입 import 병합):

```typescript
export async function getSpaceCardEligibility(id: string) {
  const res = await client.get<CardEligibilityResult>(`/space/${id}/card-eligibility`);

  return res.data;
}
```

- [ ] **Step 3: 패널 컴포넌트** — `src/components/page/space/components/tabs/SpaceCardEligibilityPanel.tsx` (DESIGN.md 준수: slate 표면, 상태색은 의미 신호에만, lucide 아이콘):

```tsx
import { getSpaceCardEligibility } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';

function SpaceCardEligibilityPanel({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-card-eligibility', spaceId],
    queryFn: () => getSpaceCardEligibility(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[120px] items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <h3 className='text-base font-semibold text-slate-900'>카드 발급 상태</h3>
        <Badge variant={data.canIssue ? 'softSuccess' : 'softWarning'}>
          {data.canIssue ? '발급 가능' : '발급 차단됨'}
        </Badge>
      </div>
      <div className='divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white px-4 shadow-sm'>
        {data.checks.map((check) => (
          <div key={check.key} className='flex items-start gap-3 py-3'>
            <span
              className={
                check.passed
                  ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'
                  : 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600'
              }
            >
              {check.passed ? <Check className='h-3 w-3' /> : <X className='h-3 w-3' />}
            </span>
            <div className='min-w-0'>
              <div className='text-sm font-medium text-slate-900'>{check.label}</div>
              {!check.passed && check.detail ? <div className='text-xs text-slate-500'>{check.detail}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SpaceCardEligibilityPanel;
```

- [ ] **Step 4: Overview 탭에 삽입** — `SpaceDetailSheet.tsx`의 overview `TabsContent`에서 `SpaceDetailContent` 위에 패널을 추가하고 import:

```tsx
import SpaceCardEligibilityPanel from './tabs/SpaceCardEligibilityPanel';
```
overview 분기(로딩 아닐 때):
```tsx
            ) : (
              <div className='space-y-6'>
                <SpaceCardEligibilityPanel spaceId={id} active={tab === 'overview'} />
                <SpaceDetailContent detail={detail} copyId={copyId} />
              </div>
            )}
```

- [ ] **Step 5: 검증 + 커밋** — Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit -p tsconfig.json` → 0 errors; `yarn lint` → 신규 파일 무경고.

```bash
git add src/client/types.ts src/client/space.ts src/components/page/space/components/tabs/SpaceCardEligibilityPanel.tsx src/components/page/space/components/SpaceDetailSheet.tsx
git commit -m "feat(space): show card-eligibility diagnosis panel in overview tab"
```

## 최종 검증
- [ ] 백엔드: `yarn test src/card/card-eligibility.spec.ts src/card/cron/card-create.cron.spec.ts src/admin/space/space.service.spec.ts` 전부 PASS, `yarn build` 성공.
- [ ] 프론트: `npx tsc --noEmit` 0 errors, `yarn lint` 무경고, `yarn build` 성공.
- [ ] 수동: 비활성/멤버부족/템플릿소진 공간에서 Overview 패널이 실패 게이트를 정확히 표기.

## 비범위
- mutation(강제 발급/공간 값 수정)은 다음 단계. 이 계획은 read-only 진단만.
