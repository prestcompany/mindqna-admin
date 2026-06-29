# 유저 상세 탭 뷰 (사이클 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 유저 상세 사이드패널을 space 상세처럼 탭 기반(참여공간/결제내역/구독·권한/접속기록/푸시이력)으로 고도화한다.

**Architecture:** 백엔드 `UserService`에 탭별 조회 메서드를 추가하고 `GET /admin/user/:username/<tab>`으로 노출(관계 필터 `where: { user: { username } }`, PremiumTicket만 `owner`). 어드민은 `UserDetailSheet`를 탭형으로 전환하고 탭별 lazy `useQuery` + 기존 범용 `SpaceTabList`(로딩/빈/페이지네이션 래퍼) 재사용. 디자인은 space 탭과 동일.

**Tech Stack:** NestJS 10 + Nestia(@TypedRoute.Get/@TypedQuery/@TypedParam), Prisma 5.8, Jest(AAA, virtual mock). 어드민: Next.js Pages Router, React Query, shadcn/ui, dayjs.

**Repos:**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 어드민: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Constraints:** 스키마 변경 없음(`prisma generate`만). 푸시는 SSH로 직접. 이모지 금지. 디자인 컨벤션 space와 동일.

---

## File Structure

**백엔드 (`mindqna-server`)**
- Modify `src/admin/user/user.interface.ts` — `UserTabQuery` 추가
- Modify `src/admin/user/user.service.ts` — 탭 메서드 5개 + `assertUserExists` 추가
- Modify `src/admin/user/user.controller.ts` — 탭 GET 라우트 5개
- Modify `src/admin/user/user.service.spec.ts` — mock 팩토리 확장, 서비스 타입 선언 확장, 탭 테스트

**어드민 (`mindqna-admin`)**
- Modify `src/client/types.ts` — 탭 row/결과 타입
- Modify `src/client/user.ts` — 탭 fetcher 5개
- Create `src/components/page/user/components/tabs/UserProfilesTab.tsx`
- Create `src/components/page/user/components/tabs/UserPurchasesTab.tsx`
- Create `src/components/page/user/components/tabs/UserEntitlementsTab.tsx`
- Create `src/components/page/user/components/tabs/UserAccessTab.tsx`
- Create `src/components/page/user/components/tabs/UserPushesTab.tsx`
- Modify `src/components/page/user/components/UserDetailSheet.tsx` — 탭 컨테이너로 전환

---

## Task 1: 백엔드 인터페이스 + 테스트 하네스

**Files:**
- Modify: `src/admin/user/user.interface.ts`
- Modify: `src/admin/user/user.service.spec.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: `UserTabQuery` 인터페이스 추가**

`src/admin/user/user.interface.ts` 맨 아래에 추가:

```ts
export interface UserTabQuery {
  page?: number;
}
```

- [ ] **Step 2: mock 팩토리 확장**

`src/admin/user/user.service.spec.ts`의 `createPrismaServiceMock` 반환 객체에서 `profile: {...}` 블록 다음에 추가:

```ts
    purchaseHistoryMeta: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    premiumTicket: {
      findMany: jest.fn(),
    },
    goldClub: {
      findMany: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
    },
    userAccessMeta: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pushMeta: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
```

- [ ] **Step 3: 서비스 타입 선언 확장**

같은 파일 `const { UserService } = require('./user.service') as { UserService: new (...args: any[]) => { ... } }` 블록의 `transferUserAccount?: ...` 줄 다음에 추가:

```ts
    getUserProfiles?: (username: string) => Promise<unknown>;
    getUserPurchases?: (username: string, query: { page?: number }) => Promise<unknown>;
    getUserEntitlements?: (username: string) => Promise<unknown>;
    getUserAccess?: (username: string, query: { page?: number }) => Promise<unknown>;
    getUserPushes?: (username: string, query: { page?: number }) => Promise<unknown>;
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.interface.ts src/admin/user/user.service.spec.ts
git commit -m "test(admin/user): add tab harness (interface, mock factory, type decl)"
```

---

## Task 2: 비페이지네이션 탭 — profiles, entitlements (TDD)

**Files:**
- Modify: `src/admin/user/user.service.spec.ts`
- Modify: `src/admin/user/user.service.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 실패 테스트 추가**

`src/admin/user/user.service.spec.ts`의 최상위 `describe('UserService', () => { ... })` 안, 마지막 내부 `describe` 뒤(최상위 닫힘 `});` 직전)에 추가:

```ts
  describe('getUserProfiles', () => {
    it('returns profiles with resolved space name', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      prisma.profile.findMany.mockResolvedValue([
        {
          id: 'p1',
          nickname: 'buddy',
          spaceId: 'space_1',
          isPremium: true,
          isGoldClub: false,
          disabled: false,
          removed: false,
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          space: { spaceInfo: { name: '우리집' } },
        },
      ]);

      const result = (await service.getUserProfiles!('ralph')) as Array<{ spaceName: string | null }>;

      expect(result[0].spaceName).toBe('우리집');
      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { username: 'ralph' } } }),
      );
    });

    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfiles!('missing')).rejects.toThrow('Not Found');
    });
  });

  describe('getUserEntitlements', () => {
    it('returns premium tickets, gold clubs and subscriptions', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      prisma.$transaction.mockResolvedValue([
        [{ id: 1, productId: 'premium', platform: 'ios', isActive: true, dueAt: null, profileId: 'p1', createdAt: new Date() }],
        [{ id: 2, productId: 'gold', platform: 'android', isActive: false, dueAt: null, profileId: 'p2', createdAt: new Date() }],
        [{ id: 3, productId: 'sub', platform: 'ios', transactionId: 'tx', createdAt: new Date() }],
      ]);

      const result = (await service.getUserEntitlements!('ralph')) as {
        premiumTickets: unknown[];
        goldClubs: unknown[];
        subscriptions: unknown[];
      };

      expect(result.premiumTickets).toHaveLength(1);
      expect(result.goldClubs).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
    });

    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserEntitlements!('missing')).rejects.toThrow('Not Found');
    });
  });
```

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/user/user.service.spec.ts -t "getUserProfiles|getUserEntitlements"`
Expected: FAIL — `service.getUserProfiles is not a function`

- [ ] **Step 3: 구현**

`src/admin/user/user.service.ts`의 `UserService` 클래스 안(기존 메서드들 뒤, 클래스 닫힘 `}` 직전)에 추가. 파일 상단에 `NotFoundException`이 이미 import되어 있음(없으면 `import { NotFoundException } from 'src/common/exception/error';` 확인).

```ts
  private async assertUserExists(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw NotFoundException();
  }

  async getUserProfiles(username: string) {
    await this.assertUserExists(username);

    const items = await this.prisma.profile.findMany({
      where: { user: { username } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nickname: true,
        spaceId: true,
        isPremium: true,
        isGoldClub: true,
        disabled: true,
        removed: true,
        createdAt: true,
        space: { select: { spaceInfo: { select: { name: true } } } },
      },
    });

    return items.map(({ space, ...profile }) => ({
      ...profile,
      spaceName: space?.spaceInfo?.name ?? null,
    }));
  }

  async getUserEntitlements(username: string) {
    await this.assertUserExists(username);

    const [premiumTickets, goldClubs, subscriptions] = await this.prisma.$transaction([
      this.prisma.premiumTicket.findMany({
        where: { owner: { username } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, productId: true, platform: true, isActive: true, dueAt: true, profileId: true, createdAt: true },
      }),
      this.prisma.goldClub.findMany({
        where: { user: { username } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, productId: true, platform: true, isActive: true, dueAt: true, profileId: true, createdAt: true },
      }),
      this.prisma.subscription.findMany({
        where: { user: { username } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, productId: true, platform: true, transactionId: true, createdAt: true },
      }),
    ]);

    return { premiumTickets, goldClubs, subscriptions };
  }
```

- [ ] **Step 4: 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/user/user.service.spec.ts -t "getUserProfiles|getUserEntitlements"`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.service.ts src/admin/user/user.service.spec.ts
git commit -m "feat(admin/user): add getUserProfiles and getUserEntitlements"
```

---

## Task 3: 페이지네이션 탭 — purchases, access, pushes (TDD)

**Files:**
- Modify: `src/admin/user/user.service.spec.ts`
- Modify: `src/admin/user/user.service.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 실패 테스트 추가**

`user.service.spec.ts`의 최상위 describe 안(Task 2 블록 뒤)에 추가:

```ts
  describe('getUserPurchases', () => {
    it('returns paginated purchase history ordered by recent', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      prisma.$transaction.mockResolvedValue([
        [{ id: 1, productId: 'coin_100', platform: 'ios', price: '1,200', isSubscribe: false, createdAt: new Date() }],
        1,
      ]);

      const result = (await service.getUserPurchases!('ralph', { page: 1 })) as {
        items: unknown[];
        totalCount: number;
        pageInfo: { totalPage: number };
      };

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.pageInfo.totalPage).toBe(1);
    });

    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserPurchases!('missing', {})).rejects.toThrow('Not Found');
    });
  });

  describe('getUserAccess', () => {
    it('returns paginated access logs with space name', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      prisma.$transaction.mockResolvedValue([
        [{ id: 1, spaceId: 'space_1', heart: 3, createdAt: new Date(), space: { spaceInfo: { name: '우리집' } } }],
        1,
      ]);

      const result = (await service.getUserAccess!('ralph', { page: 1 })) as {
        items: Array<{ spaceName: string | null }>;
        totalCount: number;
      };

      expect(result.items[0].spaceName).toBe('우리집');
      expect(result.totalCount).toBe(1);
    });
  });

  describe('getUserPushes', () => {
    it('returns paginated push history', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      prisma.$transaction.mockResolvedValue([
        [{ id: 1, title: '알림', desc: null, isChecked: false, spaceId: null, createdAt: new Date() }],
        1,
      ]);

      const result = (await service.getUserPushes!('ralph', { page: 1 })) as { items: unknown[]; totalCount: number };

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });
```

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/user/user.service.spec.ts -t "getUserPurchases|getUserAccess|getUserPushes"`
Expected: FAIL — `service.getUserPurchases is not a function`

- [ ] **Step 3: 구현**

`UserService` 클래스 안(Task 2에서 추가한 메서드 뒤)에 추가. 상단 import에 `UserTabQuery`를 추가한다(현재 `import { GetUsersParams, SearchUserParams, TransferUserAccountParams } from './user.interface';` → 끝에 `UserTabQuery` 추가):

```ts
  async getUserPurchases(username: string, query: UserTabQuery) {
    await this.assertUserExists(username);

    const offset = 10;
    const page = query.page ?? 1;
    const skip = (page - 1) * offset;
    const where = { user: { username } };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.purchaseHistoryMeta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: offset,
        skip,
        select: { id: true, productId: true, platform: true, price: true, isSubscribe: true, createdAt: true },
      }),
      this.prisma.purchaseHistoryMeta.count({ where }),
    ]);

    return { items, totalCount, pageInfo: { totalPage: Math.ceil(totalCount / offset) } };
  }

  async getUserAccess(username: string, query: UserTabQuery) {
    await this.assertUserExists(username);

    const offset = 10;
    const page = query.page ?? 1;
    const skip = (page - 1) * offset;
    const where = { user: { username } };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.userAccessMeta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: offset,
        skip,
        select: {
          id: true,
          spaceId: true,
          heart: true,
          createdAt: true,
          space: { select: { spaceInfo: { select: { name: true } } } },
        },
      }),
      this.prisma.userAccessMeta.count({ where }),
    ]);

    return {
      items: items.map(({ space, ...meta }) => ({ ...meta, spaceName: space?.spaceInfo?.name ?? null })),
      totalCount,
      pageInfo: { totalPage: Math.ceil(totalCount / offset) },
    };
  }

  async getUserPushes(username: string, query: UserTabQuery) {
    await this.assertUserExists(username);

    const offset = 10;
    const page = query.page ?? 1;
    const skip = (page - 1) * offset;
    const where = { user: { username } };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.pushMeta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: offset,
        skip,
        select: { id: true, title: true, desc: true, isChecked: true, spaceId: true, createdAt: true },
      }),
      this.prisma.pushMeta.count({ where }),
    ]);

    return { items, totalCount, pageInfo: { totalPage: Math.ceil(totalCount / offset) } };
  }
```

- [ ] **Step 4: 통과 + 전체 회귀 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/user/user.service.spec.ts`
Expected: PASS (기존 + 신규 모두)

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.service.ts src/admin/user/user.service.spec.ts
git commit -m "feat(admin/user): add paginated purchases/access/pushes tab queries"
```

---

## Task 4: 백엔드 컨트롤러 라우트

**Files:**
- Modify: `src/admin/user/user.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: import 확장**

`src/admin/user/user.controller.ts`의 인터페이스 import에 `UserTabQuery`를 추가한다. 현재:
```ts
import { SearchUserParams, TransferUserAccountParams } from './user.interface';
```
변경:
```ts
import { SearchUserParams, TransferUserAccountParams, UserTabQuery } from './user.interface';
```

- [ ] **Step 2: 탭 라우트 추가**

`getUserByEmail` 메서드(`@TypedRoute.Get('/email/:email') ...` 블록) 바로 다음에 추가한다(주석 처리된 `updateUser` 블록 위):

```ts
  @TypedRoute.Get(':username/profiles')
  async getUserProfiles(@TypedParam('username') username: string) {
    return (await this.userService.getUserProfiles(username)) as any;
  }

  @TypedRoute.Get(':username/purchases')
  async getUserPurchases(@TypedParam('username') username: string, @TypedQuery() query: UserTabQuery) {
    return (await this.userService.getUserPurchases(username, query)) as any;
  }

  @TypedRoute.Get(':username/entitlements')
  async getUserEntitlements(@TypedParam('username') username: string) {
    return (await this.userService.getUserEntitlements(username)) as any;
  }

  @TypedRoute.Get(':username/access')
  async getUserAccess(@TypedParam('username') username: string, @TypedQuery() query: UserTabQuery) {
    return (await this.userService.getUserAccess(username, query)) as any;
  }

  @TypedRoute.Get(':username/pushes')
  async getUserPushes(@TypedParam('username') username: string, @TypedQuery() query: UserTabQuery) {
    return (await this.userService.getUserPushes(username, query)) as any;
  }
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "user.controller|user.service" ; echo DONE`
Expected: 출력에 에러 줄 없음(`DONE`만).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.controller.ts
git commit -m "feat(admin/user): expose user detail tab routes"
```

---

## Task 5: 어드민 타입 + 클라이언트 fetcher

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/user.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 타입 추가**

`src/client/types.ts` 맨 아래에 추가:

```ts
export type UserTabPageResult<T> = {
  items: T[];
  totalCount: number;
  pageInfo: { totalPage: number };
};

export type UserProfileRow = {
  id: string;
  nickname: string;
  spaceId: string | null;
  spaceName: string | null;
  isPremium: boolean;
  isGoldClub: boolean;
  disabled: boolean;
  removed: boolean;
  createdAt: string;
};

export type UserPurchaseRow = {
  id: number;
  productId: string;
  platform: string;
  price: string;
  isSubscribe: boolean;
  createdAt: string;
};

export type UserEntitlementTicket = {
  id: number;
  productId: string;
  platform: string;
  isActive: boolean;
  dueAt: string | null;
  profileId: string | null;
  createdAt: string;
};

export type UserSubscriptionRow = {
  id: number;
  productId: string;
  platform: string;
  transactionId: string;
  createdAt: string;
};

export type UserEntitlements = {
  premiumTickets: UserEntitlementTicket[];
  goldClubs: UserEntitlementTicket[];
  subscriptions: UserSubscriptionRow[];
};

export type UserAccessRow = {
  id: number;
  spaceId: string;
  spaceName: string | null;
  heart: number;
  createdAt: string;
};

export type UserPushRow = {
  id: number;
  title: string;
  desc: string | null;
  isChecked: boolean;
  spaceId: string | null;
  createdAt: string;
};
```

- [ ] **Step 2: fetcher 추가**

`src/client/user.ts`의 import에 새 타입을 추가하고(현재 `import { QueryResultWithPagination, UserDetail, UserSummary } from './types';`), 파일 맨 아래에 fetcher를 추가한다.

import 변경:
```ts
import {
  QueryResultWithPagination,
  UserAccessRow,
  UserDetail,
  UserEntitlements,
  UserProfileRow,
  UserPurchaseRow,
  UserPushRow,
  UserSummary,
  UserTabPageResult,
} from './types';
```

파일 맨 아래 추가:
```ts
export async function getUserProfiles(username: string) {
  const res = await client.get<UserProfileRow[]>(`/user/${username}/profiles`);

  return res.data;
}

export async function getUserPurchases(username: string, page: number) {
  const res = await client.get<UserTabPageResult<UserPurchaseRow>>(`/user/${username}/purchases`, { params: { page } });

  return res.data;
}

export async function getUserEntitlements(username: string) {
  const res = await client.get<UserEntitlements>(`/user/${username}/entitlements`);

  return res.data;
}

export async function getUserAccess(username: string, page: number) {
  const res = await client.get<UserTabPageResult<UserAccessRow>>(`/user/${username}/access`, { params: { page } });

  return res.data;
}

export async function getUserPushes(username: string, page: number) {
  const res = await client.get<UserTabPageResult<UserPushRow>>(`/user/${username}/pushes`, { params: { page } });

  return res.data;
}
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "client/user|client/types" ; echo DONE`
Expected: 에러 줄 없음(`DONE`만).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/user.ts
git commit -m "feat(user): add user detail tab fetchers and types"
```

---

## Task 6: 페이지네이션 탭 컴포넌트 — 결제/접속/푸시

**Files:**
- Create: `src/components/page/user/components/tabs/UserPurchasesTab.tsx`
- Create: `src/components/page/user/components/tabs/UserAccessTab.tsx`
- Create: `src/components/page/user/components/tabs/UserPushesTab.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

> 범용 래퍼 `SpaceTabList`(로딩/빈/페이지네이션)를 재사용한다. 위치는 `@/components/page/space/components/tabs/SpaceTabList`.

- [ ] **Step 1: `UserPurchasesTab.tsx` 생성**

```tsx
import { getUserPurchases } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';

function UserPurchasesTab({ username, active }: { username: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['user-purchases', username, page],
    queryFn: () => getUserPurchases(username, page),
    enabled: active && !!username,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='결제 내역이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((row) => (
        <div
          key={row.id}
          className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <Badge variant='softNeutral' className='shrink-0 uppercase'>
            {row.platform}
          </Badge>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-slate-900'>{row.productId}</div>
            <div className='truncate text-xs text-slate-500'>
              {row.isSubscribe ? '구독' : '단건'} · {dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}
            </div>
          </div>
          <div className='shrink-0 text-sm font-semibold tabular-nums text-slate-900'>{row.price}</div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default UserPurchasesTab;
```

- [ ] **Step 2: `UserAccessTab.tsx` 생성**

```tsx
import { getUserAccess } from '@/client/user';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';

function UserAccessTab({ username, active }: { username: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['user-access', username, page],
    queryFn: () => getUserAccess(username, page),
    enabled: active && !!username,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='접속 기록이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((row) => (
        <div
          key={row.id}
          className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-slate-900'>{row.spaceName ?? row.spaceId}</div>
            <div className='truncate text-xs text-slate-500'>{dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}</div>
          </div>
          <div className='shrink-0 text-sm tabular-nums text-rose-600'>♥ {row.heart}</div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default UserAccessTab;
```

- [ ] **Step 3: `UserPushesTab.tsx` 생성**

```tsx
import { getUserPushes } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import SpaceTabList from '@/components/page/space/components/tabs/SpaceTabList';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';

function UserPushesTab({ username, active }: { username: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['user-pushes', username, page],
    queryFn: () => getUserPushes(username, page),
    enabled: active && !!username,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='푸시 내역이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((row) => (
        <div
          key={row.id}
          className='flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-slate-900'>{row.title}</div>
            {row.desc ? <div className='truncate text-xs text-slate-500'>{row.desc}</div> : null}
            <div className='text-[11px] text-slate-500'>{dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}</div>
          </div>
          <Badge variant={row.isChecked ? 'softSuccess' : 'softNeutral'} className='shrink-0'>
            {row.isChecked ? '확인' : '미확인'}
          </Badge>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default UserPushesTab;
```

- [ ] **Step 4: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "UserPurchasesTab|UserAccessTab|UserPushesTab" ; echo DONE`
Expected: 에러 줄 없음(`DONE`만).

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/user/components/tabs/UserPurchasesTab.tsx src/components/page/user/components/tabs/UserAccessTab.tsx src/components/page/user/components/tabs/UserPushesTab.tsx
git commit -m "feat(user): add purchases/access/pushes tab components"
```

---

## Task 7: 비페이지네이션 탭 컴포넌트 — 참여공간/구독·권한

**Files:**
- Create: `src/components/page/user/components/tabs/UserProfilesTab.tsx`
- Create: `src/components/page/user/components/tabs/UserEntitlementsTab.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: `UserProfilesTab.tsx` 생성**

```tsx
import { getUserProfiles } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function UserProfilesTab({ username, active }: { username: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['user-profiles', username],
    queryFn: () => getUserProfiles(username),
    enabled: active && !!username,
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (data && data.length === 0) {
    return (
      <Card className='bg-card'>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>참여 중인 공간이 없습니다.</CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-3'>
      {(data ?? []).map((profile) => (
        <div
          key={profile.id}
          className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='truncate text-sm font-medium text-slate-900'>{profile.spaceName ?? profile.spaceId ?? '-'}</span>
              {profile.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
              {profile.isGoldClub ? <Badge variant='softWarning'>GOLD</Badge> : null}
              {profile.disabled || profile.removed ? <Badge variant='softNeutral'>비활성</Badge> : null}
            </div>
            <div className='truncate text-xs text-slate-500'>
              {profile.nickname} · 가입 {dayjs(profile.createdAt).format('YYYY.MM.DD')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UserProfilesTab;
```

- [ ] **Step 2: `UserEntitlementsTab.tsx` 생성**

```tsx
import { getUserEntitlements } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { UserEntitlementTicket } from '@/client/types';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function isLive(t: UserEntitlementTicket): boolean {
  if (!t.isActive) return false;
  if (!t.dueAt) return true;
  return new Date(t.dueAt).getTime() > Date.now();
}

function EntitlementRow({ label, t }: { label: string; t: UserEntitlementTicket }) {
  const live = isLive(t);
  return (
    <div className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
      <Badge variant={live ? 'softSuccess' : 'softNeutral'} className='shrink-0'>
        {label}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-slate-900'>{t.productId}</div>
        <div className='truncate text-xs text-slate-500'>
          {t.platform.toUpperCase()} · {t.dueAt ? `만료 ${dayjs(t.dueAt).format('YYYY.MM.DD')}` : '만료 없음'}
        </div>
      </div>
      <span className={`shrink-0 text-xs font-medium ${live ? 'text-emerald-600' : 'text-slate-500'}`}>
        {live ? '활성' : '비활성'}
      </span>
    </div>
  );
}

function UserEntitlementsTab({ username, active }: { username: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['user-entitlements', username],
    queryFn: () => getUserEntitlements(username),
    enabled: active && !!username,
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const tickets = data?.premiumTickets ?? [];
  const golds = data?.goldClubs ?? [];
  const subs = data?.subscriptions ?? [];
  const isEmpty = tickets.length === 0 && golds.length === 0 && subs.length === 0;

  if (data && isEmpty) {
    return (
      <Card className='bg-card'>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>구독/권한 내역이 없습니다.</CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <p className='text-xs text-slate-500'>
        구독 레코드는 DB 보유 정보입니다. 스토어 실시간 갱신/취소 상태는 추후 연동 예정입니다.
      </p>
      <div className='space-y-3'>
        {tickets.map((t) => (
          <EntitlementRow key={`p-${t.id}`} label='프리미엄' t={t} />
        ))}
        {golds.map((t) => (
          <EntitlementRow key={`g-${t.id}`} label='골드클럽' t={t} />
        ))}
        {subs.map((s) => (
          <div
            key={`s-${s.id}`}
            className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
          >
            <Badge variant='softNeutral' className='shrink-0'>
              구독
            </Badge>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-slate-900'>{s.productId}</div>
              <div className='truncate text-xs text-slate-500'>
                {s.platform.toUpperCase()} · {dayjs(s.createdAt).format('YYYY.MM.DD')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserEntitlementsTab;
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "UserProfilesTab|UserEntitlementsTab" ; echo DONE`
Expected: 에러 줄 없음(`DONE`만).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/user/components/tabs/UserProfilesTab.tsx src/components/page/user/components/tabs/UserEntitlementsTab.tsx
git commit -m "feat(user): add profiles and entitlements tab components"
```

---

## Task 8: `UserDetailSheet` 탭 컨테이너 전환

**Files:**
- Modify: `src/components/page/user/components/UserDetailSheet.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: import 추가**

`UserDetailSheet.tsx` 상단 import에 추가(기존 import 블록에 합쳐서):

```ts
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import UserProfilesTab from './tabs/UserProfilesTab';
import UserPurchasesTab from './tabs/UserPurchasesTab';
import UserEntitlementsTab from './tabs/UserEntitlementsTab';
import UserAccessTab from './tabs/UserAccessTab';
import UserPushesTab from './tabs/UserPushesTab';
```

- [ ] **Step 2: 탭 상태 추가**

`function UserDetailSheet(...) {` 본문 맨 위(`const username = user?.username;` 다음)에 추가:

```ts
  const [tab, setTab] = useState('overview');
  useEffect(() => {
    setTab('overview');
  }, [username]);
```

- [ ] **Step 3: 본문을 탭으로 감싸기**

현재 시트 본문에서 데이터 로드 성공 시 `<UserDetailContent ... />`를 렌더하는 부분을, 탭 구조로 교체한다. 기존:

```tsx
        ) : (
          <UserDetailContent
            user={data}
            copyId={copyId}
            onOpenTicket={onOpenTicket}
            onRemove={onRemove}
          />
        )}
```

변경:

```tsx
        ) : (
          <Tabs value={tab} onValueChange={setTab} className='w-full'>
            <div className='mb-4 overflow-x-auto'>
              <TabsList>
                <TabsTrigger value='overview'>개요</TabsTrigger>
                <TabsTrigger value='profiles'>참여 공간</TabsTrigger>
                <TabsTrigger value='purchases'>결제 내역</TabsTrigger>
                <TabsTrigger value='entitlements'>구독/권한</TabsTrigger>
                <TabsTrigger value='access'>접속 기록</TabsTrigger>
                <TabsTrigger value='pushes'>푸시 이력</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value='overview'>
              <UserDetailContent user={data} copyId={copyId} onOpenTicket={onOpenTicket} onRemove={onRemove} />
            </TabsContent>
            <TabsContent value='profiles'>
              <UserProfilesTab username={data.username} active={tab === 'profiles'} />
            </TabsContent>
            <TabsContent value='purchases'>
              <UserPurchasesTab username={data.username} active={tab === 'purchases'} />
            </TabsContent>
            <TabsContent value='entitlements'>
              <UserEntitlementsTab username={data.username} active={tab === 'entitlements'} />
            </TabsContent>
            <TabsContent value='access'>
              <UserAccessTab username={data.username} active={tab === 'access'} />
            </TabsContent>
            <TabsContent value='pushes'>
              <UserPushesTab username={data.username} active={tab === 'pushes'} />
            </TabsContent>
          </Tabs>
        )}
```

> `data.username`은 `UserDetail`의 필드. 만약 타입에 username이 없으면 `user.username`(props)을 사용한다.

- [ ] **Step 4: 타입체크 + 빌드**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "UserDetailSheet" ; echo TSC_DONE`
Expected: 에러 줄 없음.

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && pnpm build 2>&1 | tail -5`
Expected: 빌드 성공(`/user/list` 컴파일).

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/user/components/UserDetailSheet.tsx
git commit -m "feat(user): convert user detail sheet to tabbed view"
```

---

## 최종 검증 (수동)

- [ ] 어드민 → 유저 목록 → 유저 클릭 → 사이드패널 상단 탭 6개(개요/참여공간/결제내역/구독권한/접속기록/푸시이력)
- [ ] 개요 탭 = 기존 상세 그대로(회귀 없음)
- [ ] 참여 공간 탭 → 공간명/닉네임/배지, 빈 유저는 빈 상태
- [ ] 결제 내역 탭 → 상품/플랫폼/가격/구독여부, 페이지네이션
- [ ] 구독/권한 탭 → 프리미엄/골드/구독 레코드, 활성/비활성 구분, 안내 문구
- [ ] 접속 기록 탭 → 공간명/일시/heart, 페이지네이션
- [ ] 푸시 이력 탭 → 제목/확인여부, 페이지네이션
- [ ] 다른 유저 열면 개요 탭부터 초기화

> 푸시는 SSH로 직접. 스키마 변경 없음(마이그레이션 불필요).
