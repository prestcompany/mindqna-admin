# 유저 실시간 구독 상태 조회 — 설계 (사이클 2a)

> 어드민 유저 상세 "구독/권한" 탭에서, 관리자가 필요할 때 **버튼 한 번으로 해당 유저의 구독을 두 스토어(Apple/Google) 기준 실시간 조회**한다.
> 주목적은 **현재 상태 조회**이며, revoke/취소/환불 등 제어는 본 스펙에 포함하지 않는다(2b 수동 권한 제어·2c Google 스토어 제어는 별도/보류).

- 대상 레포: `mindqna-server`(백엔드), `mindqna-admin`(어드민 프런트)
- 제약: 스키마 변경 없음(`prisma generate`만). 새 스토어 자격증명 불필요(기존 `iosClient`+`IAPService` 재사용). 푸시는 SSH로 직접. 이모지 금지. 디자인은 space/user 탭과 동일.

## 배경 / 동기

사이클 1의 구독/권한 탭은 DB 레코드만 표시하며 "스토어 실시간 상태는 추후 연동" 안내를 달아 두었다.
스토어 연동의 핵심(iOS `iosClient.getSubscriptionStatuses`, AOS `IAPService.verifyGoogleReceipt`)은 이미
`PremiumService.getSubscriptions`와 `premium-ticket.cron`에 구현돼 있다. 빠진 것은 **어드민이 임의 시점에
한 유저의 실시간 상태를 확인하는 경로**다.

### Rate limit 고려 (설계의 핵심 제약)

- **Bulk API 없음**: Apple `getSubscriptionStatuses`는 transactionId 단건별, Google `subscriptionsv2.get`은 purchaseToken 단건별. 다중 유저 일괄 조회 API가 없다.
- 따라서 **목록(user/list)에서는 스토어를 절대 호출하지 않는다.**
- 상세 진입만으로도 자동 호출하지 않는다. **관리자가 "스토어 실시간 확인" 버튼을 누른 순간에만** 해당 유저 1명의 구독들을 호출한다(구독 수만큼).
- 평상시 상태는 **5분 주기 크론이 DB(`PremiumTicket.dueAt/isActive`)에 동기화**한 값을 그대로 보여준다(API 0회).

## 아키텍처 / 데이터 흐름

```
[구독/권한 탭]
  기본: 사이클 1의 DB 엔타이틀먼트(프리미엄/골드/구독이력) — API 0회
  버튼 "스토어 실시간 확인" 클릭
    → GET /admin/user/:username/subscription-status   (수동 트리거, 자동 아님)
    → PremiumService.getLiveSubscriptionStatus(username)
        → Subscription[] 로드 (where: { user: { username } })
        → 각 레코드:
            IOS  → iosClient.getSubscriptionStatuses(transactionId) + decodeTransaction
            AOS  → iap.verifyGoogleReceipt({ packageName, subscriptionId, token })
        → 정규화 + 레코드별 에러 격리
    → 탭의 "스토어 실시간 상태" 섹션에 렌더
```

## 백엔드 (mindqna-server)

### 정규화 타입
```ts
export type LiveSubscriptionStatus =
  | 'active'        // iOS status 1 / AOS 미만료
  | 'grace'         // iOS status 4 (billing grace)
  | 'billingRetry'  // iOS status 3
  | 'expired'       // iOS status 2 / AOS expiryTime 경과
  | 'revoked'       // iOS status 5
  | 'canceled'      // AOS cancelReason 존재(자동갱신 해지) 또는 autoRenew=false + 미래만료
  | 'error';        // 조회 실패(스토어 오류/레코드 불일치)

export interface LiveSubscriptionRow {
  id: number;            // Subscription.id
  platform: 'IOS' | 'AOS';
  productId: string;
  status: LiveSubscriptionStatus;
  expiresAt: string | null;  // ISO
  autoRenew: boolean | null;
  environment?: 'production' | 'sandbox';
}
```

### 메서드 — `PremiumService.getLiveSubscriptionStatus(username: string)`
- `subscription.findMany({ where: { user: { username } } })`로 구독 로드.
- 각 구독을 순차 처리(레코드별 try/catch로 격리, 실패 시 `status:'error'`):
  - **IOS**: `iosClient.getSubscriptionStatuses(transactionId)` → 해당 originalTransactionId의 `lastTransactions` 항목에서 `status` 코드와 `signedTransactionInfo`(→ `decodeTransaction`으로 productId/expiresDate), 갱신정보에서 autoRenew. 상태코드 매핑(1→active,2→expired,3→billingRetry,4→grace,5→revoked).
  - **AOS**: `iap.verifyGoogleReceipt({ packageName: config.PACKAGE_NAME, subscriptionId: productId, token: transactionId })` → `expiryTimeMillis`(만료일), `autoRenewing`(autoRenew), `cancelReason`(있으면 canceled), 만료 경과 시 expired.
- 반환: `LiveSubscriptionRow[]`.
- 위치: `PremiumService`(이미 `iap`/`config`/`iosClient` 의존 보유). `PremiumModule`이 `PremiumService`를 export, admin user 모듈이 `PremiumModule`을 import(또는 admin 전용 얇은 서비스로 위임). 정확한 배선은 계획 단계에서 모듈 구조 확인 후 확정.

### 컨트롤러 — `admin/user/user.controller.ts`
```ts
@TypedRoute.Get(':username/subscription-status')
async getUserSubscriptionStatus(@TypedParam('username') username: string) {
  return (await this.<service>.getLiveSubscriptionStatus(username)) as any;
}
```
(AdminGuard 클래스 레벨 적용 유지)

## 프런트 (mindqna-admin)

- `src/client/types.ts`: `LiveSubscriptionStatus`, `LiveSubscriptionRow` 타입.
- `src/client/user.ts`: `getUserSubscriptionStatus(username)` fetcher.
- `src/components/page/user/components/tabs/UserEntitlementsTab.tsx` 수정:
  - 상단 "스토어 실시간 상태" 섹션 추가.
  - **버튼 "스토어 실시간 확인"** — 클릭 전에는 호출하지 않음. `useQuery({ enabled: false })` + `refetch()` 또는 `useMutation`으로 클릭 시에만 호출.
  - 클릭 후: 구독별 카드(플랫폼 배지 + 상태 배지 + 만료일 + 자동갱신 on/off). 상태 배지 색: active=softSuccess, grace/billingRetry=softWarning, expired/revoked/canceled=softNeutral, error=softDanger.
  - 로딩 중 버튼 스피너/비활성. 결과 0건이면 "활성 구독 레코드가 없습니다."
  - 사이클 1의 "DB 보유 정보…" caveat를 **"평상시 상태는 5분 주기 동기화 값입니다. 최신 스토어 상태는 위 버튼으로 확인하세요."** 로 교체.
  - 기존 DB 엔타이틀먼트 섹션(프리미엄/골드/구독이력)은 그대로 아래 유지.

## 에러 / 빈 / 로딩

- 레코드별 조회 실패 → 그 행만 `status:'error'`("조회 실패" 배지), 나머지 정상 렌더.
- 구독 레코드 0건 → 빈 상태 안내, 버튼 비활성 또는 "구독 없음".
- 버튼 클릭 → 로딩 → 성공/실패 toast.

## 테스트

- 백엔드 `getLiveSubscriptionStatus`:
  - IOS active(상태1)·expired(상태2)·revoked(상태5) 매핑, AOS 미만료 active·만료 expired·cancelReason canceled.
  - 한 레코드 스토어 오류 → 해당 행 `error`, 다른 행은 정상(격리).
  - iosClient/IAPService는 mock. (기존 premium.service.spec 패턴 따름)
- 프런트: `pnpm build` 통과. 버튼 트리거 동작(자동 호출 없음) 수동 확인.

## 알려진 한계 / 경계

- **제어 미포함**: revoke/취소/환불/수동 권한 조정 없음(조회 전용). 2b/2c 별도.
- **단건·수동**: 목록 일괄/자동 조회 없음(rate limit 회피). 관리자가 버튼으로만.
- **레이턴시**: 구독 수만큼 순차 스토어 호출이라 버튼 응답은 수 초 걸릴 수 있음(어드민 on-demand라 허용). 필요 시 병렬화는 추후 최적화.
- **Apple 강제취소 불가**(정책)·**Google 제어**는 2c에서 권한 확인 후.

## 배포 / 운영 주의

- 스키마 변경 없음 → `prisma generate`만.
- 새 환경변수/자격증명 불필요(기존 iOS `.p8`·Google 서비스계정 그대로).
- 푸시는 SSH로 직접.
