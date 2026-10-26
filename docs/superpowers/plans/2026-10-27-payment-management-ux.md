# 인앱 결제 관리 통합 탐색 구현 계획

**Goal:** 결제 내역과 이용권 현황을 같은 탐색·표시 규칙으로 운영할 수 있게 한다.

**Architecture:** 서버 두 조회 API의 공통 검색/필터 계약을 보강한다. 어드민의 탭 상위 컴포넌트가 공통 필터 초안과 적용값을 소유하고, 두 목록이 적용값을 받아 조회한다. ID 셀과 뱃지를 공유한다.

**Tech Stack:** NestJS/Prisma, Next.js pages router, React, TanStack Query, shadcn/ui.

## 작업

1. 서버 테스트: 구매 목록 통합 검색·유형, 이용권 목록 내부 ID·기간 조건을 실패 테스트로 추가한다. 기존 유저 검색/상태 필터 회귀를 함께 확인한다.
2. 서버 구현: `src/admin/product/types/product.types.ts`, `src/admin/admin.controller.ts`, `src/admin/product/product.service.ts`에서 조회 조건과 `isSubscribe` 응답을 확장한다. 결제 유형은 `src/premium/premium.unit.ts`의 판정 함수를 재사용한다.
3. 어드민 계약: `src/client/premium.ts`, `src/client/types.ts`, `src/hooks/usePurchase.ts`에 신규 필드를 반영한다.
4. 공통 UI: `src/components/page/premium/PurchaseManagement.tsx`에 통합 필터 바·조건 칩·상태 선택·기간 선택·초기화를 둔다. 두 탭에 동일한 검색 동작과 필터 적용값을 전달한다.
5. 목록 UI: `PurchaseMetaList.tsx`, `ProductList.tsx`의 자체 필터를 제거하고 열 순서·뱃지·ID 복사·날짜 형식을 맞춘다. 공통 셀은 새 `PurchaseTableCells.tsx`에 둔다.
6. 검증: 서버 대상 Jest 및 빌드, 어드민 `npx tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, 데스크톱·좁은 화면 수동 확인. 이상이 있으면 원인 수정 후 필요한 검사만 재실행한다.

## 배포 순서

서버가 새 파라미터를 수용하고 `isSubscribe`를 반환한 뒤 어드민을 배포한다. 서버 미배포 상태의 새 어드민은 검색/유형/기간의 일부가 적용되지 않는다. DB 스키마 변경은 없다.
