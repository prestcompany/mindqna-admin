# 공간(Space) 어드민 고도화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공간 검색을 키별 분리 검색으로 개선하고, 검색 응답의 `isActive` 누락을 고치며, 공간 상세 사이드 패널을 8개 탭(개요+멤버+카드/답변+재화내역+일기+일정+펫·인테리어+활동로그)으로 확장한다.

**Architecture:** 백엔드(`mindqna-server`, NestJS+Nestia+Prisma)는 `src/admin/space`에 탭별 페이지네이션 엔드포인트를 추가하고 `SpaceService`(PrismaService 직접 주입) 패턴을 따른다. 프론트(`mindqna-admin`, Next 13 Pages Router)는 `SpaceDetailSheet`를 shadcn `Tabs` 컨테이너로 개편하고 탭별 lazy-load(`useQuery` enabled)한다. 두 레포는 Phase 0→1→2→3 순서로 독립 배포 가능.

**Tech Stack:** NestJS 10, Nestia(`@TypedRoute`/`@TypedQuery`), Prisma 5.8, Jest(AAA); Next 13, React Query, shadcn/ui, TanStack Table, dayjs.

**Repos (절대 경로):**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 프론트: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**명령:**
- 백엔드 테스트(단일): `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
- 백엔드 타입체크: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn build`
- 프론트 타입체크: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build`
- 프론트 린트: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn lint`

---

## File Structure

### 백엔드 (`mindqna-server`)
- Modify `src/admin/space/space.service.ts` — `spaceSearchSelect`에 `isActive` 추가; `searchSpaces` username `equals`; 탭별 메서드 7종 추가.
- Modify `src/admin/space/space.controller.ts` — 탭별 `@TypedRoute.Get(':id/...')` 라우트 7종 추가.
- Modify `src/admin/space/space.interface.ts` — 탭 공통 `SpaceTabQuery` 파라미터 타입 추가.
- Modify `src/admin/space/space.service.spec.ts` — 기존 fixture 보정 + 신규 메서드 테스트.

### 프론트 (`mindqna-admin`)
- Modify `src/components/page/space/SpaceSearch.tsx` — 통합검색 인풋 → 검색 기준 Select + 값 인풋.
- Modify `src/client/space.ts` — 탭별 fetch 함수 추가.
- Modify `src/client/types.ts` — 탭 응답 타입 추가.
- Modify `src/components/page/space/components/SpaceDetailSheet.tsx` — Tabs 컨테이너로 개편.
- Create `src/components/page/space/components/tabs/SpaceCardsTab.tsx` 등 탭별 컴포넌트.
- Create `src/components/page/space/components/tabs/SpaceTabList.tsx` — 재사용 페이지네이션 목록.

---

# Phase 0 — `isActive` 누락 수정 (요구사항 2)

### Task 0.1: 검색 select에 isActive 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.ts:75-96`
- Test: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.spec.ts:120-145`

- [ ] **Step 1: 테스트 fixture를 빨갛게 — `expectedSearchSpaceSelect`에 isActive 기대 추가**

`space.service.spec.ts`의 `expectedSearchSpaceSelect` 객체(120줄) 맨 위 `id: true,` 다음 줄에 추가:

```typescript
const expectedSearchSpaceSelect = {
  id: true,
  isActive: true,
  createdAt: true,
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
Expected: FAIL — `searchSpaces` 관련 테스트가 `select` 불일치로 실패 (수신 select에 isActive 없음).

- [ ] **Step 3: 서비스 select에 isActive 추가**

`space.service.ts`의 `spaceSearchSelect`(75줄) 시작 부분을 수정:

```typescript
const spaceSearchSelect = {
  id: true,
  isActive: true,
  createdAt: true,
  profiles: {
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
Expected: PASS (모든 SpaceService 테스트 통과).

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/space/space.service.ts src/admin/space/space.service.spec.ts
git commit -m "fix(admin/space): include isActive in search select so status renders per-row"
```

---

# Phase 1 — 검색 키별 분리 (요구사항 1)

### Task 1.1: 백엔드 — username 정확 일치(equals)

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.ts:283-295`
- Test: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.spec.ts:695`

- [ ] **Step 1: 분리 파라미터 검색 테스트 기대값을 equals로 변경 (red)**

`space.service.spec.ts`의 "searches spaces by query fields..." 테스트(636줄) 안 `where.OR` 기대 배열(692줄)에서 username 항목을 수정:

```typescript
            OR: [
              { id: 'space-1' },
              { spaceInfo: { name: { contains: 'house' } } },
              { profiles: { some: { user: { username: { equals: 'owner01' } } } } },
              { profiles: { some: { nickname: { contains: 'buddy' } } } },
            ],
```

> 주의: 통합 keyword 테스트(568줄)의 username은 `contains`를 그대로 둔다 — keyword 경로는 변경하지 않는다.

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
Expected: FAIL — query-fields 테스트가 `contains` 수신으로 불일치.

- [ ] **Step 3: 서비스의 분리 파라미터 username 분기를 equals로 변경**

`space.service.ts`의 `searchSpaces` 내 `inputSearchUsername` 분기(283-295줄)를 수정:

```typescript
      if (inputSearchUsername) {
        inputOrFilters.push({
          profiles: {
            some: {
              user: {
                username: {
                  equals: inputSearchUsername,
                },
              },
            },
          },
        });
      }
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/space/space.service.ts src/admin/space/space.service.spec.ts
git commit -m "perf(admin/space): match username by exact equals in keyed search"
```

### Task 1.2: 프론트 — 검색 폼을 「검색 기준 Select + 값」으로 교체

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/SpaceSearch.tsx:38-115,304-315`

설명: 현재 `searchParams.keyword` 한 개 + 항상 `keyword`만 전송. 이를 `searchKey`(spaceId|name|username|nickname) + `searchValue`로 바꾸고, 제출 시 선택된 키에만 값을 채워 `searchSpaces` 호출. `keyword`는 전송하지 않음.

- [ ] **Step 1: 상태 정의 교체**

`SpaceSearch.tsx`의 `searchParams` useState 초기값(39-47줄)을 교체:

```typescript
  const [searchParams, setSearchParams] = useState({
    searchKey: 'spaceId' as 'spaceId' | 'name' | 'username' | 'nickname',
    searchValue: '',
    type: undefined as SpaceType | undefined,
    locale: undefined as string | undefined,
    dateRange: {
      start: null as dayjs.Dayjs | null,
      end: null as dayjs.Dayjs | null,
    },
  });
```

- [ ] **Step 2: `getSearchParams` 교체 — 선택 키에만 값 매핑**

`getSearchParams`(61-76줄) 전체를 교체:

```typescript
  const getSearchParams = (page: number): SearchSpacesParams | null => {
    const value = searchParams.searchValue.trim();
    if (!value) {
      return null;
    }
    return {
      page,
      spaceId: searchParams.searchKey === 'spaceId' ? value : undefined,
      name: searchParams.searchKey === 'name' ? value : undefined,
      username: searchParams.searchKey === 'username' ? value : undefined,
      nickname: searchParams.searchKey === 'nickname' ? value : undefined,
      type: searchParams.type,
      locale: searchParams.locale,
      startDate: searchParams.dateRange.start?.format('YYYY-MM-DD'),
      endDate: searchParams.dateRange.end?.format('YYYY-MM-DD'),
    };
  };
```

- [ ] **Step 3: `handleResetFilters`의 초기화 값 교체**

`handleResetFilters`(117-128줄)의 `setSearchParams({...})` 객체를 교체:

```typescript
    setSearchParams({
      searchKey: 'spaceId',
      searchValue: '',
      type: undefined,
      locale: undefined,
      dateRange: {
        start: null,
        end: null,
      },
    });
```

- [ ] **Step 4: 「통합 검색」 FormGroup을 키 Select + 값 인풋으로 교체**

`SpaceSearch.tsx`의 `<FormGroup title='통합 검색'>...</FormGroup>` 블록(308-315줄)을 교체:

```tsx
          <FormGroup title='검색 기준'>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <Select
                value={searchParams.searchKey}
                onValueChange={(v) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    searchKey: v as 'spaceId' | 'name' | 'username' | 'nickname',
                  }))
                }
              >
                <SelectTrigger className='w-full sm:w-[160px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='spaceId'>공간 ID</SelectItem>
                  <SelectItem value='name'>공간 이름</SelectItem>
                  <SelectItem value='username'>사용자명</SelectItem>
                  <SelectItem value='nickname'>프로필 닉네임</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className='flex-1'
                placeholder={
                  searchParams.searchKey === 'username'
                    ? '사용자명 정확히 입력'
                    : searchParams.searchKey === 'spaceId'
                      ? '공간 ID 정확히 입력'
                      : '검색어 입력'
                }
                value={searchParams.searchValue}
                onChange={(e) => setSearchParams((prev) => ({ ...prev, searchValue: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </FormGroup>
```

- [ ] **Step 5: FormSection description 문구 보정**

`<FormSection ... description=...>`(304-307줄) description을 교체:

```tsx
          description='검색 기준을 선택해 해당 항목으로 조회합니다. 사용자명/공간 ID는 정확히 일치해야 합니다.'
```

- [ ] **Step 6: 타입체크 + 린트**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build`
Expected: 빌드 성공(타입 에러 없음). `searchParams.keyword` 잔존 참조가 있으면 에러로 드러남 → 모두 제거.

- [ ] **Step 7: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/space/SpaceSearch.tsx
git commit -m "feat(space): replace unified search with keyed search (id/name/username/nickname)"
```

### Task 1.3: 프론트 — 활성 필터 칩이 키 검색을 표시하도록 확인

**Files:**
- Modify(필요시): `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/SpaceActiveFilterChips.tsx`

- [ ] **Step 1: 칩 컴포넌트 확인**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && sed -n '1,80p' src/components/page/space/components/SpaceActiveFilterChips.tsx`
판단: 칩이 `params.keyword`에 의존하면 키/값 표시로 보정한다. type/locale/date만 표시한다면 변경 불필요(현 `handleRemoveFilterChip`는 type/locale/date만 다룸).

- [ ] **Step 2: (변경한 경우에만) 타입체크 + 커밋**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build`
Expected: 성공.

```bash
git add src/components/page/space/components/SpaceActiveFilterChips.tsx
git commit -m "fix(space): reflect keyed search in active filter chips"
```

---

# Phase 2 — 탭 컨테이너 + 핵심 3탭

## 백엔드

### Task 2.1: 탭 공통 쿼리 타입 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.interface.ts`

- [ ] **Step 1: 인터페이스 추가**

`space.interface.ts` 끝에 추가:

```typescript
export interface SpaceTabQuery {
  page?: number;
}
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn build`
Expected: 성공.

```bash
git add src/admin/space/space.interface.ts
git commit -m "feat(admin/space): add SpaceTabQuery param type for detail tabs"
```

### Task 2.2: 카드/답변 탭 엔드포인트 (`GET /admin/space/:id/cards`)

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.controller.ts`
- Test: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/space/space.service.spec.ts`

이 Task가 **모든 탭 엔드포인트의 레퍼런스 패턴**이다. 이후 Task는 select/where/매핑만 다르고 동일 구조를 따른다.

- [ ] **Step 1: prisma mock에 card 모델 추가 (테스트 준비)**

`space.service.spec.ts`의 `createPrismaServiceMock`(419-430줄)을 교체:

```typescript
function createPrismaServiceMock() {
  return {
    space: {
      count: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    card: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    coinMeta: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    diary: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    schedule: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userAccessMeta: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    adsMeta: {
      findMany: jest.fn(),
    },
    spaceJoinMeta: {
      findMany: jest.fn(),
    },
    pet: {
      findUnique: jest.fn(),
    },
    spacePetCustom: {
      findMany: jest.fn(),
    },
    room: {
      findMany: jest.fn(),
    },
    interiorItem: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}
```

- [ ] **Step 2: getSpaceCards 실패 테스트 작성 (red)**

`space.service.spec.ts`의 `describe('getSpace', ...)` 블록 뒤(734줄 이후, 마지막 `});` 직전)에 추가:

```typescript
  describe('getSpaceCards', () => {
    it('returns paginated cards with reply/comment counts ordered by recent', async () => {
      const cardRow = {
        id: 10,
        templateId: 3,
        order: 7,
        createdAt: new Date('2026-03-08T01:00:00.000Z'),
        _count: { replies: 2, comments: 5 },
      };
      prisma.card.findMany.mockResolvedValue([cardRow]);
      prisma.card.count.mockResolvedValue(13);
      prisma.$transaction.mockResolvedValue([[cardRow], 13]);

      const result = await service.getSpaceCards('space-1', { page: 2 });

      expect(result).toEqual({
        items: [
          {
            id: 10,
            templateId: 3,
            order: 7,
            createdAt: new Date('2026-03-08T01:00:00.000Z'),
            replyCount: 2,
            commentCount: 5,
          },
        ],
        totalCount: 13,
        pageInfo: { totalPage: 2 },
      });
      expect(prisma.card.findMany).toHaveBeenCalledWith({
        where: { spaceId: 'space-1' },
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: 10,
        take: 10,
        select: {
          id: true,
          templateId: true,
          order: true,
          createdAt: true,
          _count: { select: { replies: true, comments: true } },
        },
      });
    });
  });
```

> `service` 타입 헬퍼(34-54줄)에 `getSpaceCards`가 없어 컴파일 에러가 날 수 있으니, 34줄 `SpaceService` 타입에 메서드 시그니처를 추가한다:
> ```typescript
>     getSpaceCards: (id: string, query: { page?: number }) => Promise<unknown>;
> ```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
Expected: FAIL — `service.getSpaceCards is not a function`.

- [ ] **Step 4: 서비스에 getSpaceCards 구현**

`space.service.ts`의 `enrichSpaceDetail` 메서드 뒤(412줄, 클래스 닫는 `}` 직전)에 페이지네이션 헬퍼와 메서드를 추가:

```typescript
  private buildPage(page?: number) {
    const current = Math.max(page || 1, 1);
    const offset = 10;
    return { current, offset, skip: (current - 1) * offset };
  }

  async getSpaceCards(id: string, query: { page?: number }) {
    const { offset, skip } = this.buildPage(query.page);
    const where: Prisma.CardWhereInput = { spaceId: id };
    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.card.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip,
        take: offset,
        select: {
          id: true,
          templateId: true,
          order: true,
          createdAt: true,
          _count: { select: { replies: true, comments: true } },
        },
      }),
      this.prisma.card.count({ where }),
    ]);
    return {
      items: items.map(({ _count, ...card }) => ({
        ...card,
        replyCount: _count.replies,
        commentCount: _count.comments,
      })),
      totalCount,
      pageInfo: { totalPage: Math.ceil(totalCount / offset) },
    };
  }
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: 컨트롤러 라우트 추가**

`space.controller.ts`의 `getSpace`(41-46줄) 뒤에 추가 (`:id` 정적 라우트가 `:id/cards`보다 위에 있어도 Nest는 더 구체적 경로를 매칭하지만, 명확성을 위해 `:id` 라우트 위에 배치 권장 — 여기서는 `getSpace` 아래 추가 후 빌드로 검증):

```typescript
  @TypedRoute.Get(':id/cards')
  async getSpaceCards(@TypedParam('id') id: string, @TypedQuery() query: SpaceTabQuery) {
    return (await this.spaceService.getSpaceCards(id, query)) as any;
  }
```

그리고 import에 `SpaceTabQuery` 추가:

```typescript
import { SearchSpacesParams, SpaceTabQuery } from './space.interface';
```

- [ ] **Step 7: 빌드(타입+라우트) 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn build`
Expected: 성공.

- [ ] **Step 8: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/space/space.service.ts src/admin/space/space.service.spec.ts src/admin/space/space.controller.ts
git commit -m "feat(admin/space): add GET /admin/space/:id/cards (paginated cards with reply/comment counts)"
```

### Task 2.3: 재화 내역 탭 엔드포인트 (`GET /admin/space/:id/coins`)

**Files:** 동일 3파일. Task 2.2와 동일 구조, 아래 코드로 구현.

- [ ] **Step 1: 실패 테스트 작성 (red)** — `space.service.spec.ts`에 `describe('getSpaceCoins', ...)` 추가:

```typescript
  describe('getSpaceCoins', () => {
    it('returns paginated coin metas with actor profile ordered by recent', async () => {
      const coinRow = {
        id: 99,
        isPaid: true,
        amount: 20,
        isUse: false,
        description: 'reward',
        createdAt: new Date('2026-03-08T03:00:00.000Z'),
        profile: { id: 'profile-1', nickname: 'buddy', user: { id: 'user-1', username: 'ralph' } },
      };
      prisma.coinMeta.findMany.mockResolvedValue([coinRow]);
      prisma.coinMeta.count.mockResolvedValue(5);
      prisma.$transaction.mockResolvedValue([[coinRow], 5]);

      const result = await service.getSpaceCoins('space-1', { page: 1 });

      expect(result).toEqual({
        items: [coinRow],
        totalCount: 5,
        pageInfo: { totalPage: 1 },
      });
      expect(prisma.coinMeta.findMany).toHaveBeenCalledWith({
        where: { spaceId: 'space-1' },
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: 0,
        take: 10,
        select: {
          id: true,
          isPaid: true,
          amount: true,
          isUse: true,
          description: true,
          createdAt: true,
          profile: { select: { id: true, nickname: true, user: { select: { id: true, username: true } } } },
        },
      });
    });
  });
```

`SpaceService` 타입 헬퍼(34줄)에 시그니처 추가:
```typescript
    getSpaceCoins: (id: string, query: { page?: number }) => Promise<unknown>;
```

- [ ] **Step 2: 실패 확인** — Run: `yarn test src/admin/space/space.service.spec.ts` → FAIL.

- [ ] **Step 3: 서비스 구현** — `space.service.ts`에 추가:

```typescript
  async getSpaceCoins(id: string, query: { page?: number }) {
    const { offset, skip } = this.buildPage(query.page);
    const where: Prisma.CoinMetaWhereInput = { spaceId: id };
    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.coinMeta.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip,
        take: offset,
        select: {
          id: true,
          isPaid: true,
          amount: true,
          isUse: true,
          description: true,
          createdAt: true,
          profile: { select: { id: true, nickname: true, user: { select: { id: true, username: true } } } },
        },
      }),
      this.prisma.coinMeta.count({ where }),
    ]);
    return { items, totalCount, pageInfo: { totalPage: Math.ceil(totalCount / offset) } };
  }
```

- [ ] **Step 4: 통과 확인** — Run: `yarn test src/admin/space/space.service.spec.ts` → PASS.

- [ ] **Step 5: 컨트롤러 라우트 추가** — `space.controller.ts`에:

```typescript
  @TypedRoute.Get(':id/coins')
  async getSpaceCoins(@TypedParam('id') id: string, @TypedQuery() query: SpaceTabQuery) {
    return (await this.spaceService.getSpaceCoins(id, query)) as any;
  }
```

- [ ] **Step 6: 빌드 확인** — Run: `yarn build` → 성공.

- [ ] **Step 7: 커밋**

```bash
git add src/admin/space/space.service.ts src/admin/space/space.service.spec.ts src/admin/space/space.controller.ts
git commit -m "feat(admin/space): add GET /admin/space/:id/coins (paginated coin history)"
```

### Task 2.4: 멤버 탭 엔드포인트 (`GET /admin/space/:id/members`)

**Files:** 동일 3파일. profiles 전체 + joinMetas 최신 50건 (페이지네이션 없음).

- [ ] **Step 1: 실패 테스트 (red)** — `describe('getSpaceMembers', ...)` 추가:

```typescript
  describe('getSpaceMembers', () => {
    it('returns all profiles enriched with join metas', async () => {
      const profileRow = {
        id: 'profile-1',
        nickname: 'buddy',
        userId: 'user-1',
        isPremium: true,
        isGoldClub: false,
        disabled: false,
        removed: false,
        removedAt: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        user: { id: 'user-1', username: 'ralph', code: 'AB12' },
        img: { uri: 'https://example.com/a.png' },
      };
      const joinRow = {
        id: 1,
        profileId: 'profile-1',
        userId: 'user-1',
        isAccepted: true,
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
      };
      prisma.space.findUnique.mockResolvedValue({ spaceInfo: { ownerId: 'user-1' } });
      prisma.$transaction.mockResolvedValue([[profileRow], [joinRow]]);

      const result = await service.getSpaceMembers('space-1');

      expect(result).toEqual({
        ownerId: 'user-1',
        profiles: [profileRow],
        joinMetas: [joinRow],
      });
    });
  });
```

`SpaceService` 타입 헬퍼에 시그니처 추가:
```typescript
    getSpaceMembers: (id: string) => Promise<unknown>;
```

- [ ] **Step 2: 실패 확인** — Run: `yarn test src/admin/space/space.service.spec.ts` → FAIL.

- [ ] **Step 3: 서비스 구현** — `space.service.ts`에:

```typescript
  async getSpaceMembers(id: string) {
    const [info, profiles, joinMetas] = await this.prisma.$transaction([
      this.prisma.space.findUnique({ where: { id }, select: { spaceInfo: { select: { ownerId: true } } } }),
      this.prisma.profile.findMany({
        where: { spaceId: id },
        orderBy: { createdAt: Prisma.SortOrder.asc },
        select: {
          id: true,
          nickname: true,
          userId: true,
          isPremium: true,
          isGoldClub: true,
          disabled: true,
          removed: true,
          removedAt: true,
          createdAt: true,
          user: { select: { id: true, username: true, code: true } },
          img: { select: { uri: true } },
        },
      }),
      this.prisma.spaceJoinMeta.findMany({
        where: { spaceId: id },
        orderBy: { createdAt: Prisma.SortOrder.desc },
        take: 50,
        select: { id: true, profileId: true, userId: true, isAccepted: true, createdAt: true },
      }),
    ]);
    return { ownerId: info?.spaceInfo?.ownerId ?? null, profiles, joinMetas };
  }
```

> `createPrismaServiceMock`에 `profile: { findMany: jest.fn() }`를 추가한다(2.1에서 누락 시 보완). 위 `$transaction`은 배열 형태를 mock이 그대로 반환하도록 `prisma.$transaction.mockResolvedValue([...])`로 검증한다. `space.findUnique`는 별도 mock 반환을 위해 테스트에서 `$transaction`이 3요소 배열을 resolve하도록 맞춘다.

수정: 테스트 Step 1의 `$transaction.mockResolvedValue`를 3요소로 교체:
```typescript
      prisma.$transaction.mockResolvedValue([{ spaceInfo: { ownerId: 'user-1' } }, [profileRow], [joinRow]]);
```
그리고 `prisma.space.findUnique.mockResolvedValue(...)` 줄은 제거(트랜잭션이 결과를 반환하므로 불필요).

- [ ] **Step 4: 통과 확인** — Run: `yarn test src/admin/space/space.service.spec.ts` → PASS.

- [ ] **Step 5: 컨트롤러 라우트 추가** — `space.controller.ts`에:

```typescript
  @TypedRoute.Get(':id/members')
  async getSpaceMembers(@TypedParam('id') id: string) {
    return (await this.spaceService.getSpaceMembers(id)) as any;
  }
```

- [ ] **Step 6: 빌드 확인** — Run: `yarn build` → 성공. (`createPrismaServiceMock`에 `profile.findMany` 포함 여부 확인)

- [ ] **Step 7: 커밋**

```bash
git add src/admin/space/space.service.ts src/admin/space/space.service.spec.ts src/admin/space/space.controller.ts
git commit -m "feat(admin/space): add GET /admin/space/:id/members (profiles + recent join metas)"
```

## 프론트 (Phase 2 UI)

> **디자인 준수 (필수):** 모든 프론트 작업은 `DESIGN.md`를 단일 출처로 따른다. 핵심:
> - 표면 = `bg-white border-slate-200/80 shadow-sm`, 카드 `rounded-xl`. 텍스트 최저선 `slate-500`(`slate-400` 텍스트 금지).
> - 색은 의미 신호에만: 재화 사용=`rose-600`/지급=`emerald-600`, 하트=rose·스타=amber, 상태=soft 뱃지. **단순 카운트는 중립 텍스트**(색 뱃지 남발 금지).
> - 8px 간격(`gap-2/4/6`, `p-4/6`, `space-y-6`), `tabular-nums`, lucide 아이콘(이모지 금지).
> - 신규 패턴 즉흥 도입 금지 — shadcn `Tabs`/`Badge`/`Button`·`AdminSideSheetContent`·기존 `space-display` 헬퍼 재사용.

### Task 2.5: 탭 응답 타입 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/types.ts`

- [ ] **Step 1: 타입 추가** — `types.ts` 끝에 추가:

```typescript
export type SearchPageResult<T> = {
  items: T[];
  totalCount: number;
  pageInfo: TotalPageInfo;
};

export type SpaceCardRow = {
  id: number;
  templateId: number;
  order: number;
  createdAt: string;
  replyCount: number;
  commentCount: number;
};

export type SpaceCoinRow = {
  id: number;
  isPaid: boolean;
  amount: number;
  isUse: boolean;
  description?: string | null;
  createdAt: string;
  profile?: { id: string; nickname: string; user?: { id: string; username: string } } | null;
};

export type SpaceMemberRow = {
  id: string;
  nickname: string;
  userId: string;
  isPremium: boolean;
  isGoldClub: boolean;
  disabled: boolean;
  removed: boolean;
  removedAt: string | null;
  createdAt: string;
  user?: { id: string; username: string; code?: string | null };
  img?: { uri: string } | null;
};

export type SpaceJoinMetaRow = {
  id: number;
  profileId: string;
  userId: string;
  isAccepted: boolean;
  createdAt: string;
};

export type SpaceMembersResult = {
  ownerId: string | null;
  profiles: SpaceMemberRow[];
  joinMetas: SpaceJoinMetaRow[];
};
```

- [ ] **Step 2: 타입체크** — Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build` → 성공.

- [ ] **Step 3: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts
git commit -m "feat(space): add detail tab response types"
```

### Task 2.6: 탭 fetch 함수 추가

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/space.ts`

- [ ] **Step 1: 함수 추가** — `space.ts` 끝에 추가:

```typescript
import {
  SearchPageResult,
  SpaceCardRow,
  SpaceCoinRow,
  SpaceMembersResult,
} from './types';

export async function getSpaceCards(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceCardRow>>(`/space/${id}/cards`, { params: { page } });
  return res.data;
}

export async function getSpaceCoins(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceCoinRow>>(`/space/${id}/coins`, { params: { page } });
  return res.data;
}

export async function getSpaceMembers(id: string) {
  const res = await client.get<SpaceMembersResult>(`/space/${id}/members`);
  return res.data;
}
```

> 주의: 기존 `space.ts` 1-2줄의 import에 새 타입을 합치거나 별도 import 문으로 추가한다(파일당 import 중복 없이). 위 import 블록을 파일 상단의 기존 `import { ... } from './types';`와 병합한다.

- [ ] **Step 2: 타입체크** — Run: `yarn build` → 성공.

- [ ] **Step 3: 커밋**

```bash
git add src/client/space.ts
git commit -m "feat(space): add tab fetchers (cards/coins/members)"
```

### Task 2.7: 재사용 탭 목록 컴포넌트

**Files:**
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/tabs/SpaceTabList.tsx`

- [ ] **Step 1: 컴포넌트 작성** — 페이지네이션 + 로딩/빈상태를 처리하는 제네릭 래퍼:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface SpaceTabListProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  page: number;
  totalPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}

function SpaceTabList({
  isLoading,
  isEmpty,
  emptyText,
  page,
  totalPage,
  totalCount,
  onPageChange,
  children,
}: SpaceTabListProps) {
  if (isLoading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (isEmpty) {
    return (
      <Card className='bg-card'>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>{emptyText}</CardContent>
      </Card>
    );
  }
  return (
    <div className='space-y-3'>
      {children}
      <div className='flex items-center justify-between px-1'>
        <div className='text-sm text-muted-foreground'>총 {totalCount.toLocaleString()}건</div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className='h-4 w-4' />
            이전
          </Button>
          <span className='text-sm text-muted-foreground'>
            {page} / {Math.max(totalPage, 1)}
          </span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPage}
          >
            다음
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SpaceTabList;
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `yarn build` → 성공.
```bash
git add src/components/page/space/components/tabs/SpaceTabList.tsx
git commit -m "feat(space): add reusable paginated tab list wrapper"
```

### Task 2.8: 카드/답변 탭 컴포넌트 (레퍼런스 탭)

**Files:**
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/tabs/SpaceCardsTab.tsx`

- [ ] **Step 1: 컴포넌트 작성** — 활성 시에만 fetch(`enabled`), 페이지 상태 보유:

```tsx
import { getSpaceCards } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceTabList from './SpaceTabList';

function SpaceCardsTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['space-cards', spaceId, page],
    queryFn: () => getSpaceCards(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='발급된 카드가 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((card) => (
        <div
          key={card.id}
          className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='min-w-0'>
            <div className='text-sm font-medium text-slate-900'>#{card.order} · 템플릿 {card.templateId}</div>
            <div className='text-xs text-slate-500'>{dayjs(card.createdAt).format('YY.MM.DD HH:mm')}</div>
          </div>
          <div className='shrink-0 text-xs tabular-nums text-slate-500'>
            답변 {card.replyCount} · 댓글 {card.commentCount}
          </div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default SpaceCardsTab;
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `yarn build` → 성공.
```bash
git add src/components/page/space/components/tabs/SpaceCardsTab.tsx
git commit -m "feat(space): add cards/replies detail tab"
```

### Task 2.9: 재화 내역 탭 컴포넌트

**Files:**
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/tabs/SpaceCoinsTab.tsx`

- [ ] **Step 1: 컴포넌트 작성** — `SpaceDetailContent`의 재화 표기 규칙(isUse/amount 부호) 재사용:

```tsx
import { getSpaceCoins } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceTabList from './SpaceTabList';

function SpaceCoinsTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['space-coins', spaceId, page],
    queryFn: () => getSpaceCoins(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='재화 이용 내역이 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((meta) => {
        const isSpend = meta.isUse || meta.amount < 0;
        const actor = meta.profile?.nickname ?? meta.profile?.user?.username ?? '-';
        return (
          <div key={meta.id} className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
            <Badge variant={meta.isPaid ? 'softWarning' : 'softDanger'} className='w-11 shrink-0 justify-center'>
              {meta.isPaid ? '스타' : '하트'}
            </Badge>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-slate-900'>{actor}</div>
              <div className='truncate text-xs text-slate-500'>
                {isSpend ? '사용' : '지급'} · {meta.description || '사유 없음'}
              </div>
            </div>
            <div className='shrink-0 text-right'>
              <div className={cn('text-sm font-bold tabular-nums', isSpend ? 'text-rose-600' : 'text-emerald-600')}>
                {isSpend ? '-' : '+'}{Math.abs(meta.amount)}
              </div>
              <div className='text-[11px] text-slate-500'>{dayjs(meta.createdAt).format('MM.DD HH:mm')}</div>
            </div>
          </div>
        );
      })}
    </SpaceTabList>
  );
}

export default SpaceCoinsTab;
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `yarn build` → 성공.
```bash
git add src/components/page/space/components/tabs/SpaceCoinsTab.tsx
git commit -m "feat(space): add coin history detail tab"
```

### Task 2.10: 멤버 탭 컴포넌트

**Files:**
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/tabs/SpaceMembersTab.tsx`

- [ ] **Step 1: 컴포넌트 작성** — profiles 전체 + 가입/초대 이력:

```tsx
import { getSpaceMembers } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function SpaceMembersTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => getSpaceMembers(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className='space-y-6'>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>멤버 ({data.profiles.length})</h3>
        {data.profiles.map((p) => (
          <div key={p.id} className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='truncate font-medium text-slate-900'>{p.nickname}</span>
                {p.userId === data.ownerId ? <Badge variant='softNeutral'>OWNER</Badge> : null}
                {p.isPremium ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
                {p.isGoldClub ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
                {p.disabled ? <Badge variant='softNeutral'>비활성</Badge> : null}
                {p.removed ? <Badge variant='softDanger'>탈퇴</Badge> : null}
              </div>
              <div className='truncate text-xs text-slate-500'>
                @{p.user?.username ?? '-'}{p.user?.code ? ` · #${p.user.code}` : ''}
              </div>
            </div>
            <div className='shrink-0 text-xs text-slate-500'>{dayjs(p.createdAt).format('YY.MM.DD')}</div>
          </div>
        ))}
      </section>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>가입/초대 이력 ({data.joinMetas.length})</h3>
        {data.joinMetas.length ? (
          data.joinMetas.map((j) => (
            <div key={j.id} className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm'>
              <span className='font-mono text-xs text-slate-600'>{j.userId}</span>
              <div className='flex items-center gap-2'>
                <Badge variant={j.isAccepted ? 'softSuccess' : 'softWarning'}>{j.isAccepted ? '수락' : '대기'}</Badge>
                <span className='text-xs text-slate-500'>{dayjs(j.createdAt).format('YY.MM.DD HH:mm')}</span>
              </div>
            </div>
          ))
        ) : (
          <Card className='bg-card'>
            <CardContent className='py-6 text-center text-sm text-muted-foreground'>가입/초대 이력이 없습니다.</CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export default SpaceMembersTab;
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `yarn build` → 성공.
```bash
git add src/components/page/space/components/tabs/SpaceMembersTab.tsx
git commit -m "feat(space): add members detail tab"
```

### Task 2.11: SpaceDetailSheet를 Tabs 컨테이너로 개편

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/space/components/SpaceDetailSheet.tsx`

- [ ] **Step 1: 전체 교체** — 상단 탭바 + 탭별 lazy mount. 개요는 기존 `SpaceDetailContent` 유지:

```tsx
import { getSpace } from '@/client/space';
import { Space, SpaceDetail } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import SpaceDetailContent from './SpaceDetailContent';
import SpaceCardsTab from './tabs/SpaceCardsTab';
import SpaceCoinsTab from './tabs/SpaceCoinsTab';
import SpaceMembersTab from './tabs/SpaceMembersTab';

interface SpaceDetailSheetProps {
  open: boolean;
  space: Space | null;
  onClose: () => void;
  copyId: (id: string) => void;
}

function SpaceDetailSheet({ open, space, onClose, copyId }: SpaceDetailSheetProps) {
  const spaceId = space?.id;
  const [tab, setTab] = useState('overview');
  const { data, isLoading } = useQuery({
    queryKey: ['space-detail', spaceId],
    queryFn: () => getSpace(spaceId as string),
    enabled: open && !!spaceId,
  });
  const detail: SpaceDetail | null = data ?? (space ? ({ ...space, recentCoinMetas: [] } as SpaceDetail) : null);
  if (!detail) return null;
  const id = detail.id;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminSideSheetContent title={detail.spaceInfo?.name ?? '공간 상세'} size='xl'>
        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          {/* 기본 shadcn 세그먼트 룩 유지 + 좁은 폭에서는 가로 스크롤(줄바꿈으로 세그먼트가 깨지지 않게) */}
          <div className='mb-4 overflow-x-auto'>
            <TabsList>
              <TabsTrigger value='overview'>개요</TabsTrigger>
              <TabsTrigger value='members'>멤버</TabsTrigger>
              <TabsTrigger value='cards'>카드/답변</TabsTrigger>
              <TabsTrigger value='coins'>재화 내역</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview'>
            {isLoading && !data ? (
              <div className='flex min-h-[320px] items-center justify-center'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            ) : (
              <SpaceDetailContent detail={detail} copyId={copyId} />
            )}
          </TabsContent>
          <TabsContent value='members'>
            <SpaceMembersTab spaceId={id} active={tab === 'members'} />
          </TabsContent>
          <TabsContent value='cards'>
            <SpaceCardsTab spaceId={id} active={tab === 'cards'} />
          </TabsContent>
          <TabsContent value='coins'>
            <SpaceCoinsTab spaceId={id} active={tab === 'coins'} />
          </TabsContent>
        </Tabs>
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default SpaceDetailSheet;
```

- [ ] **Step 2: 탭 전환 시 상태 초기화 보강(선택)** — 다른 공간을 열면 `tab`이 유지되는 문제 방지를 위해 `open`이 false→true로 바뀔 때 `overview`로 리셋. 필요 시 `useEffect`로 `spaceId` 변경 시 `setTab('overview')` 추가:

```tsx
import { useEffect, useState } from 'react';
// ...
  useEffect(() => {
    setTab('overview');
  }, [spaceId]);
```

- [ ] **Step 3: 타입체크 + 린트**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build`
Expected: 성공.

- [ ] **Step 4: 수동 확인 체크리스트(앱 실행)**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn dev` 후 `/space/list`에서 검색→상세 열기.
- 개요 탭: 기존과 동일하게 렌더.
- 멤버/카드/재화 탭: 클릭 시에만 네트워크 호출(Network 탭에서 `/space/:id/cards` 등 확인), 페이지네이션 동작.

- [ ] **Step 5: 커밋**

```bash
git add src/components/page/space/components/SpaceDetailSheet.tsx
git commit -m "feat(space): convert detail side panel into tabbed view (overview/members/cards/coins)"
```

---

# Phase 3 — 보조 4탭

> 각 엔드포인트는 Task 2.2(cards) 레퍼런스 패턴을 따른다: ① spec 실패 테스트 → ② 실패 확인 → ③ 서비스 구현 → ④ 통과 → ⑤ 컨트롤러 라우트 → ⑥ 빌드 → ⑦ 커밋. 각 Task의 select/where/매핑만 아래에 명시한다.

### Task 3.1: 일기 탭 엔드포인트 (`GET /admin/space/:id/diaries`)

**Files:** 백엔드 3파일.

- [ ] **Step 1: 서비스 메서드** — `space.service.ts`에 추가:

```typescript
  async getSpaceDiaries(id: string, query: { page?: number }) {
    const { offset, skip } = this.buildPage(query.page);
    const where: Prisma.DiaryWhereInput = { spaceId: id };
    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.diary.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip,
        take: offset,
        select: {
          id: true,
          date: true,
          emotion: true,
          content: true,
          createdAt: true,
          profile: { select: { id: true, nickname: true } },
          _count: { select: { comments: true, likeMetas: true } },
        },
      }),
      this.prisma.diary.count({ where }),
    ]);
    return {
      items: items.map(({ _count, content, ...d }) => ({
        ...d,
        content: content.length > 120 ? `${content.slice(0, 120)}…` : content,
        commentCount: _count.comments,
        likeCount: _count.likeMetas,
      })),
      totalCount,
      pageInfo: { totalPage: Math.ceil(totalCount / offset) },
    };
  }
```

- [ ] **Step 2: 테스트** — `describe('getSpaceDiaries')`에서 `prisma.diary.findMany`가 위 select로 호출되고, `content` 절삭·`commentCount`/`likeCount` 매핑을 검증(짧은 content는 그대로). `SpaceService` 타입 헬퍼에 `getSpaceDiaries` 시그니처 추가.

- [ ] **Step 3: 컨트롤러** — `@TypedRoute.Get(':id/diaries')` → `getSpaceDiaries(id, query)`.

- [ ] **Step 4: 빌드 + 커밋** — `feat(admin/space): add GET /admin/space/:id/diaries`.

### Task 3.2: 일정 탭 엔드포인트 (`GET /admin/space/:id/schedules`)

- [ ] **Step 1: 서비스 메서드**:

```typescript
  async getSpaceSchedules(id: string, query: { page?: number }) {
    const { offset, skip } = this.buildPage(query.page);
    const where: Prisma.ScheduleWhereInput = { spaceId: id };
    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.schedule.findMany({
        where,
        orderBy: { startedAt: Prisma.SortOrder.desc },
        skip,
        take: offset,
        select: {
          id: true,
          title: true,
          startedAt: true,
          endedAt: true,
          color: true,
          intervalType: true,
          createdAt: true,
          profile: { select: { id: true, nickname: true } },
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);
    return { items, totalCount, pageInfo: { totalPage: Math.ceil(totalCount / offset) } };
  }
```

- [ ] **Step 2: 테스트** — `prisma.schedule.findMany` 호출 인자/매핑 검증. 타입 헬퍼에 시그니처 추가.
- [ ] **Step 3: 컨트롤러** — `@TypedRoute.Get(':id/schedules')`.
- [ ] **Step 4: 빌드 + 커밋** — `feat(admin/space): add GET /admin/space/:id/schedules`.

### Task 3.3: 펫·인테리어 탭 엔드포인트 (`GET /admin/space/:id/pet-interior`, 단건)

- [ ] **Step 1: 서비스 메서드** — 경계가 작아 단건 병렬 조회:

```typescript
  async getSpacePetInterior(id: string) {
    const [pet, customs, rooms, interiorItems] = await this.prisma.$transaction([
      this.prisma.pet.findUnique({
        where: { spaceId: id },
        select: { type: true, level: true, exp: true, updatedAt: true },
      }),
      this.prisma.spacePetCustom.findMany({
        where: { spaceId: id },
        select: { id: true, petCustomTemplateId: true, customType: true, isEquipped: true },
      }),
      this.prisma.room.findMany({
        where: { spaceId: id },
        orderBy: { order: Prisma.SortOrder.asc },
        select: { id: true, category: true, type: true, name: true, order: true },
      }),
      this.prisma.interiorItem.findMany({
        where: { spaceId: id },
        select: { id: true, interiorTemplateId: true, createdAt: true },
      }),
    ]);
    return { pet, customs, rooms, interiorItems };
  }
```

- [ ] **Step 2: 테스트** — 4개 모델 호출 검증. 타입 헬퍼에 시그니처 추가.
- [ ] **Step 3: 컨트롤러** — `@TypedRoute.Get(':id/pet-interior')` (query 없음).
- [ ] **Step 4: 빌드 + 커밋** — `feat(admin/space): add GET /admin/space/:id/pet-interior`.

### Task 3.4: 활동로그 탭 엔드포인트 (`GET /admin/space/:id/activity`)

- [ ] **Step 1: 서비스 메서드** — 주 목록=접속, 보조=광고 최신 20:

```typescript
  async getSpaceActivity(id: string, query: { page?: number }) {
    const { offset, skip } = this.buildPage(query.page);
    const where: Prisma.UserAccessMetaWhereInput = { spaceId: id };
    const [accessItems, totalCount, ads] = await this.prisma.$transaction([
      this.prisma.userAccessMeta.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip,
        take: offset,
        select: { id: true, userId: true, heart: true, createdAt: true },
      }),
      this.prisma.userAccessMeta.count({ where }),
      this.prisma.adsMeta.findMany({
        where: { spaceId: id },
        orderBy: { createdAt: Prisma.SortOrder.desc },
        take: 20,
        select: { id: true, userId: true, description: true, createdAt: true },
      }),
    ]);
    return {
      items: accessItems,
      totalCount,
      pageInfo: { totalPage: Math.ceil(totalCount / offset) },
      recentAds: ads,
    };
  }
```

- [ ] **Step 2: 테스트** — 접속 페이지네이션 + `recentAds` 동봉 검증. 타입 헬퍼에 시그니처 추가.
- [ ] **Step 3: 컨트롤러** — `@TypedRoute.Get(':id/activity')`.
- [ ] **Step 4: 빌드 + 커밋** — `feat(admin/space): add GET /admin/space/:id/activity`.

### Task 3.5: 프론트 — 보조 4탭 타입/fetch/컴포넌트

**Files:**
- Modify: `src/client/types.ts`, `src/client/space.ts`
- Create: `src/components/page/space/components/tabs/SpaceDiariesTab.tsx`, `SpaceSchedulesTab.tsx`, `SpacePetInteriorTab.tsx`, `SpaceActivityTab.tsx`
- Modify: `src/components/page/space/components/SpaceDetailSheet.tsx`

- [ ] **Step 1: 타입 추가** — `types.ts`에 각 행 타입 추가:

```typescript
export type SpaceDiaryRow = {
  id: number;
  date: string;
  emotion: string;
  content: string;
  createdAt: string;
  profile?: { id: string; nickname: string };
  commentCount: number;
  likeCount: number;
};

export type SpaceScheduleRow = {
  id: number;
  title: string;
  startedAt: string;
  endedAt: string;
  color: string;
  intervalType: string;
  createdAt: string;
  profile?: { id: string; nickname: string };
};

export type SpacePetInteriorResult = {
  pet: { type: string | null; level: number; exp: number; updatedAt: string } | null;
  customs: { id: number; petCustomTemplateId: number; customType: string; isEquipped: boolean }[];
  rooms: { id: number; category: string; type: string; name: string; order: number }[];
  interiorItems: { id: number; interiorTemplateId: number; createdAt: string }[];
};

export type SpaceAccessRow = { id: number; userId: string; heart: number; createdAt: string };
export type SpaceAdsRow = { id: number; userId: string; description: string | null; createdAt: string };
export type SpaceActivityResult = SearchPageResult<SpaceAccessRow> & { recentAds: SpaceAdsRow[] };
```

- [ ] **Step 2: fetch 함수** — `space.ts`에 추가:

```typescript
export async function getSpaceDiaries(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceDiaryRow>>(`/space/${id}/diaries`, { params: { page } });
  return res.data;
}
export async function getSpaceSchedules(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceScheduleRow>>(`/space/${id}/schedules`, { params: { page } });
  return res.data;
}
export async function getSpacePetInterior(id: string) {
  const res = await client.get<SpacePetInteriorResult>(`/space/${id}/pet-interior`);
  return res.data;
}
export async function getSpaceActivity(id: string, page: number) {
  const res = await client.get<SpaceActivityResult>(`/space/${id}/activity`, { params: { page } });
  return res.data;
}
```
(상단 `from './types'` import에 새 타입 병합.)

- [ ] **Step 3: 4개 탭 컴포넌트 생성** — 각각 Task 2.8(`SpaceCardsTab`) 구조를 따른다: `useState(page)` + `useQuery({ enabled: active && !!spaceId })` + `SpaceTabList` 래핑(단, `pet-interior`는 단건이라 `SpaceMembersTab`처럼 섹션 렌더). 표시 필드:
  - `SpaceDiariesTab`: emotion 뱃지 + content 미리보기 + `댓글 {commentCount}`·`좋아요 {likeCount}` + 날짜.
  - `SpaceSchedulesTab`: title + `startedAt~endedAt`(dayjs `YY.MM.DD`) + intervalType 뱃지.
  - `SpacePetInteriorTab`: pet `Lv.{level}·EXP {exp}` + 장착 커스텀 수 + 방 목록(category/name) + 인테리어 아이템 수.
  - `SpaceActivityTab`: 접속 목록(userId + heart + 시각) 페이지네이션 + 하단 "최근 광고 시청 20건" 보조 섹션(recentAds).

- [ ] **Step 4: SpaceDetailSheet에 4개 탭 추가** — `TabsList`에 트리거 4개, `TabsContent` 4개 추가:

```tsx
            <TabsTrigger value='diaries'>일기</TabsTrigger>
            <TabsTrigger value='schedules'>일정</TabsTrigger>
            <TabsTrigger value='pet'>펫/인테리어</TabsTrigger>
            <TabsTrigger value='activity'>활동로그</TabsTrigger>
```
```tsx
          <TabsContent value='diaries'><SpaceDiariesTab spaceId={id} active={tab === 'diaries'} /></TabsContent>
          <TabsContent value='schedules'><SpaceSchedulesTab spaceId={id} active={tab === 'schedules'} /></TabsContent>
          <TabsContent value='pet'><SpacePetInteriorTab spaceId={id} active={tab === 'pet'} /></TabsContent>
          <TabsContent value='activity'><SpaceActivityTab spaceId={id} active={tab === 'activity'} /></TabsContent>
```
import 4개 추가.

- [ ] **Step 5: 빌드 + 수동 확인 + 커밋**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build` → 성공.
```bash
git add src/client/types.ts src/client/space.ts src/components/page/space/components/SpaceDetailSheet.tsx src/components/page/space/components/tabs/SpaceDiariesTab.tsx src/components/page/space/components/tabs/SpaceSchedulesTab.tsx src/components/page/space/components/tabs/SpacePetInteriorTab.tsx src/components/page/space/components/tabs/SpaceActivityTab.tsx
git commit -m "feat(space): add diaries/schedules/pet-interior/activity detail tabs"
```

---

## 최종 검증

- [ ] 백엔드 전체 테스트: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/admin/space/space.service.spec.ts` → 전부 PASS.
- [ ] 백엔드 빌드: `yarn build` → 성공(7개 신규 라우트 컴파일).
- [ ] 프론트 빌드: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && yarn build` → 성공.
- [ ] 프론트 린트: `yarn lint` → 통과.
- [ ] 수동: `/space/list` 검색이 키별로 동작(공간ID·사용자명 정확 일치), 검색 결과 Active/Inactive가 행마다 다르게 표시, 상세 패널 8개 탭 lazy-load + 페이지네이션 동작.

## 라우트 순서 주의 (Nest)
`space.controller.ts`에 `@TypedRoute.Get(':id')`와 `@TypedRoute.Get(':id/cards')` 등이 공존한다. NestJS 라우터는 `/:id/cards`를 `/:id`보다 구체적으로 매칭하므로 일반적으로 충돌하지 않으나, 빌드 후 실제 호출(`yarn dev` + curl 또는 브라우저)로 각 `/:id/<tab>` 경로가 200을 반환하는지 1회 확인한다.
