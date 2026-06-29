# 공간 강제 카드 발급 — 설계 (S2)

> 카드 자격 진단(`card-eligibility`)이 "대기" 상태로 막힌 공간에 대해, 운영자가 어드민에서 **타이밍·참여·멤버 게이트를 무시하고 즉시 카드를 발급**한다.
> 이미 만든 진단 UI의 "조치" 짝을 완성하는 것이 목적이다.

- 대상 레포: `mindqna-server`(백엔드), `mindqna-admin`(어드민 프런트)
- 제약: 스키마 변경 없음. 새 자격증명 없음. 푸시는 SSH로 직접. 이모지 금지. 디자인은 기존 패널과 동일.

## 배경 / 목적

`SpaceCardEligibilityPanel`이 "왜 카드가 발급 안 됐는지"를 진단(status enum)으로 보여주지만, 이를 **고치는 액션이 없다**. 운영자가 문제를 보고도 손을 못 쓰는 상태다. 본 기능은 cron의 정상 발급 로직을 **게이트 없이** 호출해 그 공백을 메운다.

핵심 원칙: **발급 로직은 cron(`card-create.cron`)의 기존 코드를 재사용**한다(`generateNewCard` → 생성 트랜잭션 + 알림). 별도 발급 경로를 새로 만들면 cron과 동작이 갈리므로 금지. `card-eligibility` 평가기를 단일 소스로 쓴 것과 동일한 원칙.

## 강제 범위 (결정됨)

`card-eligibility`의 status별 처리:
- **강제 발급(게이트 우회)**: `waitingSchedule`(시간 미도래), `waitingParticipation`(참여<50%), `needsMembers`(멤버 부족)
- **항상 차단**: `noTemplate`(발급할 다음 템플릿 없음 → 물리적 불가), `error`, `inactive`(비활성 공간), `scheduledRemoval`(삭제 예정 공간)

알림: **정상 발급과 동일하게 멤버에게 푸시 전송**(실제 카드이므로).

## 아키텍처 / 데이터 흐름

```
[SpaceCardEligibilityPanel] status ∈ {waitingSchedule, waitingParticipation, needsMembers}
   → "강제 발급" 버튼 → AlertDialog 확인
   → POST /admin/space/:id/force-card
   → SpaceController → CardCreateCron.forceCreateCard(spaceId)
       1) 공간 로드(spaceInfo{locale,type,noticeTime}, cardOrder, cardGenDate, isActive, dueRemovedAt)
       2) 하드 차단: 없음→404, isActive=false→400, dueRemovedAt 있음→400
       3) generateNewCard(space)  // 게이트 우회, 실제 생성 트랜잭션 + 푸시
       4) 템플릿 없음 → NotFoundCardTemplateException
   → 성공 시 ['space-detail', id] + 카드자격 진단 쿼리 invalidate
```

## 백엔드 (mindqna-server)

### `CardCreateCron.forceCreateCard(spaceId: string)` (신규 public)
- 위치: `src/card/cron/card-create.cron.ts` (기존 private `generateNewCard`/`createCardAndUpdateSpace`/`getCardTemplate` 재사용).
- 절차:
  1. `databaseManager.read`로 공간 로드(필요 필드 + spaceInfo). 없으면 `NotFoundException()`.
  2. `if (!space.isActive) throw BadRequestException('inactive space')`.
  3. `if (space.dueRemovedAt) throw BadRequestException('scheduled removal')`.
  4. `const result = await this.generateNewCard(space);` — 게이트(`shouldGenerateCard`/`isEligibleForCardCreation`) 미호출이 곧 강제.
  5. `if (!result) throw NotFoundCardTemplateException();` — 다음 템플릿 없음.
  6. 생성된 카드 요약 반환(`{ cardId, order }`).
- 예외: `NotFoundException`/`NotFoundCardTemplateException`은 커스텀(`src/common/exception/error`), `BadRequestException`은 `@nestjs/common`.
- 게이트 우회 검증: 이 경로는 `hasValidTiming`/`hasEnoughParticipation`/`isMemberEligible`을 호출하지 않는다.

### 모듈/컨트롤러 배선
- `CardModule`이 `CardCreateCron`을 `exports`에 추가.
- 어드민 `SpaceModule`이 `CardModule`을 `imports`에 추가.
- `admin/space/space.controller.ts`: `CardCreateCron` 주입 + 라우트
  ```ts
  @TypedRoute.Post(':id/force-card')
  async forceCreateCard(@TypedParam('id') id: string) {
    return (await this.cardCreateCron.forceCreateCard(id)) as any;
  }
  ```
  (AdminGuard 클래스 레벨 유지)

## 프런트 (mindqna-admin)

- `src/client/space.ts`: `forceCreateCard(spaceId)` — `client.post('/space/${id}/force-card')`.
- `SpaceCardEligibilityPanel`:
  - `detail`/진단 결과의 `status`가 `waitingSchedule`/`waitingParticipation`/`needsMembers`일 때만 "강제 발급" 버튼 노출(그 외 status엔 비노출).
  - 클릭 → `AlertDialog` 확인("타이밍/참여/멤버 조건을 무시하고 즉시 카드를 발급하며, 멤버에게 새 카드 알림이 전송됩니다.").
  - `useMutation` + 성공 시 `queryClient.invalidateQueries`로 `['space-detail', spaceId]` 및 카드자격 진단 쿼리 키 무효화, `toast.success`. 실패 시 `toast.error`(404/400/템플릿없음 메시지).
  - 버튼은 mutation pending 중 비활성(연타 방지).

## 에러 / 엣지

- 없는 공간 → 404.
- 비활성/삭제예정 공간 → 400(버튼 비노출이지만 서버 방어).
- 다음 템플릿 없음 → `NotFoundCardTemplateException`(프런트 toast).
- 멱등성: 카드 발급은 `cardOrder` 전진이라 연타 시 다음 템플릿이 추가 발급될 수 있음 → 확인 다이얼로그 + pending 비활성으로 가드(서버단 분산 락은 범위 밖, cron의 기존 중복 템플릿 회피 로직이 동일 템플릿 재발급은 막음).

## 테스트

- 백엔드 `card-create.cron.spec.ts`(또는 신규 describe): `forceCreateCard`
  - 정상: 게이트 평가 함수 미호출 + `generateNewCard` 호출되어 카드 반환(generateNewCard를 spy/mock).
  - `isActive=false` → BadRequest, `generateNewCard` 미호출.
  - `dueRemovedAt` 있음 → BadRequest.
  - 공간 없음 → NotFound.
  - 템플릿 없음(generateNewCard가 null) → NotFoundCardTemplateException.
- 프런트: `pnpm build` 통과, 버튼 노출 조건·확인 다이얼로그 수동 확인.

## 알려진 한계 / 경계

- 대기 3종만 강제. inactive/scheduledRemoval은 먼저 공간 정보 수정(SpaceEditModal)으로 해제 후 발급해야 함.
- 서버단 강한 멱등성(락) 미포함 — 확인 다이얼로그 + pending 비활성으로 충분하다고 판단.
- 알림 silent 옵션 없음(정상과 동일 전송).

## 배포 / 운영 주의

- 스키마/환경변수 변경 없음.
- 푸시는 SSH로 직접.
