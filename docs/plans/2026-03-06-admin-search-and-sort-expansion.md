# Admin Search And Sort Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 사용자/공간/펫 말풍선/가구 템플릿/쿠폰의 검색, 필터, 정렬 기능을 운영 기준에 맞게 확장하고 프론트와 `/admin` 백엔드의 쿼리 계약을 일치시킨다.

**Architecture:** 기존 도메인별 admin endpoint와 `list -> client -> hook -> filter/search UI` 구조는 유지한다. 공통 검색 프레임워크는 도입하지 않고, 각 모듈의 query contract만 최소 확장한다. 넓은 범위의 작업이므로 `Phase A(user + space)`와 `Phase B(bubble + interior + coupon)`로 나눠 중간 검증 지점을 만든다.

**Tech Stack:** Next.js Pages Router, React 18, TypeScript, TanStack Query, shadcn/ui, NestJS, Prisma, Jest

---

## Requirements Summary

- 유저 조회 panel:
  - `id`, `code`, `username`, `email` 기준 조회 가능해야 한다.
  - UI 라벨은 각 필드를 명확히 구분해야 한다.
- 공간 조회 panel:
  - `spaceId`, 공간 이름, 사용자 `username`, 프로필 `nickname` 검색 가능해야 한다.
  - 정렬은 `heart`, `star`, `exp`, `roomCount`, `interiorCount`, `card`, `replies`, `members`를 지원한다.
  - 기존 `level` 정렬은 제거하고 `exp` 정렬로 대체한다.
- 펫 말풍선:
  - message 검색
  - 레벨 필터
- 가구 템플릿:
  - 검색
  - `room`, `type` 필터
- 쿠폰:
  - `name`, `code`, `username` 검색
- 전반:
  - 필터 변경 시 pagination reset
  - empty state / refetch / 기존 create-edit-delete 흐름 회귀 점검

## Scope And Assumptions

- 프론트 repo root: `/Users/gargoyle92/Documents/frontend/mindqna-admin`
- 백엔드 repo root: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 사용자는 worktree를 원하지 않았으므로 현재 워킹 디렉토리 기준으로 실행한다.
- `User` 스키마에는 `id: string`, `code: Int`, `username: string`, `socialAccount.email`이 모두 존재한다. 이번 계획은 운영 혼선을 줄이기 위해 네 가지 exact lookup을 모두 지원한다.
- 프론트 검색 UI는 한 번에 한 필드만 검색하도록 제한한다.
- `/admin/space/search`는 이번 배치에서 paginated endpoint로 갈아엎지 않는다. 대신 서버 cap(`take: 50`)과 deterministic ordering을 추가하고, 기존 `type/locale/dateRange`는 클라이언트 후처리로 유지한다.
- 공간 검색의 text match는 `contains` 기반 partial search로 구현하되, `spaceId`만 exact match로 유지한다.
- 쿠폰은 `Coupon`과 `CouponMeta` 사이에 Prisma relation이 없다. 따라서 username 검색은 schema migration 없이 `couponMeta -> couponIds -> coupon where` 2단계 조회로 구현한다.
- 프론트엔드에는 테스트 러너가 없다. 프론트 검증은 `tsc`, `lint`, 수동 시나리오로 수행한다.
- 프론트 타입체크 기대치는 `현재 baseline 유지`다. 즉, 현재 에러가 0이면 0을 유지하고, 선행 잔존 에러가 있으면 새 에러를 추가하지 않는다.

## Acceptance Criteria

- `/user/list` 검색 시트에서 `id`, `code`, `username`, `email` 각각 단일 입력으로 조회 가능
- `/space/list`에서 정렬 옵션이 UI와 서버 계약 모두 일치하고 `exp` 정렬이 실제 펫 경험치 기준으로 동작
- `/space/list` 검색 시트에서 `spaceId`, `공간명`, `username`, `nickname` 검색 가능
- `/template/bubble`에서 검색어와 level 필터가 동시에 동작
- `/template/interior`에서 검색어, room, type 필터가 동시에 동작
- `/product/coupon`에서 `name`, `code`, `username` 검색 가능
- 필터/검색 변경 시 목록 페이지는 항상 1페이지로 리셋
- 기존 생성/수정/삭제 후 목록 refetch가 유지됨

## Backend Unit Test Scaffold

### Task 0: Prisma Mock Pattern And Query Feasibility

**Files:**
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/test-utils/create-prisma-service.mock.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/product/product.service.ts`
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/test-utils/README.md`

**Step 1: 쿼리 feasibility 확인**

- `space` 정렬에서 아래 Prisma shape를 사용할 수 있는지 확인한다.
  - `{ pet: { exp: 'desc' } }`
  - `{ rooms: { _count: 'desc' } }`
  - `{ InteriorItem: { _count: 'desc' } }`
- `coupon` username 검색은 relation include가 아니라 2단계 조회만 허용된다고 문서화한다.

**Step 2: 테스트 mock helper 정의**

```ts
export function createPrismaServiceMock() {
  return {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    space: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    petBuble: { findMany: jest.fn(), count: jest.fn() },
    interiorTemplate: { findMany: jest.fn(), count: jest.fn() },
    coupon: { findMany: jest.fn(), count: jest.fn() },
    couponMeta: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
}
```

**Step 3: 테스트 규칙 명시**

- 새 spec들은 `findMany called` 수준에서 끝내지 않는다.
- 반드시 아래를 검증한다.
  - `where`
  - `orderBy`
  - `skip/take`
  - `count`
  - `pageInfo`

**Step 4: 품질 기준**

- service spec는 `Test.createTestingModule` + mocked `PrismaService` 패턴으로 통일한다.
- `beforeEach`에서 mock reset
- 불필요한 DB integration test는 추가하지 않는다.

---

## Phase A: User + Space

### Task 1: 사용자 검색 백엔드 계약 확장

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/user/user.controller.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/user/user.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/user/user.interface.ts`
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/user/user.service.spec.ts`

**Step 1: 실패하는 테스트 작성**

```ts
it('searches a user by id', async () => {
  await service.searchUser({ id: 'user_123' });
  expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user_123' } }));
});

it('searches a user by code', async () => {
  await service.searchUser({ code: 1001 });
  expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 1001 } }));
});

it('returns shared include shape for username lookup', async () => {
  await service.searchUser({ username: 'ralph' });
  expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
    where: { username: 'ralph' },
    include: expect.objectContaining({ socialAccount: true, _count: expect.any(Object) }),
  }));
});
```

**Step 2: 테스트 실행**

Run: `yarn test admin/user/user.service.spec.ts --runInBand`  
Expected: FAIL because `searchUser` and new query type do not exist yet

**Step 3: query 타입 추가**

```ts
export interface SearchUserParams {
  id?: string;
  code?: number;
  username?: string;
  email?: string;
}
```

**Step 4: 서비스 구현**

- `searchUser(params)` 추가
- defensive priority는 `id -> code -> username -> email`
- lookup은 모두 exact match
- include는 기존 user detail과 동일하게 유지

**Step 5: controller route 추가**

```ts
@TypedRoute.Get('/search')
async searchUser(@TypedQuery() query: SearchUserParams) {
  return this.userService.searchUser(query);
}
```

- `@TypedRoute.Get('/search')`는 반드시 `@TypedRoute.Get(':username')`보다 위에 선언한다.
- 기존 `/:username`, `/email/:email` route는 호환을 위해 유지한다.

**Step 6: 테스트 재실행**

Run: `yarn test admin/user/user.service.spec.ts --runInBand`  
Expected: PASS

### Task 2: 사용자 검색 패널 프론트 업데이트

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/user.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/user/UserSearch.tsx`

**Step 1: client 함수 추가**

```ts
export async function searchUser(params: { id?: string; code?: number; username?: string; email?: string }) {
  const res = await client.get<User>('/user/search', { params });
  return res.data;
}
```

**Step 2: 입력 필드 구조 교체**

- `UserSearch.tsx`에서 현재 `유저코드 + 이메일` 2필드를 `ID`, `Code`, `Username`, `Email` 4필드로 교체한다.
- 기존 `getUser`, `getUserByEmail` 분기 대신 `searchUser`만 사용한다.

**Step 3: 단일 필드 검색 규칙 적용**

- 4개 입력 중 2개 이상이 채워지면 아래 경고를 띄우고 API를 호출하지 않는다.

```ts
toast.warning('한 번에 한 필드만 검색해주세요.');
```

**Step 4: 설명 문구 정리**

- `UserSearch.tsx`의 `FormSection` description을 `id / code / username / email로 계정을 조회합니다.`로 수정한다.
- `UserList.tsx`의 sheet title은 `사용자 검색` 그대로 유지한다.

**Step 5: 수동 검증**

- `/user/list` 진입
- 검색 시트 오픈
- `id`, `code`, `username`, `email` 각각 1건 조회
- 다중 입력 시 warning toast 확인
- 빈 값 검색 시 warning toast 확인

### Task 3: 공간 조회 백엔드 검색/정렬 계약 확장

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.controller.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.interface.ts`
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.spec.ts`

**Step 1: 실패하는 테스트 작성**

```ts
it('orders spaces by pet exp', async () => {
  await service.getSpaces({ page: 1, orderBy: 'exp' });
  expect(prisma.space.findMany).toHaveBeenCalledWith(expect.objectContaining({
    orderBy: { pet: { exp: 'desc' } },
    skip: 0,
    take: 10,
  }));
});

it('searches spaces by name and nickname with deterministic cap', async () => {
  await service.searchSpaces({ name: 'house', nickname: 'buddy' });
  expect(prisma.space.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.any(Object),
    take: 50,
    orderBy: { createdAt: 'desc' },
  }));
});
```

**Step 2: 테스트 실행**

Run: `yarn test admin/space/space.service.spec.ts --runInBand`  
Expected: FAIL because new query and cap rules do not exist yet

**Step 3: query 타입 확장**

```ts
export interface GetSpacesParams {
  page: number;
  spaceType?: SpaceType[];
  locale?: Locale[];
  orderBy?: 'card' | 'replies' | 'exp' | 'members' | 'heart' | 'star' | 'roomCount' | 'interiorCount';
}

export interface SearchSpacesParams {
  spaceId?: string;
  name?: string;
  username?: string;
  nickname?: string;
}
```

**Step 4: 정렬 매핑 구현**

- `level` 제거
- 추가 매핑:
  - `heart -> { coin: 'desc' }`
  - `star -> { coinPaid: 'desc' }`
  - `exp -> { pet: { exp: 'desc' } }`
  - `roomCount -> { rooms: { _count: 'desc' } }`
  - `interiorCount -> { InteriorItem: { _count: 'desc' } }`
- 기존 `card`, `replies`, `members` 유지

**Step 5: 검색 endpoint 안전 장치 추가**

- `/admin/space/search`는 `Space[]` 반환 형식을 유지한다.
- 서버에서 아래 정책을 추가한다.
  - `take: 50`
  - `orderBy: { createdAt: 'desc' }`
  - `spaceId`는 exact
  - `name`, `username`, `nickname`은 `contains`

**Step 6: 테스트 재실행**

Run: `yarn test admin/space/space.service.spec.ts --runInBand`  
Expected: PASS

### Task 4: 공간 조회 프론트 필터바/검색 시트 동기화

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/space.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useSpaces.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/hooks/useSpaceFilters.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/SpaceFilterBar.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/SpaceSearch.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/SpaceTableColumns.tsx`

**Step 1: 프론트 query contract 업데이트**

- `getSpaces` / `useSpaces`의 `orderBy` union을 백엔드와 동일하게 맞춘다.
- `searchSpaces` params를 `{ spaceId?: string; name?: string; username?: string; nickname?: string }`로 바꾼다.

**Step 2: 필터바 옵션 교체**

- `레벨 높은 순` 제거
- `경험치 높은 순`, `하트 많은 순`, `스타 많은 순`, `방 많은 순`, `인테리어 많은 순` 추가

**Step 3: 검색 시트 입력 확장**

- `spaceId`, `공간명`, `username`, `nickname` 입력 추가
- `type`, `locale`, `dateRange`는 기존처럼 client-side filter 유지

**Step 4: 결과 관리**

- 서버 search 결과가 많아져도 최대 50건만 내려오므로 테이블/카드 렌더링 폭주를 막는다.
- 텍스트 검색 조건이 바뀔 때 local result state를 reset한다.

**Step 5: 표기 정리**

- `SpaceTableColumns.tsx`에서 `펫 LV` 표기는 `펫 EXP` 중심으로 바꾸고, 필요하면 `Lv`는 보조 badge로만 남긴다.

**Step 6: 수동 검증**

- `/space/list`에서 정렬 옵션 각각 확인
- `spaceId`, `공간명`, `username`, `nickname` 검색 확인
- `type`, `locale`, `dateRange` 후처리 필터 확인

### Phase A Verification Gate

**Step 1: 백엔드 타깃 테스트**

Run: `yarn test admin/user/user.service.spec.ts admin/space/space.service.spec.ts --runInBand`  
Expected: PASS

**Step 2: 백엔드 품질 확인**

Run: `yarn build`  
Expected: PASS

**Step 3: 프론트 품질 확인**

Run: `PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" npx tsc --noEmit --pretty false`  
Expected: current baseline 유지, no new errors

Run: `npm run lint`  
Expected: PASS or only pre-existing warnings reviewed

**Step 4: Phase A Commit**

```bash
git add /Users/gargoyle92/Documents/backend/mindqna-server/src/admin/user /Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space /Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/user.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/space.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/user /Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space /Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useSpaces.ts
git commit -m "feat: expand admin user and space search controls"
```

---

## Phase B: Bubble + Interior + Coupon

### Task 5: 펫 말풍선 검색/레벨 필터 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/admin.controller.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/pet/pet.service.ts`
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/pet/pet.service.spec.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/bubble.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useBubbles.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/bubble/BubbleList.tsx`

**Step 1: 백엔드 query 확장**

```ts
query: {
  page: number;
  type?: PetBubleType[];
  locale?: Locale[];
  level?: number;
  search?: string;
}
```

- `message contains search`
- `level exact filter`

**Step 2: 테스트 작성**

- `where.level`
- `where.message.contains`
- `skip/take`
- `pageInfo`

**Step 3: 프론트 필터 UI 추가**

- 검색 input(`message 검색`)
- level select
- type/locale와 함께 조합 가능

**Step 4: pagination reset**

- 검색어나 필터가 바뀌면 `currentPage = 1`

**Step 5: UI 검증**

- empty state
- delete/create/edit 후 현재 필터 상태에서 refetch 유지

### Task 6: 가구 템플릿 검색/필터 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/interior/interior.controller.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/interior/interior.interface.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/interior/interior.service.ts`
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/interior/interior.service.spec.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/interior.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useInteriors.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/interior/InteriorList.tsx`

**Step 1: 백엔드 query contract 정의**

```ts
export interface GetInteriorTemplatesParams {
  page: number;
  room?: string;
  type?: InteriorTemplateType[];
  search?: string;
}
```

- `room exact`
- `type in []`
- `search`는 `name` + `category` `OR contains`

**Step 2: 테스트 작성**

- `where.room`
- `where.type.in`
- `where.OR`
- `skip/take`
- `count/pageInfo`

**Step 3: 프론트 필터바 추가**

- 검색 input
- room select
- type select
- 우측 `추가` 버튼 유지

**Step 4: pagination reset + refetch 검증**

- 필터/검색 변경 시 1페이지 리셋
- 생성/수정/삭제 후 현재 필터 상태 유지 여부 확인

### Task 7: 쿠폰 백엔드 검색 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/admin.controller.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/product/product.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/product/types/product.types.ts`
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/product/product.service.spec.ts`

**Step 1: query 타입 정의**

```ts
export type GetCouponsParams = {
  page: number;
  search?: string;
};
```

**Step 2: 2단계 username search 알고리즘 고정**

1. `couponMeta.findMany({ where: { username: { contains: search } }, select: { couponId: true } })`
2. `couponId[]`를 추출
3. `coupon.findMany`와 `coupon.count`에 같은 `where`를 사용

```ts
where: search
  ? {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
        ...(couponIds.length ? [{ id: { in: couponIds } }] : []),
      ],
    }
  : undefined;
```

**Step 3: 테스트 작성**

- username-only search가 `couponMeta`를 먼저 조회하는지 검증
- `findMany`와 `count`가 같은 `where`를 쓰는지 검증
- `pageInfo.totalPage`가 정확한지 검증

**Step 4: controller query 반영**

- `/admin/coupon?page=1&search=...`

### Task 8: 쿠폰 리스트 프론트 검색 UI 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/coupon.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useCoupons.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/coupon/CouponList.tsx`

**Step 1: query params 연결**

- `getCoupons(page, search?)`
- `useCoupons(page, search?)`

**Step 2: 검색 UI 추가**

- `쿠폰명 / 코드 / 사용자 검색` input
- 우측 `추가` 버튼 유지

**Step 3: pagination reset**

- 검색어 변경 시 `currentPage = 1`

**Step 4: 회귀 검증**

- empty state
- 수정/삭제 후 current search 상태로 refetch

### Task 9: 리스트 일관성 정리

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/bubble/BubbleList.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/interior/InteriorList.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/coupon/CouponList.tsx`

**Step 1: 공통 UX 점검**

- 긴 텍스트 `truncate + tooltip`
- action dropdown 유지
- empty state 정리
- 버튼 위치 일관성 확인

**Step 2: 이번 배치에서 수정하지 않을 리스트 메모**

- `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/banner/BannerList.tsx`
- `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/push/PushList.tsx`
- `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/card/CardList.tsx`

- 위 파일은 같은 패턴으로 확장 가능하지만 이번 서버 계약 변경 범위에는 포함하지 않는다.

### Phase B Verification Gate

**Step 1: 백엔드 타깃 테스트**

Run: `yarn test admin/pet/pet.service.spec.ts admin/interior/interior.service.spec.ts admin/product/product.service.spec.ts --runInBand`  
Expected: PASS

**Step 2: 백엔드 품질 확인**

Run: `yarn build`  
Expected: PASS

**Step 3: 프론트 품질 확인**

Run: `PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" npx tsc --noEmit --pretty false`  
Expected: current baseline 유지, no new errors

Run: `npm run lint`  
Expected: PASS or only pre-existing warnings reviewed

**Step 4: 수동 검증**

- `/template/bubble`
- `/template/interior`
- `/product/coupon`

**Step 5: Phase B Commit**

```bash
git add /Users/gargoyle92/Documents/backend/mindqna-server/src/admin/pet /Users/gargoyle92/Documents/backend/mindqna-server/src/admin/interior /Users/gargoyle92/Documents/backend/mindqna-server/src/admin/product /Users/gargoyle92/Documents/backend/mindqna-server/src/admin/admin.controller.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/bubble.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/interior.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/coupon.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useBubbles.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useInteriors.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useCoupons.ts /Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/bubble /Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/interior /Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/coupon
git commit -m "feat: expand admin list search and filter coverage"
```

---

## Final Verification Matrix

- Backend tests:
  - `yarn test admin/user/user.service.spec.ts admin/space/space.service.spec.ts --runInBand`
  - `yarn test admin/pet/pet.service.spec.ts admin/interior/interior.service.spec.ts admin/product/product.service.spec.ts --runInBand`
- Backend quality:
  - `yarn build`
  - `yarn lint`
- Frontend quality:
  - `PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" npx tsc --noEmit --pretty false`
  - `npm run lint`
- Manual UI:
  - `/user/list`
  - `/space/list`
  - `/template/bubble`
  - `/template/interior`
  - `/product/coupon`

## Risks And Mitigations

- `space search` 결과 수가 많아질 수 있다.
  - mitigation: server `take: 50` + deterministic ordering 유지
- `coupon username` 검색은 relation이 없어 쿼리 실수가 나기 쉽다.
  - mitigation: 2단계 query algorithm 고정 + `count`와 `findMany` where 동일성 테스트
- `user code`와 기존 “유저코드” 의미가 혼동될 수 있다.
  - mitigation: UI 라벨을 `ID`, `Code`, `Username`, `Email`로 명시 분리
- 프론트 pagination 상태가 검색 변경 시 꼬일 수 있다.
  - mitigation: bubble/interior/coupon 모두 `currentPage = 1` reset task 포함

## Out Of Scope

- Prisma schema migration
- 전 리스트 화면의 서버 검색 기능 일괄 도입
- debounce, saved filters, 검색 히스토리
- 프론트 테스트 러너 신규 도입
