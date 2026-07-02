# 인앱 결제 관리 통합 재설계 (설계)

- 날짜: 2026-07-02
- 상태: 설계 확정 (구현 계획: `docs/superpowers/plans/2026-07-02-iap-management-redesign.md`)
- 관련 레포: `mindqna-admin`(프론트), `mindqna-server`(백엔드 — 변경 포함)

## 1. 배경 / 문제

상품 관리 하위 메뉴의 결제 관련 화면이 파편화되어 있고 상세 확인 동선이 없다.

| 현재 화면 | 데이터 원천 | 문제 |
| --- | --- | --- |
| 인앱 결제 내역 (`/product/purchase`, `PurchaseMetaList`) | `PurchaseMeta` (트랜잭션 이벤트) | 상세가 로그/영수증 원문 `<pre>` 다이얼로그뿐. 상품명/가격 없음. 유저 상세로 연결 없음 |
| 인앱 상품 관리 (`/product/iap-product`, `ProductList`) | `PremiumTicket` (이용권/소유 레코드) | 이름과 실제 내용 불일치("상품 관리"가 아니라 이용권 목록). 검색 1개 외 필터 없음, 상세 없음, 레거시 Badge variant 사용 |
| 유저 상세 패널 결제/구독 탭 | `PurchaseHistoryMeta`, `PremiumTicket`/`GoldClub`/`Subscription` + 스토어 실시간 조회 | 실시간 스토어 확인(`LiveStatusBlock`)이 유저 패널에만 존재. 상품 관리 화면들과 단절 |

핵심 문제: **같은 결제 도메인 데이터가 3곳에 흩어져 있고 상호 연결이 없다.**

## 2. 목표

1. 결제 내역·이용권 현황을 **하나의 "인앱 결제 관리" 화면**으로 통합 (탭 2개)
2. 결제 건 클릭 시 **구조화된 상세 패널**(우측 Sheet) 제공:
   결제 요약 / 영수증·로그 뷰어 / 유저 이용권·구독 상태(스토어 실시간 확인 포함) / 유저 결제 이력 / 운영 액션(티켓 지급·회수)
3. 유저 상세 패널과 상품 관리 화면이 **동일한 공용 컴포넌트**를 사용하도록 추출
4. 서버에 결제 건 단건 상세 API 추가로 상세 패널 데이터를 1회 호출로 완결

비목표(Non-goals):
- 스토어 상품 카탈로그(가격표) 관리 기능 신설
- 환불 처리 등 스토어 측 조작 기능
- 코인 지급(spaceId 기반이라 이 화면 컨텍스트와 불일치 — 공간 관리에 유지)
- 쿠폰 관리 변경

## 3. 데이터 모델 사실관계 (서버 확인 완료)

- `PurchaseMeta`: id, userId(plain string, FK 없음), platform, productId, transactionId, isSuccess, isExpired, completedAt, log?, receipt?, isProduction. **가격 없음**
- `PurchaseHistoryMeta`: userId, productId, platform, price(String), isSubscribe. **transactionId 없음** → PurchaseMeta와 정확한 조인 불가
- `PremiumTicket`: ownerId, profileId?, platform, productId, transactionId(**LongText — 인덱스 불가**), dueAt?, isActive, isProduction
- `GoldClub`, `Subscription`: 유저 entitlements 구성 요소
- 기존 유저 탭 API(username 기반, 재사용): `/user/:username/purchases`, `/user/:username/entitlements`, `/user/:username/subscription-status`
- `GET /purchase` 목록 응답은 userId→username 매핑 포함 (유저 삭제 시 `''`)
- `GET /purchase`의 `username` 쿼리 파라미터는 실제로 `userId` equals 매칭 (UI 라벨 "유저 ID"와 일치)

### 데이터 제약에 따른 설계 결정

- **가격 표시는 상세 패널에서만, best-effort 매칭**: PurchaseHistoryMeta에 transactionId가 없으므로 (userId, productId, createdAt 근접) 휴리스틱으로 단건 매칭. 목록 컬럼에는 추가하지 않는다(N건 휴리스틱 조인은 왜곡 위험).
- **이용권 매칭은 in-memory**: PremiumTicket.transactionId가 LongText라 where 조건 풀스캔 위험 → 단건 상세에서 해당 유저의 티켓들(ownerId 인덱스)을 가져와 서버 메모리에서 transactionId 비교.

## 4. 정보구조(IA) 변경

- 상품 관리 하위 메뉴: `인앱 결제 관리`(통합) + `쿠폰 관리` 2개로 축소
- `/product/purchase` → 통합 화면 (탭: 결제 내역 | 이용권 현황)
- `/product/iap-product` → `/product/purchase?tab=products` 클라이언트 리다이렉트 후 메뉴에서 제거
- 탭 상태는 쿼리 파라미터(`?tab=`)로 유지해 새로고침/공유 가능

## 5. 화면 설계

### 5.1 결제 내역 탭 (기존 `PurchaseMetaList` 강화)

- 기존 필터(유저 ID/상태/플랫폼/환경/날짜, 실패만 보기) 유지
- 행 클릭 → 결제 상세 패널 열림 (기존 로그/영수증 다이얼로그 제거, 상세 패널로 흡수)
- 컬럼 정리: 플랫폼 / 유저 / 상품 ID / 상태 / 환경 / 구매·완료 시간 (+행 hover 시 클릭 가능 시각 피드백)
- 유저 삭제로 username이 빈 경우: userId 표기 + 유저 연결 기능 비활성

### 5.2 이용권 현황 탭 (기존 `ProductList` 개선)

- 필터 추가: 활성/만료, 구독/소모품, 플랫폼, PROD/TEST (서버 `GET /products` 파라미터 확장)
- Badge를 `soft*` variant로 통일 (DESIGN.md 기준)
- 행 클릭 → 동일한 결제 상세 패널을 "이용권 컨텍스트"로 열기

상세 패널은 두 가지 진입 컨텍스트를 받는다:
- **결제 컨텍스트** `{ purchaseId }`: `GET /purchase/:id`로 전체 섹션 구성
- **이용권 컨텍스트** `{ ticket }`: 섹션 1을 이용권 필드(상품 ID/만료일/활성/플랫폼)로 구성, 섹션 2(영수증·로그)는 미표시, 섹션 3~5는 동일하게 username 기반 렌더

### 5.3 결제 상세 패널 (신규 `PurchaseDetailSheet`)

`AdminSideSheetContent`(size `lg`) 재사용. 섹션 구성:

1. **결제 요약**: 상태/플랫폼/환경 Badge + 상품 ID, 결제 ID, 유저(username/userId), 구매·완료 시각, 가격(매칭 시 "이력 기준" 라벨 병기, 미매칭 시 미표시)
2. **영수증·로그**: JSON 파싱 시도 → 성공 시 key 정렬된 접기(collapsible) 뷰어, 실패 시 원문 `<pre>`. 원문 복사 버튼
3. **이용권/구독 상태**: 유저 entitlements 요약(공용 `EntitlementRow`) + `LiveStatusBlock`(스토어 실시간 확인 버튼) 재사용
4. **최근 결제 이력**: `/user/:username/purchases` 첫 페이지 + "유저 상세 열기" 버튼(유저 관리 페이지로 이동, username 쿼리 전달)
5. **운영 액션**: 티켓 지급/회수 — 기존 `TicketForm` 모달 트리거 (username 프리필)

로딩/에러: 섹션별 독립 로딩(단건 상세 API 1회 + 유저 이용권/이력은 기존 API 재사용). username이 없으면(탈퇴) 섹션 3~5 비활성 + 안내 문구.

### 5.4 유저 상세 패널 개선

- `LiveStatusBlock`, `EntitlementRow`, 결제 이력 카드를 `src/components/shared/purchase/`로 추출 — 유저 패널 탭과 상품 관리 상세 패널이 동일 컴포넌트 사용 (유저 패널 동작은 불변)
- 후속 고려(이번 범위 제외): 유저 패널 결제 카드 → 결제 상세 패널 연결. `PurchaseHistoryMeta`와 `PurchaseMeta` 간 직접 키가 없어 신뢰할 수 있는 매칭 근거 마련 후 진행

## 6. 서버 변경 (`mindqna-server`)

1. **`GET /purchase/:id` (신규)** — 단건 상세:
   - `purchaseMeta` 본문 + username
   - 연관 이용권: 해당 userId의 `PremiumTicket`/`GoldClub` 조회 후 transactionId 일치분 (in-memory 비교)
   - 가격: `PurchaseHistoryMeta`에서 (userId, productId) 일치 + createdAt 최근접(±24h 이내) 1건의 price. 매칭 실패 시 null
2. **`GET /products` 필터 확장** — `isActive?`, `platform?`, `isProduction?`, `isSubscribe?`(dueAt 유무) 파라미터 추가. 기존 search와 AND 결합
3. 기존 `product.service.spec.ts` 패턴으로 신규/변경 메서드 단위 테스트 추가

## 7. 컴포넌트/파일 계획 (프론트)

```
src/components/page/premium/
  PurchaseManagement.tsx        # 통합 화면 (탭 컨테이너, ?tab= 동기화)
  PurchaseMetaList.tsx          # 결제 내역 탭 (행 클릭 연결, 다이얼로그 제거)
  ProductList.tsx               # 이용권 현황 탭 (필터/뱃지 정비)
  PurchaseDetailSheet.tsx       # 결제 상세 패널 (신규)
src/components/shared/purchase/
  LiveStatusBlock.tsx           # 유저 패널에서 추출
  EntitlementRow.tsx            # 유저 패널에서 추출
  PurchaseHistoryRow.tsx        # 결제 이력 카드 (유저 탭 카드 추출)
  ReceiptViewer.tsx             # JSON 파싱/접기 뷰어 (신규)
src/client/premium.ts           # getPurchaseDetail 추가, getProducts 파라미터 확장
src/hooks/                      # usePurchaseDetail 등 TanStack Query 훅
```

- `src/pages/product/iap-product.tsx`: 리다이렉트 스텁으로 교체 후 추후 제거
- `main-menu.tsx`: 메뉴 항목 정리 (`인앱 결제 관리`로 통합)

## 8. 에러 처리 / 방어

- 옵셔널 필드(가격, 이용권 매칭, username)는 **값이 있을 때만 렌더** (AGENTS.md 정책)
- 실시간 스토어 조회 실패는 해당 블록 내 인라인 에러로 국지화 (기존 LiveStatusBlock 패턴 유지)
- 영수증 JSON 파싱 실패는 원문 폴백 — 파싱 에러를 사용자에게 노출하지 않음

## 9. 검증

- 프론트: `npx tsc --noEmit` + `npm run lint`
- 서버: 신규 서비스 메서드 단위 테스트(`product.service.spec.ts` 확장) + `npx tsc --noEmit`
- 수동 시나리오: 결제 건 상세 열기 → 실시간 확인 → 유저 상세 이동 / 이용권 탭 필터 / `iap-product` 리다이렉트

## 10. 단계적 배포

1. 서버: `GET /purchase/:id` + `GET /products` 필터 확장 (하위 호환 — 기존 프론트 영향 없음)
2. 프론트: 공용 컴포넌트 추출(동작 불변) → 상세 패널 → 탭 통합/메뉴 정리 순
