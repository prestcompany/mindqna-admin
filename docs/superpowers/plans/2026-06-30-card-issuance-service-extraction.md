# CardIssuanceService 추출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 발급 로직을 `CardCreateCron`에서 신규 `CardIssuanceService`로 추출(순수 이동, 동작 변경 0).

**Architecture:** cron은 스케줄링(`createSpaceCard`/`fetchSpacesBatch`/`filterSpacesToProcess`/`processBatch`)만 남기고, 발급 메서드 전부를 `CardIssuanceService`로 옮긴다. cron과 어드민은 서비스를 DI로 호출한다. 메서드 본문은 무수정 이동, 글루(생성자·import·호출부)만 변경.

**Tech Stack:** NestJS 10, Prisma 5.8, Jest. critical path(10분 카드 발급 cron) — 동작 보존 최우선.

**Repo:** `/Users/gargoyle92/Documents/backend/mindqna-server` (어드민은 배선 1파일만)

**Constraints:** 스키마 변경 없음. 로직 수정 금지(자르고-붙이기). 푸시는 SSH로 직접.

**핵심 검증 게이트(매 태스크 후):** `npx jest src/card` 전체 green + `npx tsc --noEmit` 신규 에러 0.

---

## File Structure

- Create `src/card/cron/card-issuance.service.ts` — 발급 책임 전부(이동)
- Modify `src/card/cron/card-create.cron.ts` — 스케줄링만 잔류, 위임
- Create `src/card/cron/card-issuance.service.spec.ts` — 이동된 발급 테스트
- Modify `src/card/cron/card-create.cron.spec.ts` — 스케줄링 테스트만 잔류
- Modify `src/card/card.module.ts` — `CardIssuanceService` provider/export
- Modify `src/admin/space/space.controller.ts` — 주입을 `CardIssuanceService`로 교체

**이동 대상 메서드(본문 무수정, cron→service)**: `processSpaceById`, `forceCreateCard`, `isEligibleForCardCreation`, `hasValidTiming`, `getActiveProfileCount`, `processSpace`, `shouldGenerateCard`, `hasHighParticipation`, `generateNewCard`, `handleCardCreatedNotification`, `getCardTemplate`, `createCardAndUpdateSpace`, `ensureUniqueTemplate`, `executeCardCreationTransaction`, `handleFirstCard`, `sendNewCardPushes`.

**cron 잔류**: `createSpaceCard`, `fetchSpacesBatch`, `filterSpacesToProcess`, `processBatch`.

---

## Task 1: `CardIssuanceService` 생성 (메서드 이동)

**Files:**
- Create: `src/card/cron/card-issuance.service.ts`
- Modify: `src/card/cron/card-create.cron.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 새 서비스 파일 골격 작성**

`src/card/cron/card-issuance.service.ts`를 생성한다. 헤더(import + 클래스 + 생성자)는 아래로, 본문 메서드는 Step 2에서 cron에서 잘라 붙인다.

```ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import { NotFoundCardTemplateException, NotFoundException } from 'src/common/exception/error';
import { DatabaseManagerService } from 'src/database/services/database-manager.service';
import { FcmService } from 'src/fcm/fcm.service';
import { generatePath } from 'src/fcm/fcm.util';
import t from 'src/i18n';
import { getActiveMemberWhere } from 'src/space/member-count.util';
import {
  hasEnoughParticipation,
  hasValidTiming as evalHasValidTiming,
  isMemberEligible,
} from 'src/card/card-eligibility';
import DateUtil from 'src/utils/DateUtil';

@Injectable()
export class CardIssuanceService {
  private readonly logger = new Logger(CardIssuanceService.name);
  constructor(
    private readonly databaseManager: DatabaseManagerService,
    private fcm: FcmService,
  ) {}

  // ↓ Step 2에서 cron에서 이동한 메서드들이 여기에 위치
}
```

> 위 import는 이동 메서드들이 실제 쓰는 것들이다. Step 4 tsc에서 미사용 import가 있으면 제거한다.

- [ ] **Step 2: cron에서 발급 메서드를 잘라 서비스로 이동 (본문 무수정)**

`src/card/cron/card-create.cron.ts`에서 아래 메서드들을 **본문 그대로** 잘라내 `card-issuance.service.ts`의 클래스 안으로 옮긴다(순서 무관, 로직 수정 금지):
`processSpaceById`, `forceCreateCard`, `isEligibleForCardCreation`, `hasValidTiming`, `getActiveProfileCount`, `processSpace`, `shouldGenerateCard`, `hasHighParticipation`, `generateNewCard`, `handleCardCreatedNotification`, `getCardTemplate`, `createCardAndUpdateSpace`, `ensureUniqueTemplate`, `executeCardCreationTransaction`, `handleFirstCard`, `sendNewCardPushes`.

이동 후 서비스의 `forceCreateCard`/`processSpaceById`는 `this.logger`(서비스 logger), `this.databaseManager`, `this.fcm`를 그대로 참조 — 모두 서비스에 존재하므로 수정 불필요. `processSpaceById`의 `this.hasValidTiming`도 함께 이동되어 정상.

> 주의: `forceCreateCard`는 cron에 남기지 않는다(서비스로 이동). cron에서 완전히 사라져야 한다.

- [ ] **Step 3: cron 잔류부 정리 (호출부·생성자·import)**

`card-create.cron.ts`에서:
1. 생성자에서 `FcmService` 의존 제거하고 `CardIssuanceService` 추가:
```ts
  constructor(
    private readonly databaseManager: DatabaseManagerService,
    private readonly issuanceService: CardIssuanceService,
  ) {}
```
2. `processBatch` 내부의 `this.processSpace(space)` 호출을 `this.issuanceService.processSpace(space)`로 변경.
3. `filterSpacesToProcess` 내부의 `this.hasValidTiming(space, today)`를 순수 함수 직접 호출로 변경:
```ts
  private filterSpacesToProcess(spaces: any[], today: dayjs.Dayjs): any[] {
    return spaces.filter((space) => evalHasValidTiming(space.cardGenDate, space.spaceInfo.noticeTime, today));
  }
```
4. import 추가: `import { CardIssuanceService } from './card-issuance.service';`. `evalHasValidTiming`(`hasValidTiming as evalHasValidTiming` from `src/card/card-eligibility`)은 유지.
5. 이동으로 미사용이 된 import 제거(`FcmService`, `generatePath`, `t`, `getActiveMemberWhere`, `hasEnoughParticipation`, `isMemberEligible`, `NotFoundCardTemplateException`, `NotFoundException`, `BadRequestException`, `DateUtil` 등 — 실제 잔류 메서드가 안 쓰는 것만). 잔류 메서드(`createSpaceCard`/`fetchSpacesBatch`/`filterSpacesToProcess`/`processBatch`)가 쓰는 것(`Logger`, `Cron`/`CronExpression`, `Space`, `dayjs`, `ExecutionCalculator`, `DatabaseManagerService`, `evalHasValidTiming`)은 유지.

- [ ] **Step 4: 타입체크 (미사용 import·참조 깨짐 탐지)**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "card-create.cron|card-issuance" ; echo DONE`
Expected: 에러 줄 없음. 에러가 나면(미사용 import / 누락 메서드) Step 2~3을 보정.

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/card/cron/card-issuance.service.ts src/card/cron/card-create.cron.ts
git commit -m "refactor(card): extract issuance methods into CardIssuanceService"
```

---

## Task 2: 모듈 등록 + 어드민 배선

**Files:**
- Modify: `src/card/card.module.ts`
- Modify: `src/admin/space/space.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: CardModule에 서비스 등록**

`src/card/card.module.ts`를 변경한다. 현재:
```ts
import { CardCreateCron } from './cron/card-create.cron';
import { CardRemindCron } from './cron/card-remind.cron';
@Module({
  providers: [CardService, CardCreateCron, CardRemindCron],
  controllers: [CardController],
  exports: [CardService, CardCreateCron, CardRemindCron],
})
export class CardModule {}
```
변경:
```ts
import { CardCreateCron } from './cron/card-create.cron';
import { CardRemindCron } from './cron/card-remind.cron';
import { CardIssuanceService } from './cron/card-issuance.service';
@Module({
  providers: [CardService, CardCreateCron, CardRemindCron, CardIssuanceService],
  controllers: [CardController],
  exports: [CardService, CardCreateCron, CardRemindCron, CardIssuanceService],
})
export class CardModule {}
```
(CardController import 등 기존 줄은 유지)

- [ ] **Step 2: 어드민 컨트롤러 주입 교체**

`src/admin/space/space.controller.ts`:
- import 변경: `import { CardCreateCron } from 'src/card/cron/card-create.cron';` → `import { CardIssuanceService } from 'src/card/cron/card-issuance.service';`
- 생성자: `private readonly cardCreateCron: CardCreateCron` → `private readonly issuanceService: CardIssuanceService`
- 라우트 호출: `this.cardCreateCron.forceCreateCard(id)` → `this.issuanceService.forceCreateCard(id)`

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "card.module|admin/space" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/card/card.module.ts src/admin/space/space.controller.ts
git commit -m "refactor(card): register CardIssuanceService; admin injects it instead of cron"
```

---

## Task 3: 테스트 이동 (동작 보존 증명)

**Files:**
- Create: `src/card/cron/card-issuance.service.spec.ts`
- Modify: `src/card/cron/card-create.cron.spec.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 신규 서비스 spec 생성 (발급 테스트 이동)**

`src/card/cron/card-issuance.service.spec.ts`를 생성한다. 기존 `card-create.cron.spec.ts`의 **jest.mock 헤더 블록 전체**(상단 `jest.mock(...)`들 + `jest.requireActual('src/card/card-eligibility')` 라인)와 `createTransactionMock()` 헬퍼를 복사해 넣는다. 단:
- 서비스 타입 선언을 `card-issuance.service`로:
```ts
const { CardIssuanceService } = jest.requireActual('./card-issuance.service') as {
  CardIssuanceService: new (...args: any[]) => {
    shouldGenerateCard: (space: {
      id: string;
      cardOrder: number;
      cards: Array<{ replies: Array<{ profileId: string }> }>;
    }) => Promise<boolean>;
    forceCreateCard: (spaceId: string) => Promise<{ cardId: number; order: number }>;
  };
};
```
- `createService` 헬퍼를 서비스 생성으로:
```ts
  function createService(databaseManager: any = {}) {
    return new CardIssuanceService(databaseManager as never, {} as never);
  }
```
- 그리고 `describe('CardIssuanceService', () => { ... })` 안에 기존 cron spec의 **발급 테스트들을 그대로 이동**한다:
  - `'generates a card when participation is exactly half of active members'`
  - `'does not generate a card for two active members when only one replied'`
  - `'does not generate a card when participation is below half of active members'`
  - `'revalidates notice time on primary before creating a card'`
  - `'skips card creation when another runner already claimed the same space'`
  - `'revalidates participation with only active member replies on primary'`
  - `describe('forceCreateCard', ...)` 블록 전체(`bypasses gates...`, `throws NotFound...`, `rejects an inactive space`, `rejects a space scheduled for removal`, `throws NotFoundCardTemplate...`, `skipGates bypasses the transaction-level timing gate`)
  - 각 테스트가 `(service as any).<private메서드>` 또는 `service.forceCreateCard`를 호출하던 것은 이제 서비스 인스턴스 기준이므로 그대로 동작. `afterEach(() => jest.useRealTimers())`도 함께 이동(없으면 추가).

- [ ] **Step 2: cron spec에서 발급 테스트 제거, 스케줄링만 잔류**

`card-create.cron.spec.ts`에서 Step 1로 옮긴 발급 테스트들을 **삭제**한다. 잔류:
- `'loads only active member replies when fetching batch candidates'`(fetchSpacesBatch 검증)
- 서비스 타입 선언에서 `forceCreateCard` 제거(cron엔 더 이상 없음). `createService`는 그대로 두되, cron이 이제 `CardIssuanceService`를 생성자 2번째 인자로 받으므로 헬퍼를 보정:
```ts
  function createService(databaseManager: any = {}, issuanceService: any = {}) {
    return new CardCreateCron(databaseManager as never, issuanceService as never);
  }
```
> 잔류 테스트(`fetchSpacesBatch`)는 issuanceService를 안 쓰므로 기본 `{}`로 충분.

- [ ] **Step 3: 두 spec 통과 + 전체 카드 테스트 + 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/card 2>&1 | tail -8`
Expected: 모든 카드 테스트 PASS(이동된 발급 테스트가 서비스에서 동일하게 통과 = 동작 보존). `card-issuance.service.spec.ts`와 `card-create.cron.spec.ts` 둘 다 green.

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "card-create.cron.spec|card-issuance.service" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/card/cron/card-issuance.service.spec.ts src/card/cron/card-create.cron.spec.ts
git commit -m "test(card): move issuance tests to CardIssuanceService spec (behavior-preserving)"
```

---

## 최종 검증 (수동/자동)

- [ ] `npx jest src/card` 전체 green (발급 + 스케줄링)
- [ ] `npx tsc --noEmit` 신규 에러 0
- [ ] `CardCreateCron`에 발급 메서드/`forceCreateCard`/`FcmService` 의존이 없음(스케줄링만)
- [ ] `CardIssuanceService`가 발급 책임 소유, cron·admin이 DI로 호출
- [ ] 어드민 강제 발급(`POST /admin/space/:id/force-card`) 동작 동일(서비스 경유)
- [ ] cron 발급 동작 동일(게이트·트랜잭션·skipGates·알림 무변경)

> 순수 리팩터링 — 새 기능/동작 변경 없음. 푸시는 SSH로 직접. 스키마 변경 없음.
