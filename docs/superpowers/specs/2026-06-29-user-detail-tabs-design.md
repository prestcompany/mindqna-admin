# 유저 상세 탭 뷰 — 설계 (사이클 1)

> `user/list`의 상세를 `space/list` 상세처럼 **탭 기반 연관데이터 드릴다운**으로 고도화한다.
> 우선순위는 **인앱 결제 내역 조회**와 **구독/권한 현황 표시**. 스토어 실시간 연동(자동갱신·취소·환불)은 **사이클 2 별도 스펙**으로 분리한다.

- 대상 레포: `mindqna-server`(백엔드), `mindqna-admin`(어드민 프런트)
- 레퍼런스: space 상세(`SpaceDetailSheet` + `src/components/page/space/components/tabs/*` + `admin/space` 백엔드)
- 제약: 스키마 변경 없음(`prisma generate`만). 푸시는 사용자가 수동. 이모지 금지. 디자인은 space와 동일 컨벤션.

## 배경 / 목적

현재 유저 상세(`UserDetailSheet`)는 **단일 개요** 한 장(StatTile + DetailField)뿐이다. space 상세처럼 탭으로
연관 데이터를 펼쳐, 운영자가 한 유저의 참여 공간·결제·구독권한·접속·푸시를 한 곳에서 파악하게 한다.

## 아키텍처 / 데이터 흐름

```
UserDetailSheet (탭형으로 전환)
  ├─ 개요   : 기존 getUser 데이터 재사용(IdentityStrip + StatTile)
  ├─ 참여공간: GET /admin/user/:username/profiles
  ├─ 결제내역: GET /admin/user/:username/purchases?page
  ├─ 구독/권한: GET /admin/user/:username/entitlements
  ├─ 접속기록: GET /admin/user/:username/access?page
  └─ 푸시이력: GET /admin/user/:username/pushes?page
```

- 각 탭은 활성화 시 lazy `useQuery`(space 탭과 동일: `enabled: active && !!username`).
- 탭 키는 기존 상세와 동일하게 `:username`. 서비스는 `where: { user: { username } }` 관계 필터로 조회(별도 userId 조회 불필요).
- 페이지네이션 응답은 space 탭과 동일: `{ items, totalCount, pageInfo: { totalPage } }`, offset 10.

## 탭별 명세

### 1) 개요 (엔드포인트 없음)
- 기존 `getUser(username)` 데이터 사용.
- 가벼운 IdentityStrip: username, role, locale, provider/email(socialAccount), 가입일, 활성 프로필 수, 탈퇴예약(reserveUnregisterAt) 상태.
- StatTile 몇 개: 참여 공간 수, 활성 권한 수(premiumTickets isActive + goldClub isActive), 결제 건수, 최근 접속.
- 깊은 통계/차트는 범위 밖(이후 B 사이클).

### 2) 참여 공간 — `GET :username/profiles`
- 소스: `Profile[]`(해당 유저). 비활성/삭제 포함하되 플래그 표시.
- 반환 각 항목: `{ id, nickname, spaceId, spaceName, isPremium, isGoldClub, disabled, removed, createdAt }`
  - spaceName은 `space: { select: { spaceInfo: { select: { name: true } } } }`에서.
- 정렬: createdAt desc. 페이지네이션 없음(유저당 소량). 빈 상태 처리.

### 3) 결제 내역 — `GET :username/purchases?page` ★
- 소스: `PurchaseHistoryMeta[]`.
- 반환 각 항목: `{ id, productId, platform, price, isSubscribe, createdAt }`
- 정렬: createdAt desc. 페이지네이션 있음.

### 4) 구독/권한 — `GET :username/entitlements` ★
- 소스 통합:
  - `premiumTickets`: `{ id, productId, platform, isActive, dueAt, profileId, createdAt }`
  - `goldClubs`(GoldClub): `{ id, productId, platform, isActive, dueAt, profileId, createdAt }`
  - `subscriptions`(Subscription): `{ id, productId, platform, transactionId, createdAt }`
- 반환: `{ premiumTickets: [...], goldClubs: [...], subscriptions: [...] }`(각각 createdAt desc, 한정 수량이라 페이지네이션 없음).
- UI: "현재 활성 권한"을 상단에 강조(isActive && (dueAt == null || dueAt > now)), 만료/비활성은 흐리게.
- 한계 명시: `Subscription`은 상태 필드가 없어 *레코드 표시*만. 실시간 갱신/취소 상태는 사이클 2.

### 5) 접속 기록 — `GET :username/access?page`
- 소스: `UserAccessMeta[]`.
- 반환 각 항목: `{ id, spaceId, spaceName, heart, createdAt }`
- 정렬: createdAt desc. 페이지네이션 있음.

### 6) 푸시 이력 — `GET :username/pushes?page`
- 소스: `PushMeta[]`.
- 반환 각 항목: `{ id, title, desc, isChecked, spaceId, createdAt }`
- 정렬: createdAt desc. 페이지네이션 있음.

## 백엔드 (mindqna-server)

- `admin/user/user.interface.ts`: `UserTabQuery { page?: number }`(space의 SpaceTabQuery와 동형).
- `admin/user/user.service.ts`: 탭 메서드 추가
  - `getUserProfiles(username)`, `getUserPurchases(username, query)`, `getUserEntitlements(username)`, `getUserAccess(username, query)`, `getUserPushes(username, query)`.
  - 존재하지 않는 유저면 `NotFoundException()`(각 메서드 시작 시 `user.findUnique({ where: { username }, select: { id: true } })`로 확인하거나, 관계 필터 + 결과 0과 구분 위해 명시 체크).
  - 페이지네이션 메서드는 `$transaction([findMany, count])` + offset 10, `{ items, totalCount, pageInfo: { totalPage } }`.
- `admin/user/user.controller.ts`: GET 라우트 추가(@TypedRoute.Get(':username/...'), @TypedParam, @TypedQuery). 기존 `:username` 라우트와 충돌 없음(정적 세그먼트 뒤따름). 단, 라우트 등록 순서상 `/search`, `/email/:email`이 `:username`보다 먼저 와야 하며 신규 `:username/xxx`는 그 뒤.
- `admin/user/user.service.spec.ts`: 각 탭 메서드 테스트(AAA, prisma mock 팩토리 확장).

## 프런트 (mindqna-admin)

- `src/client/types.ts`: `UserProfileRow`, `UserPurchaseRow`, `UserEntitlements`(+ Ticket/GoldClub/Subscription row), `UserAccessRow`, `UserPushRow` 및 페이지 결과 타입.
- `src/client/user.ts`: `getUserProfiles/getUserPurchases/getUserEntitlements/getUserAccess/getUserPushes` fetcher.
- `src/components/page/user/components/UserDetailSheet.tsx`: Tabs 컨테이너로 전환(개요는 기존 `UserDetailContent` 재사용). 탭 상태, 유저 바뀌면 overview로 초기화(space와 동일).
- 신규 탭 컴포넌트 `src/components/page/user/components/tabs/`:
  - `UserProfilesTab`, `UserPurchasesTab`, `UserEntitlementsTab`, `UserAccessTab`, `UserPushesTab`.
  - 각 탭: lazy useQuery, 로딩 스피너, 빈 상태, (해당 시) 페이지네이션 — space 탭 컴포넌트의 구조/스타일 그대로.

## 디자인 컨벤션 (space와 동일)

- slate 표면, `rounded-xl`, `shadow-sm`, `tabular-nums`, soft 배지 variant, 텍스트 명도 `text-slate-500` 최소, slate-400 텍스트 금지, 이모지 금지.
- 탭 리스트는 `SpaceDetailSheet`의 `TabsList`/`TabsTrigger` 구조, 좁은 폭 가로 스크롤 동일.
- 금액/카운트는 `tabular-nums`. 플랫폼/구독여부/활성은 soft 배지.

## 에러 / 빈 / 로딩

- 탭 진입 시 로딩 스피너(space 탭과 동일).
- 빈 데이터: "내역이 없습니다" 류 빈 상태.
- 없는 유저: 404 → 시트가 에러 메시지(기존 `UserDetailSheet` 에러 처리 재사용).

## 테스트

- 백엔드: `user.service.spec.ts`에 탭 메서드별 테스트
  - 페이지네이션 메서드: items 매핑/정렬/`totalCount`/`totalPage`, 없는 유저 404.
  - entitlements: 세 소스 통합 반환 형태.
  - profiles: spaceName 매핑.
- 프런트: `pnpm build` 통과, 탭 전환 수동 확인.

## 알려진 한계 (사이클 1 범위 밖)

- **구독 실시간 상태**: `Subscription`에 상태 필드 없음 → 레코드 표시만. 자동갱신/취소/환불/유예는 **사이클 2(스토어 API 연동)**.
- **참여 공간 → 공간 상세 이동**: 유저 시트에서 space 상세 시트로의 직접 연결은 cross-sheet 배선이라 후속 사이클로 미룬다(이번엔 공간명 표시까지).
- **푸시 탭 공간명**: `PushMeta`에는 `Space` 관계가 없고 `spaceId`(String?)만 있어 공간명 조인 불가 → spaceId 기준 표시(푸시 탭은 제목/내용/확인여부 위주).
- **유저 정보 수정(C)·운영 액션(D)**: 본 스펙 미포함.
- **개요 깊은 통계/차트(B)**: 가벼운 IdentityStrip+StatTile까지만.

## 배포 / 운영 주의

- 스키마 변경 없음 → `prisma generate`만.
- 푸시는 사용자가 수동(자격증명은 SSH로 정렬됨).
