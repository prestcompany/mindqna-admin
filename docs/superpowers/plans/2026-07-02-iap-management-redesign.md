# 인앱 결제 관리 통합 재설계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인앱 결제 내역·인앱 상품 관리를 하나의 "인앱 결제 관리" 화면(탭 2개)으로 통합하고, 구조화된 결제 상세 패널(영수증 뷰어 + 이용권/스토어 실시간 + 운영 액션)을 추가한다.

**Architecture:** 서버(`mindqna-server`)에 결제 단건 상세 API와 이용권 목록 필터를 추가한 뒤, 프론트(`mindqna-admin`)에서 유저 패널의 결제 관련 컴포넌트를 `shared/purchase/`로 추출해 신규 `PurchaseDetailSheet`와 공유한다. 마지막으로 탭 컨테이너로 두 목록을 통합하고 메뉴를 정리한다.

**Tech Stack:** Next.js 13(pages) + shadcn/ui + TanStack Query (프론트), NestJS + nestia(TypedRoute) + Prisma + Jest (서버)

**Spec:** `docs/superpowers/specs/2026-07-02-iap-management-redesign-design.md`

## Global Constraints

- 프론트 검증: `npx tsc --noEmit` + `npm run lint` (AGENTS.md 기준. 프론트 컴포넌트 테스트 러너 없음 — 기존 프로젝트 TS 에러 5건은 무시: `Dashboard.tsx`, `GameRankingList.tsx`, `GameRewardList.tsx`, `square-library/columns.tsx`, `useAdsTest.ts`)
- 서버 검증: `npx jest src/admin/product/product.service.spec.ts` + `npx tsc --noEmit`
- Badge는 `soft*` variant(softSuccess/softDanger/softNeutral/softInfo/softWarning)만 사용 (DESIGN.md)
- 우측 패널은 `AdminSideSheetContent` 재사용, 사이즈 토큰 `sm|md|lg|xl|full`
- 옵셔널 필드(가격, username, 이용권 매칭)는 **값이 있을 때만 렌더**
- 프론트 repo: `/Users/gargoyle92/Documents/frontend/mindqna-admin`, 서버 repo: `/Users/gargoyle92/Documents/backend/mindqna-server` — 각 태스크의 커밋은 해당 repo에서 수행
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 추가

---

### Task 1: [서버] getPurchaseDetail 서비스 메서드

**Files:**
- Modify: `src/admin/product/types/product.types.ts`
- Modify: `src/admin/product/product.service.ts`
- Test: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Consumes: Prisma 모델 `purchaseMeta`, `user`, `premiumTicket`, `goldClub`, `purchaseHistoryMeta`
- Produces: `ProductAdminService.getPurchaseDetail(id: number): Promise<PurchaseDetailResult>` — Task 2의 컨트롤러가 사용

- [ ] **Step 1: 타입 추가**

`src/admin/product/types/product.types.ts` 끝에 추가:

```ts
export type PurchaseRelatedTicket = {
  type: 'premium' | 'goldclub';
  id: number;
  productId: string;
  platform: string;
  dueAt: Date | null;
  isActive: boolean;
  isProduction: boolean;
  createdAt: Date;
};

export type PurchaseDetailResult = PurchaseMetaWithUsername & {
  price: string | null;
  isSubscribe: boolean | null;
  relatedTickets: PurchaseRelatedTicket[];
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/admin/product/product.service.spec.ts`의 require 타입 선언에 `getPurchaseDetail: (id: number) => Promise<any>;` 를 추가하고, describe 블록 안에 추가:

```ts
describe('getPurchaseDetail', () => {
  const basePurchase = {
    id: 1,
    userId: 'user-1',
    platform: 'IOS',
    productId: 'com.mindqna.premium',
    transactionId: 'txn-100',
    isSuccess: true,
    isExpired: false,
    isProduction: true,
    log: null,
    receipt: '{"raw":true}',
    createdAt: new Date('2026-06-01T10:00:00Z'),
    completedAt: new Date('2026-06-01T10:00:05Z'),
  };

  it('결제 건이 없으면 NotFound를 던진다', async () => {
    prisma.purchaseMeta.findUnique.mockResolvedValue(null);

    await expect(service.getPurchaseDetail(999)).rejects.toThrow();
  });

  it('username을 매핑하고 transactionId가 일치하는 이용권만 relatedTickets에 담는다', async () => {
    prisma.purchaseMeta.findUnique.mockResolvedValue(basePurchase);
    prisma.user.findUnique.mockResolvedValue({ username: 'tester' });
    prisma.premiumTicket.findMany.mockResolvedValue([
      { id: 10, transactionId: 'txn-100', productId: 'com.mindqna.premium', platform: 'IOS', dueAt: null, isActive: true, isProduction: true, createdAt: new Date() },
      { id: 11, transactionId: 'txn-other', productId: 'com.mindqna.premium', platform: 'IOS', dueAt: null, isActive: true, isProduction: true, createdAt: new Date() },
    ]);
    prisma.goldClub.findMany.mockResolvedValue([]);
    prisma.purchaseHistoryMeta.findMany.mockResolvedValue([]);

    const result = await service.getPurchaseDetail(1);

    expect(result.username).toBe('tester');
    expect(result.relatedTickets).toHaveLength(1);
    expect(result.relatedTickets[0]).toMatchObject({ type: 'premium', id: 10 });
    expect(result.price).toBeNull();
  });

  it('유저가 삭제된 경우 username은 빈 문자열이다', async () => {
    prisma.purchaseMeta.findUnique.mockResolvedValue(basePurchase);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.premiumTicket.findMany.mockResolvedValue([]);
    prisma.goldClub.findMany.mockResolvedValue([]);
    prisma.purchaseHistoryMeta.findMany.mockResolvedValue([]);

    const result = await service.getPurchaseDetail(1);

    expect(result.username).toBe('');
  });

  it('가격은 ±24시간 내 최근접 PurchaseHistoryMeta에서 가져오고, 밖이면 null', async () => {
    prisma.purchaseMeta.findUnique.mockResolvedValue(basePurchase);
    prisma.user.findUnique.mockResolvedValue({ username: 'tester' });
    prisma.premiumTicket.findMany.mockResolvedValue([]);
    prisma.goldClub.findMany.mockResolvedValue([]);
    prisma.purchaseHistoryMeta.findMany.mockResolvedValue([
      { id: 1, price: '₩4,400', isSubscribe: true, createdAt: new Date('2026-06-01T09:00:00Z') }, // 1시간 차
      { id: 2, price: '₩9,900', isSubscribe: false, createdAt: new Date('2026-06-01T10:00:02Z') }, // 2초 차 → 최근접
      { id: 3, price: '₩1,100', isSubscribe: false, createdAt: new Date('2026-05-20T10:00:00Z') }, // 24h 밖
    ]);

    const result = await service.getPurchaseDetail(1);

    expect(result.price).toBe('₩9,900');
    expect(result.isSubscribe).toBe(false);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/product/product.service.spec.ts -t getPurchaseDetail`
Expected: FAIL — `service.getPurchaseDetail is not a function`

(참고: `createPrismaServiceMock`이 `purchaseMeta.findUnique`/`goldClub.findMany`를 노출하지 않으면 `src/admin/test-utils/create-prisma-service.mock.ts`에 같은 패턴으로 mock 메서드를 추가한다.)

- [ ] **Step 4: 서비스 구현**

`src/admin/product/product.service.ts`에 추가 (import에 `PurchaseDetailResult`, `PurchaseRelatedTicket` 추가):

```ts
async getPurchaseDetail(id: number): Promise<PurchaseDetailResult> {
  const purchase = await this.prisma.purchaseMeta.findUnique({ where: { id } });
  if (!purchase) throw NotFoundException();

  const [user, premiumTickets, goldClubs, histories] = await Promise.all([
    this.prisma.user.findUnique({ where: { id: purchase.userId }, select: { username: true } }),
    // PremiumTicket.transactionId는 LongText라 where 비교 시 풀스캔 위험 → 유저 단위로 가져와 메모리 비교
    this.prisma.premiumTicket.findMany({ where: { ownerId: purchase.userId }, orderBy: { createdAt: 'desc' } }),
    this.prisma.goldClub.findMany({ where: { userId: purchase.userId }, orderBy: { createdAt: 'desc' } }),
    this.prisma.purchaseHistoryMeta.findMany({
      where: { userId: purchase.userId, productId: purchase.productId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const toRelated = (type: PurchaseRelatedTicket['type']) => (t: {
    id: number; productId: string; platform: string; dueAt: Date | null; isActive: boolean; isProduction: boolean; createdAt: Date;
  }): PurchaseRelatedTicket => ({
    type,
    id: t.id,
    productId: t.productId,
    platform: t.platform,
    dueAt: t.dueAt,
    isActive: t.isActive,
    isProduction: t.isProduction,
    createdAt: t.createdAt,
  });

  const relatedTickets = [
    ...premiumTickets.filter((t) => t.transactionId === purchase.transactionId).map(toRelated('premium')),
    ...goldClubs.filter((g) => g.transactionId === purchase.transactionId).map(toRelated('goldclub')),
  ];

  // PurchaseHistoryMeta에는 transactionId가 없어 (userId, productId) + 생성시각 근접(±24h)으로 best-effort 매칭
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nearest = histories
    .map((h) => ({ h, gap: Math.abs(h.createdAt.getTime() - purchase.createdAt.getTime()) }))
    .filter((x) => x.gap <= DAY_MS)
    .sort((a, b) => a.gap - b.gap)[0];

  return {
    ...purchase,
    username: user?.username ?? '',
    price: nearest?.h.price ?? null,
    isSubscribe: nearest ? nearest.h.isSubscribe : null,
    relatedTickets,
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx jest src/admin/product/product.service.spec.ts`
Expected: PASS (기존 테스트 포함 전체)

- [ ] **Step 6: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
git add src/admin/product/ src/admin/test-utils/
git commit -m "feat(admin): add purchase detail lookup with related tickets and price matching"
```

---

### Task 2: [서버] GET /purchase/:id 라우트

**Files:**
- Modify: `src/admin/admin.controller.ts` (GET /purchase 라우트 뒤, 268행 부근)

**Interfaces:**
- Consumes: Task 1의 `productAdminService.getPurchaseDetail(id)`
- Produces: `GET /purchase/:id` → `PurchaseDetailResult` JSON — Task 5의 프론트 클라이언트가 사용

- [ ] **Step 1: 라우트 추가**

기존 `getPurchaseMetas` 라우트 아래에 추가:

```ts
@TypedRoute.Get('/purchase/:id')
async getPurchaseDetail(@TypedParam('id') id: number) {
  const result = await this.productAdminService.getPurchaseDetail(id);

  return result as any;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/admin/admin.controller.ts
git commit -m "feat(admin): expose GET /purchase/:id endpoint"
```

---

### Task 3: [서버] getProducts 필터 확장

**Files:**
- Modify: `src/admin/product/types/product.types.ts` (`GetProductsParams`)
- Modify: `src/admin/product/product.service.ts` (`getProducts`)
- Modify: `src/admin/admin.controller.ts` (`GET /products` 쿼리 타입)
- Test: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Produces: `GET /products?page&search&isActive&platform&isProduction&isSubscribe` — Task 5/9의 프론트가 사용. 기존 파라미터만 보내는 호출은 동작 불변(하위 호환)

- [ ] **Step 1: 실패하는 테스트 작성**

기존 `getProducts` describe(없으면 신설)에 추가:

```ts
it('isActive/platform/isProduction/isSubscribe 필터를 AND로 결합한다', async () => {
  prisma.premiumTicket.findMany.mockResolvedValue([]);
  prisma.premiumTicket.count.mockResolvedValue(0);

  await service.getProducts({ page: 1, isActive: true, platform: 'IOS', isProduction: true, isSubscribe: true });

  expect(prisma.premiumTicket.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        AND: [{ isActive: true }, { platform: 'IOS' }, { isProduction: true }, { dueAt: { not: null } }],
      },
    }),
  );
});

it('isSubscribe=false는 dueAt이 null인 소모품만 조회한다', async () => {
  prisma.premiumTicket.findMany.mockResolvedValue([]);
  prisma.premiumTicket.count.mockResolvedValue(0);

  await service.getProducts({ page: 1, isSubscribe: false });

  expect(prisma.premiumTicket.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { AND: [{ dueAt: null }] } }),
  );
});
```

spec 상단 require 타입의 `getProducts` 파라미터도 `{ page: number; search?: string; isActive?: boolean; platform?: 'IOS' | 'AOS' | 'EVENT'; isProduction?: boolean; isSubscribe?: boolean }`로 갱신.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/admin/product/product.service.spec.ts -t 필터`
Expected: FAIL — where 조건 불일치

- [ ] **Step 3: 타입/서비스/컨트롤러 구현**

`GetProductsParams` 교체:

```ts
export type GetProductsParams = {
  page: number;
  search?: string;
  isActive?: boolean;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  isProduction?: boolean;
  isSubscribe?: boolean;
};
```

`getProducts`의 where 구성 교체:

```ts
async getProducts(
  params: GetProductsParams,
): Promise<{ items: (PremiumTicket & { owner: { username: string } | null })[]; pageInfo: PageInfo }> {
  const { page, search, isActive, platform, isProduction, isSubscribe } = params;
  const offset = 10;
  const trimmedSearch = search?.trim();

  const conditions: Record<string, unknown>[] = [];
  if (trimmedSearch) {
    conditions.push({
      OR: [
        { productId: { contains: trimmedSearch } },
        { transactionId: { contains: trimmedSearch } },
        { owner: { username: { contains: trimmedSearch } } },
      ],
    });
  }
  if (isActive !== undefined) conditions.push({ isActive });
  if (platform) conditions.push({ platform });
  if (isProduction !== undefined) conditions.push({ isProduction });
  if (isSubscribe !== undefined) conditions.push({ dueAt: isSubscribe ? { not: null } : null });

  const where = conditions.length ? { AND: conditions } : undefined;

  const items = await this.prisma.premiumTicket.findMany({
    orderBy: { createdAt: 'desc' },
    take: offset,
    skip: (page - 1) * offset,
    where,
    include: { owner: { select: { username: true } } },
  });
  const totals = await this.prisma.premiumTicket.count({ where });
  const totalPage = Math.ceil(totals / offset);
  return { items, pageInfo: { totalPage, hasNext: page < totalPage, endCursor: undefined } };
}
```

컨트롤러 `GET /products` 쿼리 타입 교체:

```ts
@TypedRoute.Get('/products')
async getProducts(
  @TypedQuery()
  query: {
    page: number;
    search?: string;
    isActive?: boolean;
    platform?: 'IOS' | 'AOS' | 'EVENT';
    isProduction?: boolean;
    isSubscribe?: boolean;
  },
) {
  const result = await this.productAdminService.getProducts(query);

  return result as any;
}
```

- [ ] **Step 4: 테스트/타입 체크 통과 확인**

Run: `npx jest src/admin/product/product.service.spec.ts && npx tsc --noEmit`
Expected: 전체 PASS. 주의: 기존 search-only 테스트가 `where: { OR: [...] }` 형태를 기대하면 `where: { AND: [{ OR: [...] }] }`로 기대값을 갱신한다(동작 동일).

- [ ] **Step 5: 커밋**

```bash
git add src/admin/
git commit -m "feat(admin): add isActive/platform/isProduction/isSubscribe filters to products list"
```

---

### Task 4: [프론트] 결제 공용 컴포넌트 추출 (동작 불변)

**Files:**
- Create: `src/components/shared/purchase/purchase-status.ts`
- Create: `src/components/shared/purchase/EntitlementRow.tsx`
- Create: `src/components/shared/purchase/LiveStatusBlock.tsx`
- Create: `src/components/shared/purchase/PurchaseHistoryRow.tsx`
- Modify: `src/components/page/user/components/tabs/UserEntitlementsTab.tsx` (추출분 제거·import 교체)
- Modify: `src/components/page/user/components/tabs/UserPurchasesTab.tsx` (카드 마크업 → PurchaseHistoryRow)
- Modify: `src/components/page/premium/PurchaseMetaList.tsx` (`resolveStatus`/`LEGACY_SUCCESS_BEFORE` → import)

**Interfaces:**
- Produces (Task 7이 사용):
  - `resolveStatus(record: { isExpired: boolean; isSuccess: boolean; createdAt: string }): { label: string; variant: 'softSuccess' | 'softDanger' | 'softNeutral' }`
  - `EntitlementRow({ label, t }: { label: string; t: UserEntitlementTicket })`
  - `LiveStatusBlock({ username }: { username: string })`
  - `PurchaseHistoryRow({ row }: { row: UserPurchaseRow })`

- [ ] **Step 1: purchase-status.ts 생성**

```ts
import dayjs from 'dayjs';

// 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정)
export const LEGACY_SUCCESS_BEFORE = '2024-06-01';

export function resolveStatus(record: { isExpired: boolean; isSuccess: boolean; createdAt: string }): {
  label: string;
  variant: 'softSuccess' | 'softDanger' | 'softNeutral';
} {
  if (record.isExpired) return { label: '만료', variant: 'softNeutral' };
  const isSuccess = record.isSuccess || dayjs(record.createdAt).isBefore(LEGACY_SUCCESS_BEFORE);
  return isSuccess ? { label: '성공', variant: 'softSuccess' } : { label: '실패', variant: 'softDanger' };
}
```

- [ ] **Step 2: EntitlementRow / LiveStatusBlock 이동**

`UserEntitlementsTab.tsx`에서 `LIVE_STATUS_META`, `isLive`, `EntitlementRow`, `LiveStatusBlock`을 잘라내어 각 파일로 이동한다. 코드는 기존과 동일하며 import만 조정한다.

`src/components/shared/purchase/EntitlementRow.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import type { UserEntitlementTicket } from '@/client/types';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

function isLive(t: UserEntitlementTicket): boolean {
  if (!t.isActive) return false;
  if (!t.dueAt) return true;
  return new Date(t.dueAt).getTime() > Date.now();
}

function EntitlementRow({ label, t }: { label: string; t: UserEntitlementTicket }) {
  const live = isLive(t);
  return (
    <div className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
      <Badge variant={live ? 'softSuccess' : 'softNeutral'} className='w-16 shrink-0 justify-center'>
        {label}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-slate-900'>{t.productId}</div>
        <div className='truncate text-[11px] text-slate-500'>
          {t.platform.toUpperCase()} · {t.dueAt ? `만료 ${dayjs(t.dueAt).format('YYYY.MM.DD')}` : '만료 없음'}
        </div>
      </div>
      <span className={cn('shrink-0 text-xs font-medium', live ? 'text-emerald-600' : 'text-slate-500')}>
        {live ? '활성' : '비활성'}
      </span>
    </div>
  );
}

export default EntitlementRow;
```

`src/components/shared/purchase/LiveStatusBlock.tsx` — `UserEntitlementsTab.tsx`의 `LIVE_STATUS_META`(12-23행)와 `LiveStatusBlock`(63-132행)을 그대로 이동 (import: `getUserSubscriptionStatus`, `LiveSubscriptionRow`, `LiveSubscriptionStatus`, Badge/Button/useQuery/dayjs/Loader2/RefreshCw).

- [ ] **Step 3: PurchaseHistoryRow 생성**

`UserPurchasesTab.tsx`의 카드 마크업(26-42행)을 추출:

```tsx
import { Badge } from '@/components/ui/badge';
import type { UserPurchaseRow } from '@/client/types';
import dayjs from 'dayjs';

function PurchaseHistoryRow({ row }: { row: UserPurchaseRow }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
      <Badge variant='softNeutral' className='w-16 shrink-0 justify-center uppercase'>
        {row.platform}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-slate-900'>{row.productId}</div>
        <div className='truncate text-[11px] text-slate-500'>
          {row.isSubscribe ? '구독' : '단건'} · {dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}
        </div>
      </div>
      <div className='shrink-0 text-sm font-semibold tabular-nums text-slate-900'>{row.price}</div>
    </div>
  );
}

export default PurchaseHistoryRow;
```

- [ ] **Step 4: 원본 파일들 import 교체**

- `UserEntitlementsTab.tsx`: 이동한 코드 삭제, `import EntitlementRow from '@/components/shared/purchase/EntitlementRow';` `import LiveStatusBlock from '@/components/shared/purchase/LiveStatusBlock';`
- `UserPurchasesTab.tsx`: 카드 마크업을 `<PurchaseHistoryRow key={row.id} row={row} />`로 교체
- `PurchaseMetaList.tsx`: 로컬 `LEGACY_SUCCESS_BEFORE`/`resolveStatus`(20-36행) 삭제, `import { resolveStatus } from '@/components/shared/purchase/purchase-status';`

- [ ] **Step 5: 검증 후 커밋**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit && npm run lint`
Expected: 신규 에러 없음 (Global Constraints의 기존 5건 제외)

```bash
git add src/components/
git commit -m "refactor(purchase): extract shared purchase components from user detail tabs"
```

---

### Task 5: [프론트] 클라이언트/타입/훅 추가

**Files:**
- Modify: `src/client/types.ts` (PurchaseDetail 타입)
- Modify: `src/client/premium.ts` (getPurchaseDetail, getProducts 파라미터)
- Modify: `src/hooks/useProducts.ts` (파라미터 확장 + queryKey 오타 수정)
- Create: `src/hooks/usePurchaseDetail.ts`

**Interfaces:**
- Consumes: Task 2의 `GET /purchase/:id`, Task 3의 `GET /products` 필터
- Produces (Task 7/9가 사용):
  - `PurchaseDetail`, `PurchaseRelatedTicket` 타입
  - `getPurchaseDetail(id: number): Promise<PurchaseDetail>`
  - `useProducts({ page, search?, isActive?, platform?, isProduction?, isSubscribe? })`
  - `usePurchaseDetail(id: number | null)` → `{ data, isLoading, isError }`

- [ ] **Step 1: types.ts에 타입 추가** (PurchaseMeta 아래)

```ts
export type PurchaseRelatedTicket = {
  type: 'premium' | 'goldclub';
  id: number;
  productId: string;
  platform: string;
  dueAt: string | null;
  isActive: boolean;
  isProduction: boolean;
  createdAt: string;
};

export type PurchaseDetail = PurchaseMeta & {
  price: string | null;
  isSubscribe: boolean | null;
  relatedTickets: PurchaseRelatedTicket[];
};
```

- [ ] **Step 2: premium.ts 수정**

```ts
export type GetProductsFilters = {
  page: number;
  search?: string;
  isActive?: boolean;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  isProduction?: boolean;
  isSubscribe?: boolean;
};

export async function getProducts(by: GetProductsFilters) {
  const res = await client.get<QueryResultWithPagination<IAPProduct>>('/products', { params: by });

  return res.data;
}

export async function getPurchaseDetail(id: number) {
  const res = await client.get<PurchaseDetail>(`/purchase/${id}`);

  return res.data;
}
```

(import에 `PurchaseDetail` 추가)

- [ ] **Step 3: 훅 작성**

`src/hooks/usePurchaseDetail.ts`:

```ts
import { getPurchaseDetail } from '@/client/premium';
import { useQuery } from '@tanstack/react-query';

function usePurchaseDetail(id: number | null) {
  return useQuery({
    queryKey: ['purchase-detail', id],
    queryFn: () => getPurchaseDetail(id as number),
    enabled: id !== null,
  });
}

export default usePurchaseDetail;
```

`src/hooks/useProducts.ts` — Props를 `GetProductsFilters`로 교체하고 queryKey 오타 수정:

```ts
import { getProducts, GetProductsFilters } from '@/client/premium';
import { useQuery } from '@tanstack/react-query';

function useProducts(by: GetProductsFilters) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', by],
    queryFn: () => getProducts(by),
  });

  const items = data?.items ?? [];
  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useProducts;
```

- [ ] **Step 4: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/client/ src/hooks/
git commit -m "feat(purchase): add purchase detail client and extended products filters"
```

---

### Task 6: [프론트] ReceiptViewer (영수증/로그 뷰어)

**Files:**
- Create: `src/components/shared/purchase/ReceiptViewer.tsx`

**Interfaces:**
- Produces: `ReceiptViewer({ title, raw }: { title: string; raw: string })` — Task 7이 사용

- [ ] **Step 1: 컴포넌트 작성**

JSON 파싱 성공 시 key 정렬 pretty-print, 실패 시 원문. 접기 토글 + 원문 복사.

```tsx
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return value;
}

function ReceiptViewer({ title, raw }: { title: string; raw: string }) {
  const [open, setOpen] = useState(false);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(sortKeysDeep(JSON.parse(raw)), null, 2);
    } catch {
      return null; // 파싱 실패 → 원문 폴백
    }
  }, [raw]);

  const copyRaw = () => {
    navigator.clipboard.writeText(raw);
    toast.success(`${title} 원문 복사됨`);
  };

  return (
    <div className='rounded-lg border border-slate-200'>
      <div className='flex items-center justify-between px-3 py-2'>
        <button
          type='button'
          onClick={() => setOpen((prev) => !prev)}
          className='flex items-center gap-1 text-xs font-semibold text-slate-600'
        >
          {open ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronRight className='h-3.5 w-3.5' />}
          {title}
          {pretty === null ? <span className='ml-1 font-normal text-slate-400'>(원문)</span> : null}
        </button>
        <Button variant='ghost' size='sm' className='h-7 px-2 text-xs text-slate-500' onClick={copyRaw}>
          <Copy className='mr-1 h-3 w-3' />
          복사
        </Button>
      </div>
      {open ? (
        <pre className='max-h-80 overflow-auto whitespace-pre-wrap border-t border-slate-100 bg-slate-50 p-3 text-xs text-slate-700'>
          {pretty ?? raw}
        </pre>
      ) : null}
    </div>
  );
}

export default ReceiptViewer;
```

- [ ] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/shared/purchase/ReceiptViewer.tsx
git commit -m "feat(purchase): add receipt/log JSON viewer"
```

---

### Task 7: [프론트] PurchaseDetailSheet (결제 상세 패널)

**Files:**
- Create: `src/components/page/premium/PurchaseDetailSheet.tsx`

**Interfaces:**
- Consumes: `usePurchaseDetail`, `getUserEntitlements`/`getUserPurchases`(client/user), `EntitlementRow`/`LiveStatusBlock`/`PurchaseHistoryRow`/`ReceiptViewer`/`resolveStatus`, `TicketForm`, `AdminSideSheetContent`
- Produces (Task 8/9/10이 사용):
  - `type PurchaseDetailContext = { type: 'purchase'; purchaseId: number } | { type: 'ticket'; ticket: IAPProduct }`
  - `PurchaseDetailSheet({ open, context, onClose }: { open: boolean; context: PurchaseDetailContext | null; onClose: () => void })`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { IAPProduct } from '@/client/premium';
import { getUserEntitlements, getUserPurchases } from '@/client/user';
import TicketForm from '@/components/page/user/TicketForm';
import EntitlementRow from '@/components/shared/purchase/EntitlementRow';
import LiveStatusBlock from '@/components/shared/purchase/LiveStatusBlock';
import PurchaseHistoryRow from '@/components/shared/purchase/PurchaseHistoryRow';
import ReceiptViewer from '@/components/shared/purchase/ReceiptViewer';
import { resolveStatus } from '@/components/shared/purchase/purchase-status';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import usePurchaseDetail from '@/hooks/usePurchaseDetail';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Copy, ExternalLink, Loader2, Ticket } from 'lucide-react';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

export type PurchaseDetailContext =
  | { type: 'purchase'; purchaseId: number }
  | { type: 'ticket'; ticket: IAPProduct };

interface PurchaseDetailSheetProps {
  open: boolean;
  context: PurchaseDetailContext | null;
  onClose: () => void;
}

const PLATFORM_LABEL: Record<string, string> = { IOS: 'iOS', AOS: 'Android', EVENT: 'EVENT' };

function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-0.5'>
      <div className='text-[11px] font-medium text-slate-500'>{label}</div>
      <div className='text-sm text-slate-900'>{children}</div>
    </div>
  );
}

function CopyableValue({ value, label }: { value: string; label: string }) {
  return (
    <div className='flex items-center gap-1'>
      <span className='truncate font-mono text-sm text-slate-700'>{value}</span>
      <Button
        variant='ghost'
        size='sm'
        className='h-7 w-7 shrink-0 p-0'
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${label} 복사됨`);
        }}
      >
        <Copy className='h-3 w-3' />
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='space-y-2'>
      <h4 className='text-xs font-semibold text-slate-500'>{title}</h4>
      {children}
    </section>
  );
}

function UserContextSections({ username }: { username: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ticketOpen, setTicketOpen] = useState(false);

  const entitlements = useQuery({
    queryKey: ['user-entitlements', username],
    queryFn: () => getUserEntitlements(username),
    enabled: !!username,
  });
  const purchases = useQuery({
    queryKey: ['user-purchases', username, 1],
    queryFn: () => getUserPurchases(username, 1),
    enabled: !!username,
  });

  const tickets = entitlements.data?.premiumTickets ?? [];
  const golds = entitlements.data?.goldClubs ?? [];
  const historyItems = purchases.data?.items ?? [];

  return (
    <>
      <Section title='이용권/구독 상태'>
        <LiveStatusBlock username={username} />
        {entitlements.isLoading ? (
          <div className='flex justify-center py-4'>
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-2'>
            {tickets.slice(0, 5).map((t) => (
              <EntitlementRow key={`p-${t.id}`} label='프리미엄' t={t} />
            ))}
            {golds.slice(0, 5).map((t) => (
              <EntitlementRow key={`g-${t.id}`} label='골드클럽' t={t} />
            ))}
            {tickets.length === 0 && golds.length === 0 ? (
              <div className='text-xs text-slate-500'>DB에 저장된 이용권이 없습니다.</div>
            ) : null}
          </div>
        )}
      </Section>

      <Section title='최근 결제 이력'>
        {purchases.isLoading ? (
          <div className='flex justify-center py-4'>
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        ) : historyItems.length === 0 ? (
          <div className='text-xs text-slate-500'>결제 이력이 없습니다.</div>
        ) : (
          <div className='space-y-2'>
            {historyItems.map((row) => (
              <PurchaseHistoryRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </Section>

      <div className='flex flex-wrap gap-2 border-t border-slate-100 pt-4'>
        <Button variant='outline' onClick={() => router.push(`/user/list?username=${encodeURIComponent(username)}`)}>
          <ExternalLink className='mr-1.5 h-3.5 w-3.5' />
          유저 상세 열기
        </Button>
        <Button variant='outline' onClick={() => setTicketOpen(true)}>
          <Ticket className='mr-1.5 h-3.5 w-3.5' />
          티켓 지급/회수
        </Button>
      </div>

      <Sheet open={ticketOpen} onOpenChange={(next) => !next && setTicketOpen(false)}>
        <AdminSideSheetContent title='티켓 관리' size='md'>
          <TicketForm
            username={username}
            reload={() => {
              queryClient.invalidateQueries({ queryKey: ['user-entitlements', username] });
              queryClient.invalidateQueries({ queryKey: ['user-purchases', username] });
            }}
            close={() => setTicketOpen(false)}
          />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

function PurchaseSummary({ context }: { context: PurchaseDetailContext }) {
  const detail = usePurchaseDetail(context.type === 'purchase' ? context.purchaseId : null);

  if (context.type === 'ticket') {
    const t = context.ticket;
    return (
      <div className='space-y-4'>
        <div className='flex flex-wrap gap-1.5'>
          <Badge variant={t.isActive ? 'softSuccess' : 'softNeutral'}>{t.isActive ? '활성' : '만료'}</Badge>
          <Badge variant='softNeutral'>{PLATFORM_LABEL[t.platform] ?? t.platform}</Badge>
          <Badge variant={t.dueAt ? 'softInfo' : 'softNeutral'}>{t.dueAt ? '구독' : '소모품'}</Badge>
          <Badge variant={t.isProduction ? 'softNeutral' : 'softWarning'}>{t.isProduction ? 'PROD' : 'TEST'}</Badge>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <SummaryField label='상품 ID'>
            <CopyableValue value={t.productId} label='상품 ID' />
          </SummaryField>
          <SummaryField label='결제 ID'>
            {t.transactionId ? <CopyableValue value={t.transactionId} label='결제 ID' /> : '없음'}
          </SummaryField>
          <SummaryField label='생성'>{dayjs(t.createdAt).format('YYYY.MM.DD HH:mm')}</SummaryField>
          {t.dueAt ? <SummaryField label='만료'>{dayjs(t.dueAt).format('YYYY.MM.DD HH:mm')}</SummaryField> : null}
        </div>
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className='flex min-h-[160px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return <div className='py-8 text-center text-sm text-muted-foreground'>결제 상세를 불러오지 못했습니다.</div>;
  }

  const p = detail.data;
  const status = resolveStatus(p);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-1.5'>
        <Badge variant={status.variant}>{status.label}</Badge>
        <Badge variant='softNeutral'>{PLATFORM_LABEL[p.platform] ?? p.platform}</Badge>
        <Badge variant={p.isProduction ? 'softNeutral' : 'softWarning'}>{p.isProduction ? 'PROD' : 'TEST'}</Badge>
        {p.isSubscribe !== null ? (
          <Badge variant={p.isSubscribe ? 'softInfo' : 'softNeutral'}>{p.isSubscribe ? '구독' : '단건'}</Badge>
        ) : null}
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <SummaryField label='유저'>
          {p.username ? <CopyableValue value={p.username} label='유저' /> : <CopyableValue value={p.userId} label='유저 ID' />}
        </SummaryField>
        {p.price ? <SummaryField label='가격 (이력 기준)'>{p.price}</SummaryField> : null}
        <SummaryField label='상품 ID'>
          <CopyableValue value={p.productId} label='상품 ID' />
        </SummaryField>
        <SummaryField label='결제 ID'>
          <CopyableValue value={p.transactionId} label='결제 ID' />
        </SummaryField>
        <SummaryField label='구매 시간'>{dayjs(p.createdAt).format('YYYY.MM.DD HH:mm:ss')}</SummaryField>
        {p.completedAt ? (
          <SummaryField label='완료 시간'>{dayjs(p.completedAt).format('YYYY.MM.DD HH:mm:ss')}</SummaryField>
        ) : null}
      </div>

      {p.relatedTickets.length > 0 ? (
        <Section title='이 결제로 지급된 이용권'>
          <div className='space-y-2'>
            {p.relatedTickets.map((t) => (
              <EntitlementRow
                key={`${t.type}-${t.id}`}
                label={t.type === 'premium' ? '프리미엄' : '골드클럽'}
                t={{ ...t, profileId: null }}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {p.receipt || p.log ? (
        <Section title='영수증·로그'>
          <div className='space-y-2'>
            {p.receipt ? <ReceiptViewer title='영수증' raw={p.receipt} /> : null}
            {p.log ? <ReceiptViewer title='로그' raw={p.log} /> : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function PurchaseDetailSheet({ open, context, onClose }: PurchaseDetailSheetProps) {
  if (!context) return null;

  const username =
    context.type === 'purchase' ? undefined : context.ticket.owner?.username;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <AdminSideSheetContent
        title={context.type === 'purchase' ? '결제 상세' : '이용권 상세'}
        description='결제 정보와 유저의 이용권/구독 상태를 확인합니다.'
        size='lg'
      >
        <div className='space-y-6'>
          <PurchaseSummary context={context} />
          {context.type === 'purchase' ? (
            <PurchaseUserSections purchaseId={context.purchaseId} />
          ) : username ? (
            <UserContextSections username={username} />
          ) : (
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500'>
              탈퇴한 유저입니다. 이용권/이력 조회를 사용할 수 없습니다.
            </div>
          )}
        </div>
      </AdminSideSheetContent>
    </Sheet>
  );
}

// 결제 컨텍스트는 상세 API 응답의 username을 기다렸다가 유저 섹션을 렌더한다
function PurchaseUserSections({ purchaseId }: { purchaseId: number }) {
  const detail = usePurchaseDetail(purchaseId);
  if (!detail.data) return null;
  if (!detail.data.username) {
    return (
      <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500'>
        탈퇴한 유저입니다. 이용권/이력 조회를 사용할 수 없습니다.
      </div>
    );
  }
  return <UserContextSections username={detail.data.username} />;
}

export default PurchaseDetailSheet;
```

참고: `usePurchaseDetail`은 동일 queryKey라 `PurchaseSummary`/`PurchaseUserSections`에서 중복 호출되지 않는다(TanStack Query 캐시 공유). `EntitlementRow`의 `t`는 `UserEntitlementTicket` 형태를 요구하므로 relatedTickets에 `profileId: null`을 보강한다.

- [ ] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/page/premium/PurchaseDetailSheet.tsx
git commit -m "feat(purchase): add purchase detail sheet with entitlements, live status and actions"
```

---

### Task 8: [프론트] PurchaseMetaList 상세 패널 연결

**Files:**
- Modify: `src/components/page/premium/PurchaseMetaList.tsx`

**Interfaces:**
- Consumes: Task 7의 `PurchaseDetailContext`
- Produces: `PurchaseMetaList({ onOpenDetail }: { onOpenDetail: (ctx: PurchaseDetailContext) => void })` — Task 10의 컨테이너가 사용

- [ ] **Step 1: 다이얼로그 제거 + 행 클릭 연결**

1. props 추가: `function PurchaseMetaList({ onOpenDetail }: { onOpenDetail: (ctx: PurchaseDetailContext) => void })`
2. `detailDialog` state, `showDetail`, `Dialog` 렌더 블록(363-372행), Dialog 관련 import 제거
3. `detail` 컬럼(229-263행)을 제거
4. `DataTable`에 행 클릭 연결:

```tsx
<DataTable
  columns={columns}
  data={items || []}
  loading={isLoading}
  onRow={(record) => ({
    onClick: () => onOpenDetail({ type: 'purchase', purchaseId: record.id }),
  })}
  pagination={{ /* 기존 유지 */ }}
/>
```

5. 셀 내부 복사 버튼들의 onClick에 `e.stopPropagation()` 추가 (행 클릭과 충돌 방지):

```tsx
onClick={(e) => {
  e.stopPropagation();
  copyToClipboard(userId, '유저 ID');
}}
```

(유저/상품 ID/결제 ID 세 컬럼 모두 동일 적용)

- [ ] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`
(주의: 이 시점에 `purchase.tsx`가 props 없이 렌더해 tsc 에러가 나면 Task 10에서 해소되므로, 임시로 `onOpenDetail`을 옵셔널로 두지 말고 Task 10과 같은 커밋으로 묶지 않는 대신 `pages/product/purchase.tsx`에 `onOpenDetail={() => {}}`를 임시 전달한다.)

```bash
git add src/components/page/premium/PurchaseMetaList.tsx src/pages/product/purchase.tsx
git commit -m "feat(purchase): open detail sheet from purchase list rows"
```

---

### Task 9: [프론트] ProductList 필터/뱃지 정비 + 상세 연결

**Files:**
- Modify: `src/components/page/premium/ProductList.tsx`

**Interfaces:**
- Consumes: Task 5의 `useProducts` 확장 파라미터, Task 7의 `PurchaseDetailContext`
- Produces: `ProductList({ onOpenDetail }: { onOpenDetail: (ctx: PurchaseDetailContext) => void })` — Task 10이 사용

- [ ] **Step 1: 필터 상태/UI 추가 및 뱃지 정비**

전체 교체:

```tsx
import { IAPProduct } from '@/client/premium';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/shared/ui/data-table';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useProducts from '@/hooks/useProducts';
import type { PurchaseDetailContext } from './PurchaseDetailSheet';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

type ActiveValue = 'all' | 'active' | 'expired';
type KindValue = 'all' | 'sub' | 'consumable';
type PlatformValue = 'all' | 'IOS' | 'AOS' | 'EVENT';
type EnvValue = 'all' | 'prod' | 'test';

const PLATFORM_META: Record<string, { variant: 'softNeutral' | 'softInfo' | 'softWarning'; text: string }> = {
  IOS: { variant: 'softInfo', text: 'iOS' },
  AOS: { variant: 'softNeutral', text: 'Android' },
  EVENT: { variant: 'softWarning', text: 'EVENT' },
};

function ProductList({ onOpenDetail }: { onOpenDetail: (ctx: PurchaseDetailContext) => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveValue>('all');
  const [kindFilter, setKindFilter] = useState<KindValue>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformValue>('all');
  const [envFilter, setEnvFilter] = useState<EnvValue>('all');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { items, isLoading, totalPage } = useProducts({
    page: currentPage,
    search: effectiveSearch,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    isSubscribe: kindFilter === 'all' ? undefined : kindFilter === 'sub',
    platform: platformFilter === 'all' ? undefined : platformFilter,
    isProduction: envFilter === 'all' ? undefined : envFilter === 'prod',
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSearch, activeFilter, kindFilter, platformFilter, envFilter]);

  const columns: ColumnDef<IAPProduct>[] = [
    { accessorKey: 'id', header: '번호', size: 72 },
    {
      id: 'username',
      accessorFn: (row) => row.owner?.username ?? '-',
      header: '유저',
      size: 170,
      meta: { truncateMaxWidth: 150 },
    },
    {
      accessorKey: 'platform',
      header: '플랫폼',
      size: 92,
      cell: ({ row }) => {
        const meta = PLATFORM_META[row.original.platform];
        return meta ? <Badge variant={meta.variant}>{meta.text}</Badge> : <Badge variant='softNeutral'>{row.original.platform}</Badge>;
      },
    },
    {
      id: 'subscription',
      header: '구독/소모품',
      size: 110,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        return <Badge variant={value ? 'softInfo' : 'softNeutral'}>{value ? '구독' : '소모품'}</Badge>;
      },
    },
    { id: 'productId', accessorFn: (row) => row.productId ?? '-', header: '상품 ID', size: 210, meta: { truncateMaxWidth: 190 } },
    { id: 'transactionId', accessorFn: (row) => row.transactionId ?? '-', header: '결제 ID', size: 220, meta: { truncateMaxWidth: 200 } },
    {
      accessorKey: 'dueAt',
      header: '만료일',
      size: 130,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        return <div>{value ? dayjs(value).format('YY.MM.DD HH:mm') : ''}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '활성화',
      size: 92,
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'softSuccess' : 'softNeutral'}>{value ? '활성화' : '만료'}</Badge>;
      },
    },
    {
      accessorKey: 'isProduction',
      header: '환경',
      size: 104,
      cell: ({ row }) => {
        const value = row.original.isProduction;
        return <Badge variant={value ? 'softNeutral' : 'softWarning'}>{value ? 'PROD' : 'TEST'}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '생성 시간',
      size: 140,
      cell: ({ row }) => <div>{dayjs(row.original.createdAt).format('YY.MM.DD HH:mm')}</div>,
    },
  ];

  return (
    <>
      <DefaultTableBtn className='justify-between'>
        <div className='flex flex-1 flex-wrap items-end gap-3 py-4'>
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>검색</Label>
            <div className='relative min-w-[280px]'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='유저 / 상품 ID / 결제 ID (2자 이상)'
                className='pl-9'
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>활성 상태</Label>
            <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveValue)}>
              <SelectTrigger className='w-[110px]'><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='active'>활성</SelectItem>
                <SelectItem value='expired'>만료</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>유형</Label>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as KindValue)}>
              <SelectTrigger className='w-[120px]'><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='sub'>구독</SelectItem>
                <SelectItem value='consumable'>소모품</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>플랫폼</Label>
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformValue)}>
              <SelectTrigger className='w-[110px]'><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='IOS'>iOS</SelectItem>
                <SelectItem value='AOS'>Android</SelectItem>
                <SelectItem value='EVENT'>EVENT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>환경</Label>
            <Select value={envFilter} onValueChange={(v) => setEnvFilter(v as EnvValue)}>
              <SelectTrigger className='w-[100px]'><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='prod'>PROD</SelectItem>
                <SelectItem value='test'>TEST</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DefaultTableBtn>
      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        onRow={(record) => ({ onClick: () => onOpenDetail({ type: 'ticket', ticket: record }) })}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </>
  );
}

export default ProductList;
```

참고: `IAPProduct.owner` 타입이 `{ username: string }`(non-null)이지만 서버는 null을 반환할 수 있으므로 `src/client/premium.ts`의 `IAPProduct.owner`를 `{ username: string } | null`로 수정한다 (기존 `(row as any).owner?.username` 우회 제거).

- [ ] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`
(이 시점 `iap-product.tsx`가 props 없이 렌더하면 임시로 `onOpenDetail={() => {}}` 전달 — Task 10에서 리다이렉트로 교체됨)

```bash
git add src/components/page/premium/ProductList.tsx src/client/premium.ts src/pages/product/iap-product.tsx
git commit -m "feat(purchase): add filters and soft badges to product list, open detail sheet"
```

---

### Task 10: [프론트] 탭 통합 컨테이너 + 라우팅/메뉴 정리

**Files:**
- Create: `src/components/page/premium/PurchaseManagement.tsx`
- Modify: `src/pages/product/purchase.tsx`
- Modify: `src/pages/product/iap-product.tsx` (리다이렉트 스텁)
- Modify: `src/components/layout/main-menu.tsx` (66-70행)
- Modify: `src/components/layout/route-labels.ts`

**Interfaces:**
- Consumes: Task 7/8/9의 컴포넌트
- Produces: `/product/purchase?tab=purchases|products` 단일 진입점

- [ ] **Step 1: PurchaseManagement 작성**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/router';
import { useState } from 'react';
import ProductList from './ProductList';
import PurchaseDetailSheet, { PurchaseDetailContext } from './PurchaseDetailSheet';
import PurchaseMetaList from './PurchaseMetaList';

function PurchaseManagement() {
  const router = useRouter();
  const tab = router.query.tab === 'products' ? 'products' : 'purchases';
  const [detailContext, setDetailContext] = useState<PurchaseDetailContext | null>(null);

  const setTab = (next: string) => {
    router.replace({ pathname: router.pathname, query: { ...router.query, tab: next } }, undefined, {
      shallow: true,
    });
  };

  const openDetail = (ctx: PurchaseDetailContext) => setDetailContext(ctx);

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab} className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='purchases'>결제 내역</TabsTrigger>
          <TabsTrigger value='products'>이용권 현황</TabsTrigger>
        </TabsList>
        <TabsContent value='purchases'>
          <PurchaseMetaList onOpenDetail={openDetail} />
        </TabsContent>
        <TabsContent value='products'>
          <ProductList onOpenDetail={openDetail} />
        </TabsContent>
      </Tabs>

      <PurchaseDetailSheet open={!!detailContext} context={detailContext} onClose={() => setDetailContext(null)} />
    </div>
  );
}

export default PurchaseManagement;
```

- [ ] **Step 2: 페이지 교체**

`src/pages/product/purchase.tsx`:

```tsx
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import PurchaseManagement from '@/components/page/premium/PurchaseManagement';

function PurchasePage() {
  return (
    <div>
      <PurchaseManagement />
    </div>
  );
}

PurchasePage.getLayout = getDefaultLayout;
PurchasePage.pageHeader = pageHeader;

export default PurchasePage;
```

`src/pages/product/iap-product.tsx` (리다이렉트 스텁):

```tsx
import { getDefaultLayout } from '@/components/layout/default-layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function IapProductRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/product/purchase?tab=products');
  }, [router]);

  return null;
}

IapProductRedirectPage.getLayout = getDefaultLayout;

export default IapProductRedirectPage;
```

- [ ] **Step 3: 메뉴/라벨 정리**

`main-menu.tsx` 상품 관리 submenu 교체:

```tsx
submenu: [
  { id: 'iap-purchase', name: '인앱 결제 관리', link: { path: '/product/purchase' } },
  { id: 'coupon', name: '쿠폰 관리', link: { path: '/product/coupon' } },
],
```

`route-labels.ts`: `purchase` 라벨이 있으면 '인앱 결제 관리'로 갱신, `'iap-product': '인앱 상품'` 항목은 유지(리다이렉트 페이지 브레드크럼용).

- [ ] **Step 4: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint && npm run dev` (dev로 `/product/purchase` 탭 전환, `/product/iap-product` 리다이렉트 수동 확인)

```bash
git add src/components/page/premium/PurchaseManagement.tsx src/pages/product/ src/components/layout/
git commit -m "feat(product): merge purchase history and product list into unified IAP management screen"
```

---

### Task 11: [프론트] 유저 목록 딥링크 (?username=)

**Files:**
- Modify: `src/components/page/user/UserList.tsx`

**Interfaces:**
- Consumes: `getUser(username)` (`src/client/user.ts:22`)
- Produces: `/user/list?username=<username>` 진입 시 해당 유저의 상세 시트 자동 오픈 — Task 7의 "유저 상세 열기" 버튼이 사용

- [ ] **Step 1: 딥링크 처리 추가**

`UserList` 컴포넌트에 추가 (기존 state 아래):

```tsx
const router = useRouter();
const deepLinkUsername = typeof router.query.username === 'string' ? router.query.username : undefined;

const { data: deepLinkUser } = useQuery({
  queryKey: ['user-deeplink', deepLinkUsername],
  queryFn: () => getUser(deepLinkUsername as string),
  enabled: !!deepLinkUsername,
});

useEffect(() => {
  if (deepLinkUser) {
    setDetailTarget(deepLinkUser as unknown as UserSummary);
  }
}, [deepLinkUser]);
```

- 상세 시트 close 시 쿼리 제거: 기존 `UserDetailSheet`의 `onClose`에서 `setDetailTarget(null)` 후 `if (deepLinkUsername) router.replace({ pathname: router.pathname }, undefined, { shallow: true });` 호출
- import 추가: `useRouter`(next/router), `useQuery`(@tanstack/react-query), `getUser`(@/client/user), `useEffect`(react)
- 참고: `UserDetail`은 `Omit<UserSummary, 'socialAccount'> & { socialAccount: SocialAccount; ... }`로 UserSummary 요구 필드를 모두 포함하므로 캐스팅은 런타임 안전

- [ ] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint` + dev에서 `/user/list?username=<실존유저>` 수동 확인

```bash
git add src/components/page/user/UserList.tsx
git commit -m "feat(user): support username deep link to open detail sheet"
```

---

### Task 12: 최종 검증

- [ ] **Step 1: 서버 전체 검증**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/product/product.service.spec.ts && npx tsc --noEmit`
Expected: 전체 PASS

- [ ] **Step 2: 프론트 전체 검증**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit && npm run lint`
Expected: Global Constraints의 기존 5건 외 에러 없음

- [ ] **Step 3: 수동 시나리오 (dev 서버, 포트 4000)**

1. `/product/purchase` → 결제 내역 행 클릭 → 상세 패널: 요약/영수증/이용권/이력/액션 렌더 확인
2. 상세 패널 "스토어 실시간 확인" 버튼 동작 확인
3. 상세 패널 "유저 상세 열기" → `/user/list?username=...` → 유저 시트 자동 오픈 확인
4. 이용권 현황 탭 필터(활성/유형/플랫폼/환경) 동작 확인 + 이용권 행 클릭 → 이용권 컨텍스트 상세
5. `/product/iap-product` 접속 → `/product/purchase?tab=products` 리다이렉트 확인
6. 유저 관리 → 유저 상세 → 결제 내역/구독·권한 탭 기존 동작 불변 확인
