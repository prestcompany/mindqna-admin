# 카드 발급 로직 추출 — CardIssuanceService 설계 (리팩터링)

> 카드 발급 로직을 `CardCreateCron`에서 신규 `CardIssuanceService`로 추출한다. cron은 스케줄링만 담당하고, 발급은 서비스가 소유한다. 어드민 강제 발급도 서비스를 직접 쓴다.
> **순수 리팩터링** — 동작 변경 없음(로직 수정 금지, 위치만 이동).

- 대상 레포: `mindqna-server`(백엔드 단독). 어드민은 배선 한 줄만 변경.
- 동기: 발급 로직이 critical-path cron 클래스 안에 묶여 있어, 강제 발급/발급 변경마다 cron을 건드려야 함(사이드이펙트 위험). 책임 분리로 격리.
- 제약: 스키마 변경 없음. 푸시는 SSH로 직접. 이모지 금지.

## 배경 / 목적

`CardCreateCron`은 스케줄링(배치 루프)과 발급(트랜잭션·템플릿·알림·게이트)을 한 클래스에 갖고 있다. S2(강제 카드 발급)에서 발급 코드를 재사용하려고 cron에 `skipGates`/`forceCreateCard`를 추가했는데, 이는 cron을 손대는 일이라 사이드이펙트 우려가 있다. 발급을 별도 서비스로 분리하면:
- cron은 "언제 발급할지"만, 서비스는 "어떻게 발급할지"만 책임진다.
- 어드민/강제 발급/향후 발급 변경이 cron의 스케줄링 코드를 건드리지 않는다.
- 어드민 컨트롤러가 Cron 클래스를 주입하는 어색함이 사라진다.

## 추출 경계 (결정됨)

**`CardIssuanceService`로 이동 (발급 책임 전부)**
- 진입점: `processSpace(space)`, `processSpaceById(spaceId)`, `forceCreateCard(spaceId)`
- 발급 체인: `generateNewCard`(+`skipGates`), `createCardAndUpdateSpace`, `executeCardCreationTransaction`, `getCardTemplate`, `ensureUniqueTemplate`
- 알림: `handleCardCreatedNotification`, `handleFirstCard`, `sendNewCardPushes`
- 게이트: `hasValidTiming`(어댑터), `isEligibleForCardCreation`, `getActiveProfileCount`, `shouldGenerateCard`, `hasHighParticipation`
- 주입: `DatabaseManagerService`, `FcmService`

**`CardCreateCron`에 잔류 (스케줄링)**
- `@Cron createSpaceCard`, `fetchSpacesBatch`, `filterSpacesToProcess`, `processBatch`
- per-space 처리는 `this.issuanceService.processSpace(space)`로 위임
- `filterSpacesToProcess`의 타이밍 체크는 cron의 private `hasValidTiming` 대신 **순수 함수 `card-eligibility`의 `hasValidTiming`을 직접 호출**(cron의 private 어댑터는 서비스로 이동하므로 cron에는 안 남김)
- 주입: `DatabaseManagerService`, `CardIssuanceService`(신규). 기존 `FcmService` 주입은 제거(알림이 서비스로 이동)

## 아키텍처 / 데이터 흐름

```
스케줄 트리거(10분) → CardCreateCron.createSpaceCard
   → fetchSpacesBatch → filterSpacesToProcess(hasValidTiming 순수함수) → processBatch
   → 각 space → issuanceService.processSpace(space)   // 발급 위임

어드민 강제 발급 → SpaceController → issuanceService.forceCreateCard(spaceId)
```

발급 내부 동작(게이트·트랜잭션·skipGates·알림)은 **이동 전과 100% 동일**.

## 백엔드 (mindqna-server)

### 신규 파일 — `src/card/cron/card-issuance.service.ts` (또는 `src/card/card-issuance.service.ts`)
- `@Injectable() class CardIssuanceService`.
- 생성자: `constructor(private readonly databaseManager: DatabaseManagerService, private fcm: FcmService) {}`.
- 위 "이동" 메서드들을 cron에서 **그대로 잘라 붙임**(본문 로직 무수정). `this.databaseManager`/`this.fcm` 참조는 서비스의 주입 필드로 자연 연결.
- import는 이동 메서드가 쓰는 것만 가져옴: `FcmService`, `generatePath`, `t`(i18n), `getActiveMemberWhere`, card-eligibility(`hasEnoughParticipation`/`isMemberEligible`/`hasValidTiming as evalHasValidTiming`), `DateUtil`, `NotFoundCardTemplateException`/`NotFoundException`, `BadRequestException`, `Logger`, `Injectable`.

### `src/card/cron/card-create.cron.ts`
- 이동된 메서드 삭제. `processBatch`의 `this.processSpace(space)` → `this.issuanceService.processSpace(space)`.
- `filterSpacesToProcess`: `this.hasValidTiming(space, today)` → `evalHasValidTiming(space.cardGenDate, space.spaceInfo.noticeTime, today)`.
- 생성자: `constructor(private readonly databaseManager: DatabaseManagerService, private readonly issuanceService: CardIssuanceService) {}` (FcmService 제거).
- 미사용 import 정리(FcmService/generatePath/t/getActiveMemberWhere/NotFound*/BadRequest 등 이동분 제거; `evalHasValidTiming`은 유지).

### `src/card/card.module.ts`
- `providers`/`exports`에 `CardIssuanceService` 추가. `CardCreateCron`은 유지(이제 `CardIssuanceService` 의존).

### 호출부 배선
- `src/admin/space/space.controller.ts`: `CardCreateCron` 주입 → `CardIssuanceService` 주입으로 교체(`forceCreateCard` 호출). `space.module.ts`는 이미 `CardModule` import 중.
- `src/test/test.controller.ts`: `processSpaceById`(이동)와 `createSpaceCard`(잔류)를 **둘 다** 호출하므로, `CardIssuanceService`를 추가 주입하고 `processSpaceById` 호출만 서비스로 바꾼다(단순 교체 아님). test.module은 이미 `CardModule` import 중.
- 이동 메서드의 외부 호출자는 위 둘뿐임(전체 grep 확인).

## 테스트 (동작 보존 증명)

- **신규 `src/card/cron/card-issuance.service.spec.ts`**: 기존 `card-create.cron.spec.ts`의 발급 관련 테스트(처리/생성/게이트/`forceCreateCard`/`skipGates`/notice-time 재검증 등)를 그대로 옮긴다. 단 `createService`가 `new CardIssuanceService(databaseManager, fcm)`를 생성하도록 조정. 어설션·mock은 동일 → 이동 후에도 같은 결과 = 동작 보존 증명.
- **`card-create.cron.spec.ts` 잔류**: 스케줄링 테스트(`fetchSpacesBatch`, `filterSpacesToProcess` 활성 멤버 필터 등)만 남김. cron이 `processSpace`를 위임하므로 필요 시 `issuanceService` mock으로 위임 검증.
- 두 spec 모두 green + `npx tsc --noEmit` 0 에러여야 머지.

## 에러 / 엣지

- 순수 이동이라 새 에러 경로 없음. 기존 예외(`NotFoundCardTemplateException` 등) 그대로.
- DI 순환참조 주의: `CardIssuanceService`는 cron/admin을 import하지 않음(단방향). cron → service, admin → service.

## 알려진 한계 / 경계

- 순수 리팩터링 — 새 기능/동작 변경 없음.
- `card-remind.cron`(CardRemindCron)은 범위 밖(발급과 무관).
- 파일 위치는 `src/card/cron/card-issuance.service.ts`로 확정(cron과 동거, import 경로 최소화).

## 배포 / 운영 주의

- 스키마/환경변수 변경 없음.
- critical path(10분 카드 발급 cron) — 동작 보존이 최우선. 자르고-붙이기 + 테스트 이동으로 동일성 보장.
- 푸시는 SSH로 직접.
