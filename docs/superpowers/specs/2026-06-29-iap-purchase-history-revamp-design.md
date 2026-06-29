# 인앱 결제 내역 개편 — 설계 (A+B+C)

> 기존 `인앱 결제 내역`(`PurchaseMetaList`, `PurchaseMeta` 검증 로그)을 디자인 시스템에 정합시키고, 추측 로직을 실제 데이터로 교정하고, 운영 필터를 추가한다.
> 금액(가격) 표시·닉네임 검색은 본 스펙 제외(별도).

- 대상 레포: `mindqna-server`(백엔드), `mindqna-admin`(어드민 프런트)
- 제약: 스키마 변경 없음(`prisma generate` 불필요 — 신규 컬럼 없음). 푸시는 SSH로 직접. 이모지 금지. 디자인은 space/user와 동일 컨벤션.

## 배경 / 현황

`인앱 결제 내역`(`/product/purchase`)은 `PurchaseMeta`(결제 검증 로그: isSuccess/isExpired/log/receipt/completedAt/transactionId/isProduction)를 보여준다. user 상세의 "결제 내역" 탭(`PurchaseHistoryMeta` — 가격 포함)과는 다른 테이블로, **결제 성공/실패 디버깅·영수증 추적** 용도다.

문제점:
- **디자인 불일치**: 옛 팔레트(gray/blue/green/red), 배지 destructive/info/success/muted — space/user와 톤이 다름.
- **추측 로직**: "만료 시간"을 `createdAt + 30일`로 **추정**(모델에 실제 만료 timestamp 없음). 실제 `completedAt`은 API가 반환하지만 미사용.
- **타입 버그**: 프런트 `PurchaseMeta.platform: 'EVENT' | 'IOS' | 'EVENT'`(EVENT 중복, AOS 누락) → 실제 AOS가 fallback 배지로 빠짐.
- **필터 부족**: userId(완전일치)+날짜만. 상태/플랫폼/환경 필터 없음. "실패만 보기" 없음.

확인된 사실:
- 백엔드 `getPurchaseMetas`(admin.controller `/purchase` → product.service)는 `select` 없이 전체 행 반환 → `completedAt`/`receipt` **이미 내려옴**.
- 검색 파라미터 `username`은 실제 `userId` 완전일치 필터(라벨 "유저 ID").
- 백엔드가 transactionId별 dedup 수행: 성공/만료가 있으면 그 transaction의 실패행을 숨기고, 끝까지 실패한 건만 실패로 표시.
- `2024-06-01` 하드코딩은 프런트에만 존재(레거시 보정).

## A. 디자인 정합

`PurchaseMetaList`의 컬럼 셀과 검색바를 재작성:
- 텍스트: 본문 `text-slate-900`, 보조 `text-slate-500`(slate-400 텍스트 금지), `tabular-nums`(번호/날짜).
- 배지(soft 계열): 플랫폼 `softNeutral`(EVENT는 구분 위해 동일 계열 + 라벨), 상태 성공=`softSuccess`/실패=`softDanger`/만료=`softNeutral`, 환경 PROD=`softNeutral`·TEST=`softWarning`.
- 날짜 강조(파랑/초록/빨강) 제거, "최근 7일"은 slate 톤 보조 표기로.
- 이모지 없음, 기존 `DataTable`·검색폼 구조 유지.

## B. 정확성

### 프런트 타입 — `src/client/types.ts`
```ts
export type PurchaseMeta = {
  id: number;
  userId: string;
  username: string;
  platform: 'EVENT' | 'IOS' | 'AOS';
  transactionId: string;
  productId: string;
  log?: string;
  receipt?: string | null;
  isSuccess: boolean;
  isExpired: boolean;
  isProduction: boolean;
  completedAt: string | null;
  createdAt: string;
};
```

### 컬럼/상태 규칙 — `PurchaseMetaList.tsx`
- "만료 시간"(createdAt+30일 추정) 컬럼 제거 → **"완료 시간"(`completedAt` 실제값, 없으면 "—")** 컬럼.
- 상태 판정 상수화:
  ```ts
  const LEGACY_SUCCESS_BEFORE = '2024-06-01'; // 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정)
  // 규칙: isExpired → '만료' / (isSuccess || createdAt < LEGACY_SUCCESS_BEFORE) → '성공' / else → '실패'
  ```
- 상세 다이얼로그에 `receipt` 원문 보기 추가(현재 log만). receipt 없으면 버튼 비노출.

## C. 필터

### 백엔드 — `GetPurchaseMetasParams` + `getPurchaseMetas`
- 쿼리 파라미터 확장: `platform?: 'IOS' | 'AOS' | 'EVENT'`, `status?: 'success' | 'failed' | 'expired'`, `isProduction?: boolean`. 기존 `page/username(userId)/startDate/endDate` 유지.
- where 합성(기존 transactionId dedup 로직과 결합):
  - `platform` → `platform: { equals }`.
  - `isProduction` → `isProduction: { equals }`.
  - `status`:
    - `success` → `isSuccess: true`
    - `expired` → `isExpired: true`
    - `failed` → 끝까지 실패한 건: `isSuccess: false, isExpired: false, transactionId notIn (성공/만료된 transactionId 집합)` — 기존 dedup의 AND 분기와 동일.
  - `status` 미지정 시 기존 mergedWhere(dedup) 그대로.
- `admin.controller.ts`의 `/purchase` `@TypedQuery` 타입에 신규 파라미터 추가.

### 프런트 — `client/premium.ts` + `usePurchase` + `PurchaseMetaList`
- `getPurchases(by)`에 `platform?/status?/isProduction?` 추가.
- `usePurchase` 훅 파라미터 확장.
- UI: 플랫폼·상태·환경 `Select` 필터 + "실패만 보기" 빠른 버튼(상태=failed로 설정). 기존 userId·날짜 검색 유지.

## 에러 / 빈 / 로딩

- 기존 `DataTable` loading/빈 처리 유지.
- 필터 조합 결과 0건 → 빈 테이블(기존 동작).

## 테스트

- 백엔드 `product.service.spec.ts`(getPurchaseMetas): `status=success/failed/expired`·`platform`·`isProduction` 각각 where에 반영되는지(prisma.purchaseMeta.findMany 호출 인자 검증). 기존 dedup 동작 회귀.
- 프런트: `pnpm build` 통과, 필터 동작 수동 확인.

## 알려진 한계 / 경계

- **금액(가격) 표시 없음**: `PurchaseMeta`에 가격 필드 없음 → IAPProduct 가격 조인은 별도(D).
- **닉네임 검색 없음**: 기존대로 userId 완전일치 유지.
- **KPI 대시보드 없음**: 별도(D).
- 레거시 상태 보정은 명시적 상수로 유지(동작 보존).

## 배포 / 운영 주의

- 스키마 변경 없음. 신규 컬럼/마이그레이션 없음.
- 푸시는 SSH로 직접.
