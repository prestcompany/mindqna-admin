# 인앱 결제 내역 개편 (A+B+C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인앱 결제 내역 페이지를 디자인 시스템에 정합시키고(A), 추측 로직을 실제 데이터로 교정하고(B), 상태·플랫폼·환경 필터를 추가(C)한다.

**Architecture:** 백엔드 `getPurchaseMetas`에 platform/status/isProduction 필터를 기존 transactionId dedup 로직과 합성해 추가. 프런트는 `PurchaseMeta` 타입을 교정(completedAt/receipt/platform)하고 `PurchaseMetaList`를 slate/soft 디자인 + 필터 UI로 재작성한다.

**Tech Stack:** NestJS 10 + Nestia, Prisma 5.8, Jest. 어드민: Next.js, React Query, TanStack Table(DataTable), shadcn/ui.

**Repos:**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 어드민: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Constraints:** 스키마 변경 없음(신규 컬럼 없음, 마이그레이션 불필요). 푸시는 SSH로 직접. 이모지 금지. 디자인은 space/user와 동일.

---

## File Structure

**백엔드 (`mindqna-server`)**
- Modify `src/admin/product/types/product.types.ts` — `GetPurchaseMetasParams`에 platform/status/isProduction 추가
- Modify `src/admin/admin.controller.ts` — `/purchase` `@TypedQuery` 타입 확장
- Modify `src/admin/product/product.service.ts` — `getPurchaseMetas` where 합성
- Modify `src/admin/product/product.service.spec.ts` — 필터 테스트

**어드민 (`mindqna-admin`)**
- Modify `src/client/types.ts` — `PurchaseMeta` 교정(completedAt/receipt/platform)
- Modify `src/client/premium.ts` — `getPurchases` 파라미터 확장
- Modify `src/hooks/usePurchase.ts` — Props 확장
- Modify `src/components/page/premium/PurchaseMetaList.tsx` — 디자인 정합 + 필터 + completedAt 컬럼 + 상태 규칙 + receipt 다이얼로그

---

## Task 1: 백엔드 필터 (TDD)

**Files:**
- Modify: `src/admin/product/types/product.types.ts`
- Modify: `src/admin/product/product.service.ts`
- Modify: `src/admin/product/product.service.spec.ts`
- Modify: `src/admin/admin.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 파라미터 타입 확장**

`src/admin/product/types/product.types.ts`의 `GetPurchaseMetasParams`를 변경:
```ts
export type GetPurchaseMetasParams = {
  page: number;
  username?: string;
  startDate?: string;
  endDate?: string;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  status?: 'success' | 'failed' | 'expired';
  isProduction?: boolean;
};
```

- [ ] **Step 2: 실패 테스트 추가**

`src/admin/product/product.service.spec.ts`의 서비스 타입 선언(`getPurchaseMetas: (params: {...}) => Promise<unknown>`)을 새 파라미터로 확장:
```ts
    getPurchaseMetas: (params: {
      page: number;
      username?: string;
      startDate?: string;
      endDate?: string;
      platform?: 'IOS' | 'AOS' | 'EVENT';
      status?: 'success' | 'failed' | 'expired';
      isProduction?: boolean;
    }) => Promise<unknown>;
```

같은 파일 `describe('ProductAdminService', ...)` 안, 기존 `paginates purchase metas...` 테스트 뒤에 추가:
```ts
  it('filters by status=success (incl. legacy) without the dedup lookup', async () => {
    prisma.purchaseMeta.findMany.mockResolvedValueOnce([]);
    prisma.purchaseMeta.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    await service.getPurchaseMetas({ page: 1, status: 'success' });

    // success는 dedup 조회 없이 단일 findMany(메인) 호출, 레거시 OR 포함
    expect(prisma.purchaseMeta.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.purchaseMeta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ isSuccess: true }, { isSuccess: false, createdAt: { lt: new Date('2024-06-01') } }],
        }),
      }),
    );
  });

  it('filters by status=expired without the dedup lookup', async () => {
    prisma.purchaseMeta.findMany.mockResolvedValueOnce([]);
    prisma.purchaseMeta.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    await service.getPurchaseMetas({ page: 1, status: 'expired' });

    expect(prisma.purchaseMeta.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.purchaseMeta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isExpired: true }) }),
    );
  });

  it('filters by status=failed using the not-in dedup set (dedup where carries base filters)', async () => {
    prisma.purchaseMeta.findMany
      .mockResolvedValueOnce([{ transactionId: 'txn-ok' }])
      .mockResolvedValueOnce([]);
    prisma.purchaseMeta.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    await service.getPurchaseMetas({ page: 1, status: 'failed', platform: 'AOS' });

    // dedup 조회(Nth 1)에도 platform 필터가 적용됨
    expect(prisma.purchaseMeta.findMany).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({ platform: { equals: 'AOS' }, OR: [{ isSuccess: true }, { isExpired: true }] }),
      distinct: ['transactionId'],
      select: { transactionId: true },
    });
    expect(prisma.purchaseMeta.findMany).toHaveBeenNthCalledWith(2, {
      orderBy: { createdAt: 'desc' },
      where: expect.objectContaining({
        platform: { equals: 'AOS' },
        isSuccess: false,
        isExpired: false,
        transactionId: { notIn: ['txn-ok'] },
      }),
      take: 20,
      skip: 0,
    });
  });

  it('applies platform and isProduction to the base where', async () => {
    prisma.purchaseMeta.findMany.mockResolvedValueOnce([]);
    prisma.purchaseMeta.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    await service.getPurchaseMetas({ page: 1, status: 'expired', platform: 'IOS', isProduction: false });

    expect(prisma.purchaseMeta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          platform: { equals: 'IOS' },
          isProduction: { equals: false },
          isExpired: true,
        }),
      }),
    );
  });
```

- [ ] **Step 3: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/product/product.service.spec.ts -t "status="`
Expected: FAIL (현재 구현은 status/platform/isProduction 무시 → where에 미반영, 또는 success에서 findMany 2회 호출).

- [ ] **Step 4: 서비스 구현**

`src/admin/product/product.service.ts` 상단(클래스 밖, import 아래)에 상수를 추가한다:
```ts
// 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정). 프런트 표시 규칙과 동일 기준.
const LEGACY_SUCCESS_BEFORE = new Date('2024-06-01');
```

`getPurchaseMetas`를 아래로 교체한다(기존 메서드 본문 전체 대체):
```ts
  async getPurchaseMetas(
    params: GetPurchaseMetasParams,
  ): Promise<{ items: PurchaseMetaWithUsername[]; pageInfo: PageInfo }> {
    const { page, username, startDate, endDate, platform, status, isProduction } = params;
    const start = startDate ? dayjs(startDate).startOf('day').toDate() : undefined;
    const end = endDate ? dayjs(endDate).endOf('day').toDate() : undefined;
    const offset = 20;
    const baseWhere = {
      userId: username ? { equals: username } : undefined,
      createdAt: {
        gte: start,
        lte: end,
      },
      ...(platform ? { platform: { equals: platform } } : {}),
      ...(isProduction !== undefined ? { isProduction: { equals: isProduction } } : {}),
    };

    let effectiveWhere: Record<string, unknown>;
    if (status === 'success') {
      // 프런트 표시 규칙과 정합: isSuccess true 또는 레거시(2024-06-01 이전, isSuccess 미기록) 건
      effectiveWhere = {
        ...baseWhere,
        OR: [{ isSuccess: true }, { isSuccess: false, createdAt: { lt: LEGACY_SUCCESS_BEFORE } }],
      };
    } else if (status === 'expired') {
      effectiveWhere = { ...baseWhere, isExpired: true };
    } else {
      // status === 'failed' 또는 미지정: 성공/만료된 transactionId 집합으로 dedup
      const successOrExpiredTransactionIds = await this.prisma.purchaseMeta.findMany({
        where: {
          ...baseWhere,
          OR: [{ isSuccess: true }, { isExpired: true }],
        },
        distinct: ['transactionId'],
        select: { transactionId: true },
      });
      const ids = successOrExpiredTransactionIds.map((item) => item.transactionId);

      if (status === 'failed') {
        effectiveWhere = {
          ...baseWhere,
          isSuccess: false,
          isExpired: false,
          transactionId: { notIn: ids },
        };
      } else {
        effectiveWhere = ids.length
          ? {
              ...baseWhere,
              OR: [
                { isSuccess: true },
                { isExpired: true },
                {
                  AND: [{ isSuccess: false }, { isExpired: false }, { transactionId: { notIn: ids } }],
                },
              ],
            }
          : baseWhere;
      }
    }

    const [items, totals] = await Promise.all([
      this.prisma.purchaseMeta.findMany({
        orderBy: { createdAt: 'desc' },
        where: effectiveWhere,
        take: offset,
        skip: (page - 1) * offset,
      }),
      this.prisma.purchaseMeta.count({ where: effectiveWhere }),
    ]);
    const userIds = [...new Set(items.map((item) => item.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true },
        })
      : [];
    const usernameMap = new Map(users.map((user) => [user.id, user.username]));
    const itemsWithUsername = items.map((item) => ({
      ...item,
      username: usernameMap.get(item.userId) ?? '',
    }));
    const totalPage = Math.ceil(totals / offset);

    return { items: itemsWithUsername, pageInfo: { totalPage, hasNext: page < totalPage, endCursor: undefined } };
  }
```

- [ ] **Step 5: 컨트롤러 쿼리 확장**

`src/admin/admin.controller.ts`의 `/purchase` 라우트 `@TypedQuery` 타입을 변경:
```ts
  @TypedRoute.Get('/purchase')
  async getPurchaseMetas(
    @TypedQuery()
    query: {
      page: number;
      username?: string;
      startDate?: string;
      endDate?: string;
      platform?: 'IOS' | 'AOS' | 'EVENT';
      status?: 'success' | 'failed' | 'expired';
      isProduction?: boolean;
    },
  ) {
    const result = await this.productAdminService.getPurchaseMetas(query);

    return result as any;
  }
```

- [ ] **Step 6: 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/product/product.service.spec.ts`
Expected: PASS (기존 dedup 테스트 + 신규 4개: success/expired/failed/platform+isProduction).

타입체크:
Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "admin/product|admin.controller" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 7: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/product/types/product.types.ts src/admin/product/product.service.ts src/admin/product/product.service.spec.ts src/admin/admin.controller.ts
git commit -m "feat(admin/product): add platform/status/isProduction filters to purchase metas"
```

---

## Task 2: 어드민 타입 + 클라이언트 + 훅

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/premium.ts`
- Modify: `src/hooks/usePurchase.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: `PurchaseMeta` 타입 교정**

`src/client/types.ts`의 기존 `PurchaseMeta` 타입을 아래로 교체:
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

- [ ] **Step 2: `getPurchases` 파라미터 확장**

`src/client/premium.ts`의 `getPurchases`를 변경:
```ts
export async function getPurchases(by: {
  page: number;
  username?: string;
  startDate?: string;
  endDate?: string;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  status?: 'success' | 'failed' | 'expired';
  isProduction?: boolean;
}) {
  const res = await client.get<QueryResultWithPagination<PurchaseMeta>>('/purchase', { params: by });

  return res.data;
}
```

- [ ] **Step 3: `usePurchase` Props 확장**

`src/hooks/usePurchase.ts`의 `Props`를 변경:
```ts
type Props = {
  page: number;
  username?: string;
  startDate?: string;
  endDate?: string;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  status?: 'success' | 'failed' | 'expired';
  isProduction?: boolean;
};
```

- [ ] **Step 4: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "client/types|client/premium|usePurchase|PurchaseMetaList" ; echo DONE`
Expected: 에러 줄 없음(기존 `PurchaseMetaList`가 새 타입과 호환되는지 확인 — `platform` 좁아짐으로 인한 에러 없을 것).

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/premium.ts src/hooks/usePurchase.ts
git commit -m "feat(iap): extend purchase types/fetcher/hook with completedAt/receipt and filters"
```

---

## Task 3: `PurchaseMetaList` 디자인 정합 + 필터 재작성

**Files:**
- Modify: `src/components/page/premium/PurchaseMetaList.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 컴포넌트 재작성**

`src/components/page/premium/PurchaseMetaList.tsx` 전체를 아래로 교체한다:

```tsx
import { PurchaseMeta } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import usePurchases from '@/hooks/usePurchase';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Copy, Eye } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정)
const LEGACY_SUCCESS_BEFORE = '2024-06-01';

type StatusValue = 'all' | 'success' | 'failed' | 'expired';
type PlatformValue = 'all' | 'IOS' | 'AOS' | 'EVENT';
type EnvValue = 'all' | 'prod' | 'test';

const PLATFORM_META: Record<string, { variant: 'softNeutral' | 'softInfo' | 'softWarning'; text: string }> = {
  IOS: { variant: 'softInfo', text: 'iOS' }, // sky — Apple
  AOS: { variant: 'softNeutral', text: 'Android' }, // slate — 표준 스토어
  EVENT: { variant: 'softWarning', text: 'EVENT' }, // amber — 실결제 아닌 시스템 지급, 구분
};

function resolveStatus(record: PurchaseMeta): { label: string; variant: 'softSuccess' | 'softDanger' | 'softNeutral' } {
  if (record.isExpired) return { label: '만료', variant: 'softNeutral' };
  const isSuccess = record.isSuccess || dayjs(record.createdAt).isBefore(LEGACY_SUCCESS_BEFORE);
  return isSuccess ? { label: '성공', variant: 'softSuccess' } : { label: '실패', variant: 'softDanger' };
}

function PurchaseMetaList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState<{
    username?: string;
    startDate?: string;
    endDate?: string;
    platform?: 'IOS' | 'AOS' | 'EVENT';
    status?: 'success' | 'failed' | 'expired';
    isProduction?: boolean;
  }>({});
  const [usernameKeyword, setUsernameKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusValue>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformValue>('all');
  const [envFilter, setEnvFilter] = useState<EnvValue>('all');
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs | null>(null);
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs | null>(null);
  const [detailDialog, setDetailDialog] = useState<{ title: string; content: string } | null>(null);

  const { items, isLoading, totalPage } = usePurchases({ page: currentPage, ...searchFilters });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 복사됨`);
  };
  const showDetail = (content: string, title: string) => setDetailDialog({ title, content });

  const buildFilters = (overrides?: { status?: StatusValue }) => {
    const status = overrides?.status ?? statusFilter;
    return {
      username: usernameKeyword.trim() || undefined,
      startDate: startedAt ? startedAt.format('YYYY-MM-DD') : undefined,
      endDate: endedAt ? endedAt.format('YYYY-MM-DD') : undefined,
      platform: platformFilter === 'all' ? undefined : platformFilter,
      status: status === 'all' ? undefined : status,
      isProduction: envFilter === 'all' ? undefined : envFilter === 'prod',
    };
  };

  const handleSearch = () => {
    setSearchFilters(buildFilters());
    setCurrentPage(1);
  };
  const handleReset = () => {
    setUsernameKeyword('');
    setStatusFilter('all');
    setPlatformFilter('all');
    setEnvFilter('all');
    setStartedAt(null);
    setEndedAt(null);
    setSearchFilters({});
    setCurrentPage(1);
  };
  const showFailedOnly = () => {
    setStatusFilter('failed');
    setSearchFilters(buildFilters({ status: 'failed' }));
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(searchFilters).some((v) => v !== undefined);

  const columns: ColumnDef<PurchaseMeta>[] = [
    {
      accessorKey: 'platform',
      header: '플랫폼',
      size: 90,
      cell: ({ row }) => {
        const meta = PLATFORM_META[row.original.platform];
        return meta ? (
          <Badge variant={meta.variant}>{meta.text}</Badge>
        ) : (
          <Badge variant='softNeutral'>{row.original.platform}</Badge>
        );
      },
    },
    {
      accessorKey: 'username',
      header: '유저',
      size: 130,
      cell: ({ row }) => {
        const { username, userId } = row.original;
        return (
          <div className='flex items-center gap-1'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='max-w-[120px] truncate text-sm font-medium text-slate-900'>{username || userId}</span>
                </TooltipTrigger>
                <TooltipContent>{userId}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => copyToClipboard(userId, '유저 ID')}>
              <Copy className='h-3.5 w-3.5' />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'productId',
      header: '상품 ID',
      size: 150,
      cell: ({ row }) => {
        const value = row.original.productId;
        if (!value) return <span className='text-xs text-slate-500'>없음</span>;
        return (
          <div className='flex items-center gap-1'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='max-w-[120px] truncate font-mono text-sm text-slate-700'>{value}</span>
                </TooltipTrigger>
                <TooltipContent>{value}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => copyToClipboard(value, '상품 ID')}>
              <Copy className='h-3.5 w-3.5' />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'transactionId',
      header: '결제 ID',
      size: 160,
      cell: ({ row }) => {
        const value = row.original.transactionId;
        if (!value) return <span className='text-xs text-slate-500'>없음</span>;
        return (
          <div className='flex items-center gap-1'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='max-w-[120px] truncate font-mono text-sm text-slate-700'>{value}</span>
                </TooltipTrigger>
                <TooltipContent>{value}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => copyToClipboard(value, '결제 ID')}>
              <Copy className='h-3.5 w-3.5' />
            </Button>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: '상태',
      size: 80,
      cell: ({ row }) => {
        const s = resolveStatus(row.original);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      accessorKey: 'isProduction',
      header: '환경',
      size: 80,
      cell: ({ row }) => (
        <Badge variant={row.original.isProduction ? 'softNeutral' : 'softWarning'}>
          {row.original.isProduction ? 'PROD' : 'TEST'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '구매 시간',
      size: 150,
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        const diff = dayjs().diff(day, 'day');
        return (
          <div className='space-y-0.5'>
            <div className='text-sm tabular-nums text-slate-900'>{day.format('YYYY.MM.DD')}</div>
            <div className='text-[11px] tabular-nums text-slate-500'>
              {day.format('HH:mm')} · {diff}일 전
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'completedAt',
      header: '완료 시간',
      size: 140,
      cell: ({ row }) => {
        const value = row.original.completedAt;
        if (!value) return <span className='text-xs text-slate-500'>—</span>;
        const day = dayjs(value);
        return (
          <div className='space-y-0.5'>
            <div className='text-sm tabular-nums text-slate-900'>{day.format('YYYY.MM.DD')}</div>
            <div className='text-[11px] tabular-nums text-slate-500'>{day.format('HH:mm')}</div>
          </div>
        );
      },
    },
    {
      id: 'detail',
      header: '상세',
      size: 90,
      cell: ({ row }) => {
        const { log, receipt } = row.original;
        return (
          <div className='flex items-center gap-1'>
            {log ? (
              <Button variant='ghost' size='sm' className='h-8 px-2 text-xs text-slate-600' onClick={() => showDetail(log, '로그 상세')}>
                <Eye className='mr-1 h-3.5 w-3.5' />
                로그
              </Button>
            ) : null}
            {receipt ? (
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-2 text-xs text-slate-600'
                onClick={() => showDetail(receipt, '영수증 원문')}
              >
                <Eye className='mr-1 h-3.5 w-3.5' />
                영수증
              </Button>
            ) : null}
            {!log && !receipt ? <span className='text-xs text-slate-500'>없음</span> : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DefaultTableBtn className='justify-between'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className='flex flex-1 flex-wrap items-end gap-3'
        >
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>유저 ID</Label>
            <Input
              value={usernameKeyword}
              onChange={(e) => setUsernameKeyword(e.target.value)}
              placeholder='유저 ID 입력'
              className='w-[200px]'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>상태</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusValue)}>
              <SelectTrigger className='w-[110px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='success'>성공</SelectItem>
                <SelectItem value='failed'>실패</SelectItem>
                <SelectItem value='expired'>만료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>플랫폼</Label>
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformValue)}>
              <SelectTrigger className='w-[110px]'>
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger className='w-[100px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='prod'>PROD</SelectItem>
                <SelectItem value='test'>TEST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>날짜 범위</Label>
            <DatePickerWithRange
              startedAt={startedAt}
              endedAt={endedAt}
              setStartedAt={setStartedAt}
              setEndedAt={setEndedAt}
            />
          </div>

          <Button type='submit'>검색</Button>
          <Button type='button' variant='outline' onClick={showFailedOnly}>
            실패만 보기
          </Button>
          <Button type='button' variant='outline' onClick={handleReset}>
            초기화
          </Button>
          {hasActiveFilters ? <Badge variant='softNeutral'>필터 적용됨</Badge> : null}
        </form>
      </DefaultTableBtn>

      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        pagination={{
          total: totalPage * 20,
          page: currentPage,
          pageSize: 20,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{detailDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className='max-h-96 overflow-auto'>
            <pre className='whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700'>{detailDialog?.content}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PurchaseMetaList;
```

> 변경 요지: 옛 팔레트/배지 → slate + soft 배지, "만료 시간(추정)" 컬럼 → "완료 시간(completedAt)", 상태 규칙을 `resolveStatus`+`LEGACY_SUCCESS_BEFORE` 상수로, 상세에 영수증(receipt) 추가, 상태/플랫폼/환경 Select + "실패만 보기" 버튼.

- [ ] **Step 2: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "PurchaseMetaList" ; echo TSC_DONE`
Expected: 에러 줄 없음. (`Badge`의 softInfo/softNeutral/softSuccess/softDanger/softWarning, `Select`, `DataTable` 모두 기존 존재.)

- [ ] **Step 3: 빌드**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && pnpm build 2>&1 | grep -iE "Compiled successfully|Failed to compile|error|/product/purchase"`
Expected: `Compiled successfully` + `/product/purchase` 라인.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/premium/PurchaseMetaList.tsx
git commit -m "feat(iap): revamp purchase list — design system, completedAt column, filters"
```

---

## 최종 검증 (수동)

- [ ] 인앱 결제 내역 페이지가 space/user와 동일 톤(slate + soft 배지, 이모지 없음)
- [ ] "완료 시간" 컬럼이 실제 completedAt 표시(없으면 —), 추정 만료 컬럼 사라짐
- [ ] 상태 배지: 만료/성공/실패 규칙대로(2024-06-01 이전은 성공)
- [ ] 상태/플랫폼/환경 Select 필터 동작, "실패만 보기" 버튼이 실패 건만 표시
- [ ] AOS 결제가 "Android" 배지로 정상 표시(기존 버그 해소)
- [ ] 상세에서 로그·영수증(receipt) 원문 보기
- [ ] 초기화로 모든 필터 해제

> 푸시는 SSH로 직접. 스키마 변경 없음.
