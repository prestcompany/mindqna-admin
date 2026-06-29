# 공간 강제 카드 발급 (S2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 자격 진단이 "대기"로 막힌 공간을 어드민에서 게이트(시간·참여·멤버) 무시하고 즉시 발급한다.

**Architecture:** cron(`CardCreateCron`)의 기존 발급 코드(`generateNewCard`)를 게이트 없이 호출하는 public `forceCreateCard(spaceId)`를 추가. 어드민 `SpaceModule`이 `CardModule`을 import해 `SpaceController`에서 호출, `POST /admin/space/:id/force-card`로 노출. 진단 패널에 조건부 "강제 발급" 버튼 + 확인 다이얼로그.

**Tech Stack:** NestJS 10 + Nestia, Prisma 5.8, Jest. 어드민: Next.js, React Query, shadcn/ui.

**Repos:**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 어드민: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Constraints:** 스키마 변경 없음. 발급 로직은 cron 코드 재사용(별도 경로 금지). 푸시는 SSH로 직접. 이모지 금지.

---

## File Structure

**백엔드 (`mindqna-server`)**
- Modify `src/card/cron/card-create.cron.ts` — `forceCreateCard` public 메서드 + import(NotFoundException, BadRequestException)
- Modify `src/card/cron/card-create.cron.spec.ts` — 에러 mock에 NotFoundException 추가 + forceCreateCard 테스트
- Modify `src/admin/space/space.module.ts` — `CardModule` import
- Modify `src/admin/space/space.controller.ts` — `CardCreateCron` 주입 + POST 라우트
- `src/card/card.module.ts` — 변경 없음(이미 `CardCreateCron` export)

**어드민 (`mindqna-admin`)**
- Modify `src/client/space.ts` — `forceCreateCard` fetcher
- Modify `src/components/page/space/components/tabs/SpaceCardEligibilityPanel.tsx` — 조건부 버튼 + 확인 다이얼로그

---

## Task 1: `forceCreateCard` 서비스 (TDD)

**Files:**
- Modify: `src/card/cron/card-create.cron.ts`
- Modify: `src/card/cron/card-create.cron.spec.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 에러 mock 확장**

`src/card/cron/card-create.cron.spec.ts`의 에러 모듈 mock에 `NotFoundException`을 추가한다(현재 `NotFoundCardTemplateException`만 있음 — 이 `jest.mock` 블록 교체, 새로 추가 아님):
```ts
jest.mock(
  'src/common/exception/error',
  () => ({
    NotFoundCardTemplateException: () => new Error('Not Found Card Template'),
    NotFoundException: () => new Error('Not Found'),
  }),
  { virtual: true },
);
```

- [ ] **Step 2: 실패 테스트 추가**

`card-create.cron.spec.ts`의 `describe('CardCreateCron', () => { ... })` 안 마지막에 추가한다(`createService(databaseManager)` 헬퍼는 기존에 있음):

```ts
  describe('forceCreateCard', () => {
    const activeSpace = {
      id: 'space-1',
      isActive: true,
      dueRemovedAt: null,
      cardOrder: 2,
      cardGenDate: null,
      spaceInfo: { spaceId: 'space-1', noticeTime: '21:00', type: 'couple', locale: 'ko' },
    };

    it('bypasses gates and issues a card via generateNewCard', async () => {
      const databaseManager = { read: jest.fn().mockResolvedValue(activeSpace) };
      const service = createService(databaseManager);
      (service as any).generateNewCard = jest.fn().mockResolvedValue([{ id: 'space-1' }, { id: 99, order: 3 }]);

      const result = await service.forceCreateCard('space-1');

      expect((service as any).generateNewCard).toHaveBeenCalledWith(activeSpace);
      expect(result).toEqual({ cardId: 99, order: 3 });
    });

    it('throws NotFound when the space does not exist', async () => {
      const databaseManager = { read: jest.fn().mockResolvedValue(null) };
      const service = createService(databaseManager);
      (service as any).generateNewCard = jest.fn();

      await expect(service.forceCreateCard('missing')).rejects.toThrow('Not Found');
      expect((service as any).generateNewCard).not.toHaveBeenCalled();
    });

    it('rejects an inactive space', async () => {
      const databaseManager = { read: jest.fn().mockResolvedValue({ ...activeSpace, isActive: false }) };
      const service = createService(databaseManager);
      (service as any).generateNewCard = jest.fn();

      await expect(service.forceCreateCard('space-1')).rejects.toThrow();
      expect((service as any).generateNewCard).not.toHaveBeenCalled();
    });

    it('rejects a space scheduled for removal', async () => {
      const databaseManager = {
        read: jest.fn().mockResolvedValue({ ...activeSpace, dueRemovedAt: new Date('2026-08-01') }),
      };
      const service = createService(databaseManager);
      (service as any).generateNewCard = jest.fn();

      await expect(service.forceCreateCard('space-1')).rejects.toThrow();
      expect((service as any).generateNewCard).not.toHaveBeenCalled();
    });

    it('throws NotFoundCardTemplate when no template is available', async () => {
      const databaseManager = { read: jest.fn().mockResolvedValue(activeSpace) };
      const service = createService(databaseManager);
      (service as any).generateNewCard = jest.fn().mockResolvedValue(null);

      await expect(service.forceCreateCard('space-1')).rejects.toThrow('Not Found Card Template');
    });

    // 통합: generateNewCard를 mock하지 않고 실제 트랜잭션을 돌려 skipGates가 내부 timing 게이트를 우회함을 증명.
    // (기존 'revalidates notice time' 테스트는 동일한 미래 시각 공간에서 skipGates 없이 null을 반환함 — 대비 확인)
    it('skipGates bypasses the transaction-level timing gate', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-22T00:00:00+09:00'));
      const tx = createTransactionMock();
      const databaseManager = {
        transaction: jest.fn().mockImplementation((cb: (c: typeof tx) => Promise<unknown>) => cb(tx)),
      };
      const service = createService(databaseManager);

      // noticeTime 00:30 > 현재 00:00 → 게이트가 켜져 있으면 timing 실패(null)인 공간
      tx.space.findUnique.mockResolvedValue({
        id: 'space-1',
        cardOrder: 1,
        cardGenDate: '2026-04-22',
        spaceInfo: { noticeTime: '00:30', type: 'couple', locale: 'ko' },
        cards: [{ id: 100, order: 1, replies: [] }],
      });
      tx.cardTemplate.findFirst.mockResolvedValue({ id: 11, order: 2 });
      tx.card.findFirst.mockResolvedValue(null);
      tx.space.updateMany.mockResolvedValue({ count: 1 });
      tx.card.aggregate.mockResolvedValue({ _max: { order: 1 } });
      tx.profile.findMany.mockResolvedValue([]);
      tx.card.create.mockResolvedValue({ id: 99, order: 2 });

      const result = await (service as any).createCardAndUpdateSpace({ id: 'space-1' }, { skipGates: true });

      expect(tx.card.create).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });
  });
```

- [ ] **Step 3: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/card/cron/card-create.cron.spec.ts -t forceCreateCard`
Expected: FAIL — `service.forceCreateCard is not a function`

- [ ] **Step 4: 구현**

`src/card/cron/card-create.cron.ts` 상단 import 조정:
- 예외 import 변경: 현재 `import { NotFoundCardTemplateException } from 'src/common/exception/error';` → `import { NotFoundCardTemplateException, NotFoundException } from 'src/common/exception/error';`
- `@nestjs/common` import에 `BadRequestException` 추가: 현재 `import { Injectable, Logger } from '@nestjs/common';` → `import { BadRequestException, Injectable, Logger } from '@nestjs/common';`

**먼저 기존 3개 메서드에 `skipGates` 옵션을 전달한다** (트랜잭션 내부 게이트 재검증을 우회하기 위함 — 옵션 없으면 기존 cron 동작 그대로).

`generateNewCard` 시그니처/위임 변경:
```ts
  private async generateNewCard(space: any, options?: { skipGates?: boolean }) {
    const cardCreationResult = await this.createCardAndUpdateSpace(space, options);
```
(이후 본문 동일)

`createCardAndUpdateSpace` 시그니처/위임 변경:
```ts
  private async createCardAndUpdateSpace(space: any, options?: { skipGates?: boolean }) {
    try {
      return await this.executeCardCreationTransaction(space, options);
```
(catch 블록 동일)

`executeCardCreationTransaction` 시그니처 변경 + 게이트 3개를 옵션으로 감싼다. 현재:
```ts
  private async executeCardCreationTransaction(space: any) {
    return await this.databaseManager.transaction(async (tx) => {
```
변경:
```ts
  private async executeCardCreationTransaction(space: any, options?: { skipGates?: boolean }) {
    return await this.databaseManager.transaction(async (tx) => {
```
그리고 트랜잭션 내부의 게이트 3줄:
```ts
      if (!this.hasValidTiming(currentSpace, DateUtil.now())) return null;
      if (!(await this.isEligibleForCardCreation(currentSpace, tx))) return null;
      if (!(await this.shouldGenerateCard(currentSpace, tx))) return null;
```
을 다음으로 교체:
```ts
      if (!options?.skipGates) {
        if (!this.hasValidTiming(currentSpace, DateUtil.now())) return null;
        if (!(await this.isEligibleForCardCreation(currentSpace, tx))) return null;
        if (!(await this.shouldGenerateCard(currentSpace, tx))) return null;
      }
```
> `currentSpace.spaceInfo` null 가드(`if (!currentSpace.spaceInfo) return null;`)와 템플릿/`updateMany`/`card.create`는 그대로 둔다 — 데이터 무결성은 우회하지 않는다.

`CardCreateCron` 클래스 안(다른 메서드 옆, 예: `processSpaceById` 다음)에 추가한다:
```ts
  /**
   * 어드민 강제 카드 발급 — 타이밍/참여/멤버 게이트를 우회하고 즉시 발급한다.
   * 발급 자체는 cron의 generateNewCard(생성 트랜잭션 + 알림)를 skipGates로 재사용한다.
   * noTemplate/inactive/scheduledRemoval은 차단한다.
   */
  async forceCreateCard(spaceId: string) {
    const space = await this.databaseManager.read(async (prisma) =>
      prisma.space.findUnique({
        where: { id: spaceId },
        select: {
          id: true,
          isActive: true,
          dueRemovedAt: true,
          cardOrder: true,
          cardGenDate: true,
          spaceInfo: { select: { spaceId: true, noticeTime: true, type: true, locale: true } },
        },
      }),
    );

    if (!space) throw NotFoundException();
    if (!space.isActive) throw new BadRequestException('비활성 공간에는 강제 발급할 수 없습니다.');
    if (space.dueRemovedAt) throw new BadRequestException('삭제 예정 공간에는 강제 발급할 수 없습니다.');

    this.logger.log(`forceCreateCard: spaceId=${spaceId}`); // 강제 발급 감사 로그

    // skipGates로 트랜잭션 내부 게이트(시간·참여·멤버)까지 우회. 실제 발급은 정상 경로 재사용.
    const result = await this.generateNewCard(space, { skipGates: true });
    if (!result) throw NotFoundCardTemplateException();

    const [, card] = result;
    return { cardId: card.id, order: card.order };
  }
```

- [ ] **Step 5: 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/card/cron/card-create.cron.spec.ts`
Expected: PASS (기존 + forceCreateCard 5개 + skipGates 통합 1개).

타입체크:
Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "card-create.cron" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 6: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/card/cron/card-create.cron.ts src/card/cron/card-create.cron.spec.ts
git commit -m "feat(card): add forceCreateCard — bypass gates, reuse issuance flow"
```

---

## Task 2: admin 라우트 배선

**Files:**
- Modify: `src/admin/space/space.module.ts`
- Modify: `src/admin/space/space.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: `SpaceModule`에 `CardModule` import**

`src/admin/space/space.module.ts`를 변경:
```ts
import { Module } from '@nestjs/common';
import { SpaceService } from './space.service';
import { SpaceController } from './space.controller';
import { CardModule } from 'src/card/card.module';

@Module({
  imports: [CardModule],
  providers: [SpaceService],
  controllers: [SpaceController],
})
export class SpaceModule {}
```

- [ ] **Step 2: 컨트롤러 주입 + 라우트**

`src/admin/space/space.controller.ts` import 추가:
```ts
import { CardCreateCron } from 'src/card/cron/card-create.cron';
```
생성자 변경(현재 `constructor(private readonly spaceService: SpaceService) {}`):
```ts
  constructor(
    private readonly spaceService: SpaceService,
    private readonly cardCreateCron: CardCreateCron,
  ) {}
```
라우트 추가(`removeSpace` Delete 라우트 근처, 클래스 안):
```ts
  @TypedRoute.Post(':id/force-card')
  async forceCreateCard(@TypedParam('id') id: string) {
    return (await this.cardCreateCron.forceCreateCard(id)) as any;
  }
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "admin/space|space.module|space.controller" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/space/space.module.ts src/admin/space/space.controller.ts
git commit -m "feat(admin/space): expose POST /admin/space/:id/force-card"
```

---

## Task 3: 어드민 fetcher

**Files:**
- Modify: `src/client/space.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: fetcher 추가**

`src/client/space.ts` 맨 아래에 추가:
```ts
export async function forceCreateCard(spaceId: string) {
  const res = await client.post(`/space/${spaceId}/force-card`);

  return res.data;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "client/space" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 3: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/space.ts
git commit -m "feat(space): add forceCreateCard client fetcher"
```

---

## Task 4: 진단 패널 "강제 발급" 버튼

**Files:**
- Modify: `src/components/page/space/components/tabs/SpaceCardEligibilityPanel.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: import + 강제 발급 가능 status 상수**

`SpaceCardEligibilityPanel.tsx` 상단 import 추가/병합:
```ts
import { forceCreateCard, getSpaceCardEligibility } from '@/client/space';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';
```
(기존 `import { getSpaceCardEligibility } from '@/client/space';`, `import { useQuery } from '@tanstack/react-query';`는 위 형태로 병합. `Check`/`Loader2`/`X`/`Badge`/`dayjs`/`type` import는 유지.)

파일 상단(컴포넌트 밖)에 추가:
```ts
const FORCE_ISSUABLE_STATUSES = ['waitingSchedule', 'waitingParticipation', 'needsMembers'];
```

- [ ] **Step 2: mutation + 확인 상태**

`SpaceCardEligibilityPanel` 본문의 `const { data, isFetching } = useQuery(...)` 아래에 추가:
```ts
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => forceCreateCard(spaceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['space-card-eligibility', spaceId] }),
        queryClient.invalidateQueries({ queryKey: ['space-detail', spaceId] }),
      ]);
      toast.success('카드를 강제 발급했습니다.');
      setConfirmOpen(false);
    },
    onError: (err) => toast.error((err as any)?.response?.data?.message ?? `${err}`),
  });
```

- [ ] **Step 3: 헤더에 버튼 + AlertDialog**

헤더 블록을 변경한다. 현재:
```tsx
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <h3 className='text-base font-semibold text-slate-900'>카드 발급 상태</h3>
        <Badge variant={meta.variant}>{meta.label}</Badge>
        <span className='text-xs text-slate-500'>{meta.desc}</span>
      </div>
```
변경:
```tsx
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1'>
          <h3 className='text-base font-semibold text-slate-900'>카드 발급 상태</h3>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className='text-xs text-slate-500'>{meta.desc}</span>
        </div>
        {FORCE_ISSUABLE_STATUSES.includes(data.status) ? (
          <Button
            type='button'
            variant='outline'
            size='default'
            className='shrink-0'
            onClick={() => setConfirmOpen(true)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
            강제 발급
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카드 강제 발급</AlertDialogTitle>
            <AlertDialogDescription>
              게이트(시간·참여·멤버)를 우회해 카드를 즉시 발급합니다. 멤버 전원에게 푸시 알림이 전송되며 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 text-white hover:bg-rose-700'
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              강제 발급
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "SpaceCardEligibilityPanel" ; echo TSC_DONE`
Expected: 에러 줄 없음.

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && pnpm build 2>&1 | grep -iE "Compiled successfully|Failed to compile|error|/space/list"`
Expected: `Compiled successfully` + `/space/list` 라인.

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/space/components/tabs/SpaceCardEligibilityPanel.tsx
git commit -m "feat(space): add force-issue button to card eligibility panel"
```

---

## 최종 검증 (수동)

- [ ] 대기 상태(시간/참여/멤버) 공간 → 진단 패널에 "강제 발급" 버튼 노출
- [ ] noTemplate/error/inactive/scheduledRemoval 공간 → 버튼 비노출
- [ ] 버튼 → 확인 다이얼로그 → 확인 시 카드 발급 + 멤버 푸시 + 진단/상세 갱신(cardOrder 증가)
- [ ] 발급 후 status가 갱신(예: issuable 또는 다음 대기)
- [ ] 비활성/삭제예정 공간에 직접 API 호출 시 400(서버 방어)
- [ ] 다음 템플릿 없는 공간에 강제 시 템플릿 없음 에러 toast

> 푸시는 SSH로 직접. 스키마 변경 없음.
