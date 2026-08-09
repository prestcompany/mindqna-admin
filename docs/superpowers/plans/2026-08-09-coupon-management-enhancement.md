# Coupon Management Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins issue shared multi-use coupon codes with custom names and scheduled start dates, and manage them from a batch-oriented list instead of a flood of single-code rows.

**Architecture:** `Coupon` gains `batchId`, `issueMode`, `startAt`, `maxUseCount`, `useCount`; `CouponMeta` swaps `couponId @unique` for `@@unique([couponId, userId])`. Batch fields stay denormalized on every code row (approach A in the spec) so the live redemption path is barely touched. Capacity is enforced by a conditional `UPDATE` rather than a read-then-write. The admin list groups by `batchId` via one raw aggregate query; expanding a row lazily fetches its codes.

**Tech Stack:** NestJS + Prisma 5.8 + MySQL + jest (backend); Next.js 13 pages router + TanStack Query/Table + react-hook-form + zod + shadcn/ui + Tailwind (frontend).

**Spec:** `docs/superpowers/specs/2026-08-09-coupon-management-enhancement-design.md`
**Migration SQL:** `docs/superpowers/specs/2026-08-09-coupon-management-enhancement.sql` — applied manually by the operator, **not** by `prisma migrate`.

## Global Constraints

- Two repos. `mindqna-server` at `~/Documents/backend/mindqna-server`, `mindqna-admin` at `~/Documents/frontend/mindqna-admin`. Commit separately in each; never mix.
- **Never run `prisma migrate`, `prisma db push`, or any DDL.** The operator applies SQL manually. Only `npx prisma generate` is permitted.
- `maxUseCount = 0` means unlimited. Matches the existing `ticketDueDayNum = 0` → lifetime convention.
- `count` (individual issuance) is an integer 1–1000 inclusive.
- Coupon code pattern is exactly `^[A-Za-z0-9_-]{4,32}$`, normalized to uppercase before storage or comparison.
- `startAt` is stored at start of day, `dueAt` at end of day.
- A coupon granting `heart = 0`, `star = 0`, and `ticketCount = 0` is rejected.
- Status precedence is exactly `EXPIRED` → `SCHEDULED` → `EXHAUSTED` → `ACTIVE`. It is derived in SQL from one shared fragment used by both the projection and the filter; it is never re-derived in TypeScript.
- All user input reaching raw SQL must be bound through `Prisma.sql` tagged templates. String concatenation into a query is a defect.
- Redemption errors reuse existing codes: not-yet-started → `NotFoundException`, capacity exhausted → `AlreadyException`. No new error codes — the shipped app would render them as a generic failure.
- Frontend has no test runner. The verification cycle there is `npx tsc --noEmit` then `npm run lint`, plus the named manual check in each task. `next.config.js` sets `ignoreBuildErrors: true`, so `tsc` must be run directly.
- Frontend UI must follow `DESIGN.md`: plain numeric values are neutral text and never wrapped in `soft*` badges, status uses `dot*` badges, numbers carry `tabular-nums`, no emoji, no arbitrary sizes/durations/20px spacing.
- Commit messages: conventional commits, lowercase English subject.
- **Two transitional states are intended, not defects.** (a) Task 1 keeps `createCoupon`'s sequential insert loop so the schema change ships without behaviour change; Task 3 replaces it with a single `createMany`. (b) Tasks 3, 6 and 7 change service signatures while the controller still calls the old ones, so `tsc` does not pass again until Task 8. Only Tasks 1 and 8 assert a clean `tsc` in Phase A; Tasks 3–7 gate on `jest` alone. Do not "fix" either state early — doing so pulls later tasks forward and skips their reviews.
- **The transitional `tsc` break is allowed only in files the spec does not transitively import.** `package.json` runs `ts-jest` with no `isolatedModules` and no `diagnostics: false`, so it type-checks every file it transforms. `product.service.spec.ts` imports `product.service.ts`, which imports `types/product.types.ts` — a compile error anywhere in that chain fails the whole suite to even start ("Test suite failed to run", 0 tests), taking every pre-existing test down with it. `admin.controller.ts` is never imported by a spec, so its break is harmless. **Practical consequence:** when a task changes a type that an as-yet-unreplaced service method still uses, add the new type beside the old one and let the task that replaces the method delete the old one. Never leave `product.service.ts` uncompilable at a task boundary.

---

## File Structure

**`mindqna-server`**

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | new columns, enum, unique swap |
| `src/admin/product/coupon.utils.ts` | *new* — pure code generation, normalization, input validation |
| `src/admin/product/coupon.sql.ts` | *new* — shared `Prisma.sql` fragments for the batch aggregate and status derivation |
| `src/admin/product/product.service.ts` | batch list, code list, create, update, delete, stop |
| `src/admin/product/types/product.types.ts` | param and result types |
| `src/admin/admin.dto.ts` | request DTOs |
| `src/admin/admin.controller.ts` | routes |
| `src/premium/premium.service.ts` | redemption checks, capacity guard, transaction threading |
| `src/admin/test-utils/create-prisma-service.mock.ts` | mock surface for new Prisma calls |
| `src/admin/product/product.service.spec.ts` | service tests |
| `src/admin/product/coupon.utils.spec.ts` | *new* — pure function tests |

**`mindqna-admin`**

| File | Responsibility |
|---|---|
| `src/client/coupon.ts` | types + API calls |
| `src/hooks/useCoupons.ts` | batch list query |
| `src/hooks/useCouponBatchCodes.ts` | *new* — lazy code list query |
| `src/components/page/coupon/CouponStatusBadge.tsx` | *new* — status dot badge |
| `src/components/page/coupon/CouponUsageMeter.tsx` | *new* — fraction + 2px meter |
| `src/components/page/coupon/CouponRewardCell.tsx` | *new* — heart/star/ticket display |
| `src/components/page/coupon/CouponColumns.tsx` | *new* — column definitions |
| `src/components/page/coupon/CouponCodeList.tsx` | *new* — expanded region + clipboard copy |
| `src/components/page/coupon/CouponSummaryCard.tsx` | *new* — "이렇게 발급됩니다" card |
| `src/components/page/coupon/CouponForm.tsx` | rewritten — mode-branching form |
| `src/components/page/coupon/CouponList.tsx` | slimmed — filters, table, sheets, dialogs |
| `src/components/shared/ui/data-table.tsx` | one-line fix so the `expandable` prop actually expands (Task 15) |
| `src/components/layout/route-labels.ts` | align the page header with the sidebar label (Task 20) |

Column definitions move out of `CouponList.tsx` following the existing `PdfExportHistoryColumns.tsx` precedent. `CouponList.tsx` is currently 218 lines, 87 of them column definitions.

---

# Phase A — Backend (`mindqna-server`)

All Phase A work happens in `~/Documents/backend/mindqna-server`.

---

### Task 1: Prisma schema + keep existing code compiling

Schema-only changes break `createCoupon`, which no longer supplies the required `batchId`. This task lands the schema **and** a minimal patch preserving today's behaviour (one batch per coupon, single use), so the repo compiles and is deployable on its own.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/admin/product/product.service.ts` (`createCoupon`)

**Interfaces:**
- Produces: Prisma model `Coupon` with `batchId: string`, `issueMode: CouponIssueMode`, `startAt: Date`, `maxUseCount: number`, `useCount: number`; enum `CouponIssueMode = 'INDIVIDUAL' | 'SHARED'`; `CouponMeta` with `@@unique([couponId, userId])`.

- [ ] **Step 1: Update the schema**

In `prisma/schema.prisma`, add the enum above the `Coupon` model and replace both models:

```prisma
enum CouponIssueMode {
  INDIVIDUAL
  SHARED
}

model Coupon {
  id              Int             @id @default(autoincrement())
  batchId         String          @db.VarChar(36)
  name            String
  code            String          @unique
  issueMode       CouponIssueMode @default(INDIVIDUAL)
  startAt         DateTime        @default(now())
  dueAt           DateTime
  maxUseCount     Int             @default(1)
  useCount        Int             @default(0)
  heart           Int             @default(0)
  star            Int             @default(0)
  ticketCount     Int             @default(0)
  ticketDueDayNum Int             @default(0)
  createdAt       DateTime        @default(now())

  @@index([batchId])
}

model CouponMeta {
  id        Int      @id @default(autoincrement())
  couponId  Int
  userId    String
  spaceId   String
  createdAt DateTime @default(now())
  username  String

  @@unique([couponId, userId])
}
```

- [ ] **Step 2: Regenerate the client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` with no error. **Do not run `prisma migrate` or `prisma db push`.**

- [ ] **Step 3: Confirm the compile break**

Run: `npx tsc --noEmit`
Expected: FAIL — `createCoupon`'s `coupon.create({ data: ... })` is missing the required `batchId`.

- [ ] **Step 4: Patch `createCoupon` to compile with today's behaviour**

In `src/admin/product/product.service.ts`, add `randomUUID` to the imports:

```ts
import { randomUUID } from 'crypto';
```

Then in `createCoupon`, inside the existing loop, give each coupon its own batch and explicit defaults:

```ts
  async createCoupon(params: CreateCouponParams): Promise<void> {
    const { name, dueAt, heart, star, ticketCount, ticketDueDayNum, count } = params;
    const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

    for (let i = 0; i < count; i++) {
      const code = nanoid();
      await this.prisma.coupon.create({
        data: {
          batchId: randomUUID(),
          issueMode: 'INDIVIDUAL',
          startAt: dayjs().startOf('day').toDate(),
          maxUseCount: 1,
          name,
          dueAt: dayjs(dueAt).endOf('day').toDate(),
          heart,
          star,
          ticketCount,
          ticketDueDayNum,
          code,
        },
      });
    }
  }
```

- [ ] **Step 5: Verify the compile is clean**

Run: `npx tsc --noEmit`
Expected: PASS (exit 0, no output).

- [ ] **Step 6: Verify the existing suite still passes**

Run: `npx jest src/admin/product/product.service.spec.ts`
Expected: all existing tests PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/admin/product/product.service.ts
git commit -m "feat(coupon): add batch, schedule and capacity columns to the schema"
```

---

### Task 2: Pure coupon utilities

**Files:**
- Create: `src/admin/product/coupon.utils.ts`
- Create: `src/admin/product/coupon.utils.spec.ts`

**Interfaces:**
- Produces:
  - `normalizeCouponCode(raw: string): string`
  - `isValidCouponCode(code: string): boolean`
  - `generateCouponCodes(count: number): string[]`
  - `CouponInput` type and `assertCouponInput(input: CouponInput): void` (throws `BadRequestException`)

- [ ] **Step 1: Write the failing tests**

Create `src/admin/product/coupon.utils.spec.ts`:

`coupon.utils.ts` throws NestJS's `BadRequestException`, which is a real class from a real dependency, so this spec needs no module mock.

```ts
const {
  normalizeCouponCode,
  isValidCouponCode,
  generateCouponCodes,
  assertCouponInput,
} = require('./coupon.utils');

describe('normalizeCouponCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCouponCode('  summer2026 ')).toBe('SUMMER2026');
  });
});

describe('isValidCouponCode', () => {
  it('accepts alphanumerics, hyphen and underscore between 4 and 32 chars', () => {
    expect(isValidCouponCode('SUMMER2026')).toBe(true);
    expect(isValidCouponCode('A_B-1')).toBe(true);
  });

  it('rejects codes that are too short, too long, or contain other characters', () => {
    expect(isValidCouponCode('ABC')).toBe(false);
    expect(isValidCouponCode('A'.repeat(33))).toBe(false);
    expect(isValidCouponCode('SUMMER 2026')).toBe(false);
    expect(isValidCouponCode('SUMMER!')).toBe(false);
  });
});

describe('generateCouponCodes', () => {
  it('returns the requested number of distinct codes', () => {
    const codes = generateCouponCodes(50);
    expect(codes).toHaveLength(50);
    expect(new Set(codes).size).toBe(50);
  });

  it('returns codes that pass validation', () => {
    for (const code of generateCouponCodes(10)) {
      expect(isValidCouponCode(code)).toBe(true);
    }
  });
});

describe('assertCouponInput', () => {
  const valid = {
    issueMode: 'INDIVIDUAL' as const,
    count: 10,
    maxUseCount: 1,
    startAt: '2026-08-10',
    dueAt: '2026-09-30',
    heart: 100,
    star: 0,
    ticketCount: 0,
  };

  it('accepts a valid individual input', () => {
    expect(() => assertCouponInput(valid)).not.toThrow();
  });

  it('rejects a count below 1 or above 1000', () => {
    expect(() => assertCouponInput({ ...valid, count: 0 })).toThrow();
    expect(() => assertCouponInput({ ...valid, count: 1001 })).toThrow();
  });

  it('rejects a non-integer count', () => {
    expect(() => assertCouponInput({ ...valid, count: 1.5 })).toThrow();
  });

  it('rejects a start date after the due date', () => {
    expect(() => assertCouponInput({ ...valid, startAt: '2026-10-01' })).toThrow();
  });

  it('rejects a coupon that grants nothing', () => {
    expect(() => assertCouponInput({ ...valid, heart: 0, star: 0, ticketCount: 0 })).toThrow();
  });

  it('rejects a negative maxUseCount', () => {
    expect(() =>
      assertCouponInput({ ...valid, issueMode: 'SHARED', count: 1, maxUseCount: -1 }),
    ).toThrow();
  });

  it('accepts an unlimited shared coupon', () => {
    expect(() =>
      assertCouponInput({ ...valid, issueMode: 'SHARED', count: 1, maxUseCount: 0 }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/admin/product/coupon.utils.spec.ts`
Expected: FAIL — `Cannot find module './coupon.utils'`.

- [ ] **Step 3: Write the implementation**

Create `src/admin/product/coupon.utils.ts`:

```ts
import dayjs from 'dayjs';
import { customAlphabet } from 'nanoid';
import { BadRequestException } from '@nestjs/common';

const CODE_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE_LENGTH = 10;
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;

export const MAX_ISSUE_COUNT = 1000;

const nanoid = customAlphabet(CODE_ALPHABET, CODE_LENGTH);

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCouponCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** Distinct within the returned batch; collisions against stored codes are resolved by the caller. */
export function generateCouponCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(normalizeCouponCode(nanoid()));
  }
  return [...codes];
}

export type CouponInput = {
  issueMode: 'INDIVIDUAL' | 'SHARED';
  count: number;
  maxUseCount: number;
  startAt: string;
  dueAt: string;
  heart: number;
  star: number;
  ticketCount: number;
};

export function assertCouponInput(input: CouponInput): void {
  const { count, maxUseCount, startAt, dueAt, heart, star, ticketCount } = input;

  if (!Number.isInteger(count) || count < 1 || count > MAX_ISSUE_COUNT) {
    throw new BadRequestException(`발급 수량은 1 이상 ${MAX_ISSUE_COUNT} 이하의 정수여야 합니다.`);
  }

  if (!Number.isInteger(maxUseCount) || maxUseCount < 0) {
    throw new BadRequestException('최대 이용 횟수는 0 이상의 정수여야 합니다.');
  }

  const start = dayjs(startAt);
  const due = dayjs(dueAt);

  if (!start.isValid() || !due.isValid()) {
    throw new BadRequestException('사용 기간이 올바르지 않습니다.');
  }

  if (start.startOf('day').isAfter(due.endOf('day'))) {
    throw new BadRequestException('사용 시작일은 만료일보다 늦을 수 없습니다.');
  }

  if (heart <= 0 && star <= 0 && ticketCount <= 0) {
    throw new BadRequestException('코인 또는 티켓 보상을 하나 이상 설정해야 합니다.');
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/admin/product/coupon.utils.spec.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/product/coupon.utils.ts src/admin/product/coupon.utils.spec.ts
git commit -m "feat(coupon): add code generation and input validation helpers"
```

---

### Task 3: Rewrite `createCoupon` with mode normalization and batched insert

**Files:**
- Modify: `src/admin/product/types/product.types.ts`
- Modify: `src/admin/product/product.service.ts` (`createCoupon`)
- Modify: `src/admin/test-utils/create-prisma-service.mock.ts`
- Modify: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Consumes: `generateCouponCodes`, `normalizeCouponCode`, `isValidCouponCode`, `assertCouponInput`, `MAX_ISSUE_COUNT` from Task 2.
- Produces: `CreateCouponParams` (replaces the old shape) and `createCoupon(params: CreateCouponParams): Promise<void>`.

- [ ] **Step 1: Extend the Prisma mock**

In `src/admin/test-utils/create-prisma-service.mock.ts`, replace the `coupon` and `couponMeta` blocks:

```ts
    coupon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    couponMeta: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
```

- [ ] **Step 2: Replace the param types**

In `src/admin/product/types/product.types.ts`, replace `CreateCouponParams` and `UpdateCouponParams`:

```ts
export type CouponIssueModeValue = 'INDIVIDUAL' | 'SHARED';

export type CreateCouponParams = {
  name: string;
  issueMode: CouponIssueModeValue;
  startAt: string;
  dueAt: string;
  count?: number;
  code?: string;
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export type UpdateCouponBatchParams = {
  batchId: string;
  name: string;
  startAt: string;
  dueAt: string;
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};
```

Leave `GetCouponsParams` in place; Task 4 extends it.

- [ ] **Step 3: Write the failing tests**

Leave the existing `jest.mock('src/common/exception/error', ...)` block untouched. `product.service.ts` imports only `NotFoundException` from that catalog; its `BadRequestException` comes from `@nestjs/common`, which is a real dependency and needs no mock.

Add `createCoupon` to the `ProductAdminService` type block in `src/admin/product/product.service.spec.ts`:

```ts
    createCoupon: (params: {
      name: string;
      issueMode: 'INDIVIDUAL' | 'SHARED';
      startAt: string;
      dueAt: string;
      count?: number;
      code?: string;
      maxUseCount?: number;
      heart: number;
      star: number;
      ticketCount: number;
      ticketDueDayNum: number;
    }) => Promise<void>;
```

Add this partial mock alongside the other `jest.mock` calls at the top of the file. It keeps every real implementation and makes only the code generator controllable, so the collision test below can force the retry path:

```ts
jest.mock('./coupon.utils', () => {
  const actual = jest.requireActual('./coupon.utils');
  return { ...actual, generateCouponCodes: jest.fn(actual.generateCouponCodes) };
});

const couponUtils = require('./coupon.utils') as {
  generateCouponCodes: jest.Mock;
};
```

Then append this describe block:

```ts
describe('createCoupon', () => {
  const base = {
    name: '여름 이벤트',
    startAt: '2026-08-10',
    dueAt: '2026-09-30',
    heart: 100,
    star: 0,
    ticketCount: 0,
    ticketDueDayNum: 0,
  };

  beforeEach(() => {
    couponUtils.generateCouponCodes.mockReset();
    couponUtils.generateCouponCodes.mockImplementation(
      jest.requireActual('./coupon.utils').generateCouponCodes,
    );
    prisma.coupon.findMany.mockResolvedValue([]);
    prisma.coupon.createMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation(async (callback: (tx: PrismaServiceMock) => Promise<unknown>) =>
      callback(prisma),
    );
  });

  it('creates one row per code for an individual batch and forces maxUseCount to 1', async () => {
    await service.createCoupon({ ...base, issueMode: 'INDIVIDUAL', count: 3 });

    expect(prisma.coupon.createMany).toHaveBeenCalledTimes(1);
    const { data } = prisma.coupon.createMany.mock.calls[0][0];
    expect(data).toHaveLength(3);
    expect(data.every((row: any) => row.maxUseCount === 1)).toBe(true);
    expect(data.every((row: any) => row.issueMode === 'INDIVIDUAL')).toBe(true);
    expect(new Set(data.map((row: any) => row.batchId)).size).toBe(1);
  });

  it('ignores a supplied code in individual mode', async () => {
    await service.createCoupon({ ...base, issueMode: 'INDIVIDUAL', count: 2, code: 'SUMMER2026' });

    const { data } = prisma.coupon.createMany.mock.calls[0][0];
    expect(data.map((row: any) => row.code)).not.toContain('SUMMER2026');
  });

  it('creates exactly one row for a shared batch and keeps the supplied code uppercased', async () => {
    await service.createCoupon({
      ...base,
      issueMode: 'SHARED',
      code: ' summer2026 ',
      maxUseCount: 100,
      count: 50,
    });

    const { data } = prisma.coupon.createMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    expect(data[0].code).toBe('SUMMER2026');
    expect(data[0].maxUseCount).toBe(100);
  });

  it('rejects a shared code that is already taken', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ code: 'SUMMER2026' }]);

    await expect(
      service.createCoupon({ ...base, issueMode: 'SHARED', code: 'SUMMER2026', maxUseCount: 10 }),
    ).rejects.toThrow();
    expect(prisma.coupon.createMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid shared code', async () => {
    await expect(
      service.createCoupon({ ...base, issueMode: 'SHARED', code: 'AB', maxUseCount: 10 }),
    ).rejects.toThrow();
  });

  // Random codes will never collide by chance, so the generator is controlled
  // here — otherwise this test would pass without ever entering the retry path.
  it('regenerates random codes that collide with stored ones and still inserts once', async () => {
    couponUtils.generateCouponCodes
      .mockReturnValueOnce(['TAKEN00001', 'FRESH00002'])
      .mockReturnValueOnce(['FRESH00003']);
    prisma.coupon.findMany
      .mockResolvedValueOnce([{ code: 'TAKEN00001' }])
      .mockResolvedValueOnce([]);

    await service.createCoupon({ ...base, issueMode: 'INDIVIDUAL', count: 2 });

    const { data } = prisma.coupon.createMany.mock.calls[0][0];
    expect(couponUtils.generateCouponCodes).toHaveBeenCalledTimes(2);
    expect(prisma.coupon.createMany).toHaveBeenCalledTimes(1);
    expect(data.map((row: any) => row.code).sort()).toEqual(['FRESH00002', 'FRESH00003']);
  });

  it('rejects a count above the limit', async () => {
    await expect(
      service.createCoupon({ ...base, issueMode: 'INDIVIDUAL', count: 1001 }),
    ).rejects.toThrow();
  });

  it('rejects a coupon that grants nothing', async () => {
    await expect(
      service.createCoupon({
        ...base,
        issueMode: 'INDIVIDUAL',
        count: 1,
        heart: 0,
        star: 0,
        ticketCount: 0,
      }),
    ).rejects.toThrow();
  });

  it('stores startAt at the start of the day and dueAt at the end of the day', async () => {
    await service.createCoupon({ ...base, issueMode: 'INDIVIDUAL', count: 1 });

    const { data } = prisma.coupon.createMany.mock.calls[0][0];
    expect(data[0].startAt.getHours()).toBe(0);
    expect(data[0].dueAt.getHours()).toBe(23);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx jest src/admin/product/product.service.spec.ts -t createCoupon`
Expected: FAIL — the current implementation calls `coupon.create` in a loop, so `createMany` is never called.

- [ ] **Step 5: Write the implementation**

In `src/admin/product/product.service.ts`, replace `createCoupon` and add the imports:

```ts
import { randomUUID } from 'crypto';
import {
  assertCouponInput,
  generateCouponCodes,
  isValidCouponCode,
  normalizeCouponCode,
} from './coupon.utils';
import { BadRequestException } from '@nestjs/common';
```

```ts
  async createCoupon(params: CreateCouponParams): Promise<void> {
    const { name, issueMode, startAt, dueAt, heart, star, ticketCount, ticketDueDayNum } = params;

    // Normalize by mode first so a malformed client cannot produce incoherent rows.
    const count = issueMode === 'SHARED' ? 1 : (params.count ?? 0);
    const maxUseCount = issueMode === 'SHARED' ? (params.maxUseCount ?? 0) : 1;
    const requestedCode = issueMode === 'SHARED' && params.code ? normalizeCouponCode(params.code) : undefined;

    assertCouponInput({ issueMode, count, maxUseCount, startAt, dueAt, heart, star, ticketCount });

    if (requestedCode !== undefined && !isValidCouponCode(requestedCode)) {
      throw new BadRequestException('쿠폰 코드는 영문/숫자/-/_ 4~32자여야 합니다.');
    }

    const codes = requestedCode ? [requestedCode] : await this.reserveCouponCodes(count);

    const batchId = randomUUID();
    const startDate = dayjs(startAt).startOf('day').toDate();
    const dueDate = dayjs(dueAt).endOf('day').toDate();

    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.createMany({
        data: codes.map((code) => ({
          batchId,
          issueMode,
          name,
          code,
          startAt: startDate,
          dueAt: dueDate,
          maxUseCount,
          useCount: 0,
          heart,
          star,
          ticketCount,
          ticketDueDayNum,
        })),
      });
    });
  }

  /** Generates `count` codes and regenerates any that already exist. */
  private async reserveCouponCodes(count: number): Promise<string[]> {
    const reserved = new Set<string>();

    while (reserved.size < count) {
      const candidates = generateCouponCodes(count - reserved.size).filter((code) => !reserved.has(code));
      const taken = await this.prisma.coupon.findMany({
        where: { code: { in: candidates } },
        select: { code: true },
      });
      const takenSet = new Set(taken.map((row) => normalizeCouponCode(row.code)));

      for (const code of candidates) {
        if (!takenSet.has(code)) reserved.add(code);
      }
    }

    return [...reserved];
  }
```

For the supplied-code path, add the collision check before the transaction:

```ts
    if (requestedCode) {
      const existing = await this.prisma.coupon.findMany({
        where: { code: { in: [requestedCode] } },
        select: { code: true },
      });
      if (existing.length > 0) throw new BadRequestException('이미 사용 중인 쿠폰 코드입니다.');
    }
```

Place this immediately after the `isValidCouponCode` guard, before `const codes = ...`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/admin/product/product.service.spec.ts -t createCoupon`
Expected: all PASS.

- [ ] **Step 7: Verify the whole suite and types**

Run: `npx jest src/admin/product/product.service.spec.ts && npx tsc --noEmit`
Expected: tests PASS, tsc exits 0.

`tsc` will report errors in `admin.controller.ts` because `CreateCouponParams` changed shape. Task 8 fixes the controller. If that is the only failure, note it and proceed — otherwise fix it here.

- [ ] **Step 8: Commit**

```bash
git add src/admin/product/product.service.ts src/admin/product/types/product.types.ts \
        src/admin/test-utils/create-prisma-service.mock.ts src/admin/product/product.service.spec.ts
git commit -m "feat(coupon): issue coupons by mode with a single batched insert"
```

---

### Task 4: Batch list query

**Files:**
- Create: `src/admin/product/coupon.sql.ts`
- Modify: `src/admin/product/types/product.types.ts`
- Modify: `src/admin/product/product.service.ts` (`getCoupons`)
- Modify: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Produces: `CouponBatchItem` type and `getCoupons(params: GetCouponsParams): Promise<{ items: CouponBatchItem[]; pageInfo: PageInfo }>` where `GetCouponsParams = { page: number; search?: string; status?: CouponStatus }`.

- [ ] **Step 1: Write the shared SQL fragments**

Create `src/admin/product/coupon.sql.ts`:

```ts
import { Prisma } from '@prisma/client';

export type CouponStatus = 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';

export const COUPON_STATUSES: CouponStatus[] = ['SCHEDULED', 'ACTIVE', 'EXHAUSTED', 'EXPIRED'];

/**
 * Status derivation. Precedence is EXPIRED > SCHEDULED > EXHAUSTED > ACTIVE:
 * an expired batch can also be full, and "expired" is the more accurate thing
 * to show an admin. Used by both the projection and the filter so the column
 * an admin reads and the filter they apply can never disagree.
 */
export const COUPON_STATUS_SQL = Prisma.sql`
  CASE
    WHEN NOW(3) > b.dueAt THEN 'EXPIRED'
    WHEN NOW(3) < b.startAt THEN 'SCHEDULED'
    WHEN b.capacity > 0 AND b.usedCount >= b.capacity THEN 'EXHAUSTED'
    ELSE 'ACTIVE'
  END
`;

/**
 * One row per batch. Every row inside a batch carries identical name, dates and
 * rewards (approach A in the spec), so MIN() is a safe representative pick.
 */
export const couponBatchSubquery = (searchFilter: Prisma.Sql) => Prisma.sql`
  SELECT
    c.batchId                                                                     AS batchId,
    MIN(c.name)                                                                   AS name,
    MIN(c.issueMode)                                                              AS issueMode,
    CASE WHEN MIN(c.issueMode) = 'SHARED' THEN MIN(c.code) ELSE NULL END          AS code,
    COUNT(*)                                                                      AS codeCount,
    CAST(SUM(c.useCount) AS SIGNED)                                               AS usedCount,
    CASE WHEN MIN(c.issueMode) = 'SHARED' THEN MIN(c.maxUseCount) ELSE COUNT(*) END AS capacity,
    MIN(c.startAt)                                                                AS startAt,
    MIN(c.dueAt)                                                                  AS dueAt,
    MIN(c.createdAt)                                                              AS createdAt,
    MIN(c.heart)                                                                  AS heart,
    MIN(c.star)                                                                   AS star,
    MIN(c.ticketCount)                                                            AS ticketCount,
    MIN(c.ticketDueDayNum)                                                        AS ticketDueDayNum
  FROM \`Coupon\` c
  ${searchFilter}
  GROUP BY c.batchId
`;

/** Matches name, code or redeeming username, and returns the whole batch a match belongs to. */
export const couponSearchFilter = (search?: string): Prisma.Sql => {
  const trimmed = search?.trim();
  if (!trimmed) return Prisma.empty;

  const like = `%${trimmed}%`;
  return Prisma.sql`
    WHERE c.batchId IN (
      SELECT c2.batchId
        FROM \`Coupon\` c2
        LEFT JOIN \`CouponMeta\` m ON m.couponId = c2.id
       WHERE c2.name LIKE ${like}
          OR c2.code LIKE ${like}
          OR m.username LIKE ${like}
    )
  `;
};

export const couponStatusFilter = (status?: CouponStatus): Prisma.Sql =>
  status ? Prisma.sql`WHERE ${COUPON_STATUS_SQL} = ${status}` : Prisma.empty;
```

- [ ] **Step 2: Write the failing tests**

Add `getCoupons` to the service type block in the spec (replacing the existing entry):

```ts
    getCoupons: (params: {
      page: number;
      search?: string;
      status?: 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
    }) => Promise<any>;
```

Append:

```ts
describe('getCoupons', () => {
  const row = {
    batchId: 'b-1',
    name: '여름 이벤트',
    issueMode: 'INDIVIDUAL',
    code: null,
    codeCount: 100n,
    usedCount: 37n,
    capacity: 100n,
    status: 'ACTIVE',
    startAt: new Date('2026-07-01T00:00:00.000Z'),
    dueAt: new Date('2026-08-31T23:59:59.000Z'),
    createdAt: new Date('2026-06-28T10:00:00.000Z'),
    heart: 100,
    star: 0,
    ticketCount: 1,
    ticketDueDayNum: 30,
  };

  it('returns batch rows with numeric aggregates coerced from BigInt', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([row]).mockResolvedValueOnce([{ total: 1n }]);

    const result = await service.getCoupons({ page: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].codeCount).toBe(100);
    expect(result.items[0].usedCount).toBe(37);
    expect(result.items[0].capacity).toBe(100);
    expect(typeof result.items[0].codeCount).toBe('number');
  });

  it('reports pagination from the batch count, not the code count', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([row]).mockResolvedValueOnce([{ total: 25n }]);

    const result = await service.getCoupons({ page: 1 });

    expect(result.pageInfo.totalPage).toBe(3);
    expect(result.pageInfo.hasNext).toBe(true);
  });

  it('passes the search term through as a bound parameter', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    await service.getCoupons({ page: 1, search: 'SUMMER' });

    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.values).toContain('%SUMMER%');
    expect(sql.sql).not.toContain('SUMMER');
  });

  it('passes the status filter through as a bound parameter', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    await service.getCoupons({ page: 1, status: 'EXPIRED' });

    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.values).toContain('EXPIRED');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/admin/product/product.service.spec.ts -t getCoupons`
Expected: FAIL — the current implementation uses `coupon.findMany`, not `$queryRaw`.

- [ ] **Step 4: Add the result type**

In `src/admin/product/types/product.types.ts`:

```ts
import type { CouponStatus } from '../coupon.sql';

export type GetCouponsParams = {
  page: number;
  search?: string;
  status?: CouponStatus;
};

export type CouponBatchItem = {
  batchId: string;
  name: string;
  issueMode: CouponIssueModeValue;
  code: string | null;
  codeCount: number;
  usedCount: number;
  capacity: number;
  status: CouponStatus;
  startAt: Date;
  dueAt: Date;
  createdAt: Date;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};
```

- [ ] **Step 5: Write the implementation**

In `src/admin/product/product.service.ts`, replace `getCoupons`:

```ts
  async getCoupons(params: GetCouponsParams): Promise<{ items: CouponBatchItem[]; pageInfo: PageInfo }> {
    const { page, search, status } = params;
    const offset = 10;

    const searchFilter = couponSearchFilter(search);
    const statusFilter = couponStatusFilter(status);
    const subquery = couponBatchSubquery(searchFilter);

    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      SELECT b.*, ${COUPON_STATUS_SQL} AS status
        FROM (${subquery}) b
        ${statusFilter}
       ORDER BY b.createdAt DESC
       LIMIT ${offset} OFFSET ${(page - 1) * offset}
    `);

    const [countRow] = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total FROM (${subquery}) b ${statusFilter}
    `);

    const toNumber = (value: unknown) => Number(value ?? 0);

    const items = rows.map((row) => ({
      ...row,
      codeCount: toNumber(row.codeCount),
      usedCount: toNumber(row.usedCount),
      capacity: toNumber(row.capacity),
      heart: toNumber(row.heart),
      star: toNumber(row.star),
      ticketCount: toNumber(row.ticketCount),
      ticketDueDayNum: toNumber(row.ticketDueDayNum),
    })) as CouponBatchItem[];

    const totals = Number(countRow?.total ?? 0);
    const totalPage = Math.ceil(totals / offset);

    return { items, pageInfo: { totalPage, hasNext: page < totalPage, endCursor: undefined } };
  }
```

Add to the imports:

```ts
import { Prisma } from '@prisma/client';
import { COUPON_STATUS_SQL, couponBatchSubquery, couponSearchFilter, couponStatusFilter } from './coupon.sql';
```

MySQL returns `COUNT`/`SUM` as `BigInt` through Prisma, which does not survive JSON serialization — the `toNumber` mapping is required, not cosmetic.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/admin/product/product.service.spec.ts -t getCoupons`
Expected: all PASS.

The mocked `$queryRaw` proves the mapping and the parameter binding, not that the SQL is valid MySQL. Two things stay unproven until the dev check in Task 11: whether the nested `Prisma.Sql` subquery renders correctly, and whether `LIMIT ?` / `OFFSET ?` bind as prepared-statement parameters on this MySQL version. If Task 11 reports a syntax error near `LIMIT`, inline those two integers with `Prisma.raw(String(n))` — they are computed server-side from a validated page number, never taken from user input, so that stays injection-safe.

- [ ] **Step 7: Commit**

```bash
git add src/admin/product/coupon.sql.ts src/admin/product/product.service.ts \
        src/admin/product/types/product.types.ts src/admin/product/product.service.spec.ts
git commit -m "feat(coupon): group the admin coupon list by issue batch"
```

---

### Task 5: Batch code list

**Files:**
- Modify: `src/admin/product/types/product.types.ts`
- Modify: `src/admin/product/product.service.ts`
- Modify: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Produces: `getCouponBatchCodes(params: { batchId: string; page: number; all?: boolean }): Promise<{ items: CouponCodeItem[]; pageInfo: PageInfo }>` with `CouponCodeItem = { codeId: number; code: string; username: string | null; usedAt: Date | null }`.

- [ ] **Step 1: Write the failing tests**

Add to the service type block:

```ts
    getCouponBatchCodes: (params: { batchId: string; page: number; all?: boolean }) => Promise<any>;
```

Append:

```ts
describe('getCouponBatchCodes', () => {
  it('returns one row per code for an individual batch, with null username when unused', async () => {
    prisma.coupon.findMany.mockResolvedValue([
      { id: 1, code: 'A8KD0ZQ1PX', issueMode: 'INDIVIDUAL' },
      { id: 2, code: 'B2MN7YRT4W', issueMode: 'INDIVIDUAL' },
    ]);
    prisma.couponMeta.findMany.mockResolvedValue([
      { couponId: 1, username: 'hanjune', createdAt: new Date('2026-06-03T14:22:00.000Z') },
    ]);
    prisma.coupon.count.mockResolvedValue(2);

    const result = await service.getCouponBatchCodes({ batchId: 'b-1', page: 1 });

    expect(result.items).toEqual([
      { codeId: 1, code: 'A8KD0ZQ1PX', username: 'hanjune', usedAt: new Date('2026-06-03T14:22:00.000Z') },
      { codeId: 2, code: 'B2MN7YRT4W', username: null, usedAt: null },
    ]);
  });

  it('returns one row per redemption for a shared batch', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ id: 9, code: 'SUMMER2026', issueMode: 'SHARED' }]);
    prisma.couponMeta.findMany.mockResolvedValue([
      { couponId: 9, username: 'hanjune', createdAt: new Date('2026-08-02T09:00:00.000Z') },
      { couponId: 9, username: 'minsu', createdAt: new Date('2026-08-03T09:00:00.000Z') },
    ]);
    prisma.couponMeta.count.mockResolvedValue(2);

    const result = await service.getCouponBatchCodes({ batchId: 'b-2', page: 1 });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item: any) => item.code === 'SUMMER2026')).toBe(true);
    expect(result.items.map((item: any) => item.username)).toEqual(['hanjune', 'minsu']);
  });

  it('returns every code without pagination when all is set', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ id: 1, code: 'A8KD0ZQ1PX', issueMode: 'INDIVIDUAL' }]);
    prisma.couponMeta.findMany.mockResolvedValue([]);
    prisma.coupon.count.mockResolvedValue(1);

    await service.getCouponBatchCodes({ batchId: 'b-1', page: 1, all: true });

    const args = prisma.coupon.findMany.mock.calls[0][0];
    expect(args.take).toBeUndefined();
    expect(args.skip).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/admin/product/product.service.spec.ts -t getCouponBatchCodes`
Expected: FAIL — `service.getCouponBatchCodes is not a function`.

- [ ] **Step 3: Add the type**

In `src/admin/product/types/product.types.ts`:

```ts
export type CouponCodeItem = {
  codeId: number;
  code: string;
  username: string | null;
  usedAt: Date | null;
};
```

- [ ] **Step 4: Write the implementation**

Add to `src/admin/product/product.service.ts`:

```ts
  async getCouponBatchCodes(params: {
    batchId: string;
    page: number;
    all?: boolean;
  }): Promise<{ items: CouponCodeItem[]; pageInfo: PageInfo }> {
    const { batchId, page, all } = params;
    const offset = 20;

    const pageArgs = all ? {} : { skip: (page - 1) * offset, take: offset };

    const codes = await this.prisma.coupon.findMany({
      where: { batchId },
      orderBy: { id: 'asc' },
      select: { id: true, code: true, issueMode: true },
      ...pageArgs,
    });

    const isShared = codes[0]?.issueMode === 'SHARED';

    const metas = await this.prisma.couponMeta.findMany({
      where: { couponId: { in: codes.map((row) => row.id) } },
      orderBy: { createdAt: 'asc' },
      select: { couponId: true, username: true, createdAt: true },
    });

    // Shared batches hold one code redeemed many times, so the rows are the
    // redemptions. Individual batches hold many single-use codes, so the rows
    // are the codes. One response shape serves both.
    const items: CouponCodeItem[] = isShared
      ? metas.map((meta) => ({
          codeId: meta.couponId,
          code: codes.find((row) => row.id === meta.couponId)?.code ?? '',
          username: meta.username,
          usedAt: meta.createdAt,
        }))
      : codes.map((row) => {
          const meta = metas.find((item) => item.couponId === row.id);
          return {
            codeId: row.id,
            code: row.code,
            username: meta?.username ?? null,
            usedAt: meta?.createdAt ?? null,
          };
        });

    const totals = isShared
      ? await this.prisma.couponMeta.count({ where: { couponId: { in: codes.map((row) => row.id) } } })
      : await this.prisma.coupon.count({ where: { batchId } });

    const totalPage = all ? 1 : Math.ceil(totals / offset);

    return { items, pageInfo: { totalPage, hasNext: page < totalPage, endCursor: undefined } };
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/admin/product/product.service.spec.ts -t getCouponBatchCodes`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/product/product.service.ts src/admin/product/types/product.types.ts \
        src/admin/product/product.service.spec.ts
git commit -m "feat(coupon): expose the code list for an issue batch"
```

---

### Task 6: Batch update with locked fields

**Files:**
- Modify: `src/admin/product/product.service.ts`
- Modify: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Consumes: `UpdateCouponBatchParams` from Task 3.
- Produces: `updateCouponBatch(params: UpdateCouponBatchParams): Promise<void>`. Replaces `updateCoupon`.

- [ ] **Step 1: Write the failing tests**

Add to the service type block:

```ts
    updateCouponBatch: (params: {
      batchId: string;
      name: string;
      startAt: string;
      dueAt: string;
      maxUseCount?: number;
      heart: number;
      star: number;
      ticketCount: number;
      ticketDueDayNum: number;
    }) => Promise<void>;
```

Append:

```ts
describe('updateCouponBatch', () => {
  const existing = {
    batchId: 'b-1',
    issueMode: 'SHARED' as const,
    name: '여름 이벤트',
    startAt: new Date('2099-01-01T00:00:00.000Z'),
    dueAt: new Date('2099-12-31T23:59:59.000Z'),
    maxUseCount: 100,
    useCount: 0,
    heart: 100,
    star: 0,
    ticketCount: 0,
    ticketDueDayNum: 0,
  };

  const patch = {
    batchId: 'b-1',
    name: '여름 이벤트 (연장)',
    startAt: '2099-01-01',
    dueAt: '2099-12-31',
    maxUseCount: 200,
    heart: 100,
    star: 0,
    ticketCount: 0,
    ticketDueDayNum: 0,
  };

  beforeEach(() => {
    prisma.coupon.updateMany.mockResolvedValue({ count: 1 });
  });

  it('updates every code in the batch in one statement', async () => {
    prisma.coupon.findMany.mockResolvedValue([existing]);

    await service.updateCouponBatch(patch);

    expect(prisma.coupon.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.coupon.updateMany.mock.calls[0][0].where).toEqual({ batchId: 'b-1' });
  });

  it('rejects a reward change once someone has redeemed', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ ...existing, useCount: 12 }]);

    await expect(service.updateCouponBatch({ ...patch, heart: 50 })).rejects.toThrow();
    expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
  });

  it('allows a reward change while nobody has redeemed', async () => {
    prisma.coupon.findMany.mockResolvedValue([existing]);

    await expect(service.updateCouponBatch({ ...patch, heart: 50 })).resolves.toBeUndefined();
  });

  it('rejects lowering maxUseCount below the current usage', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ ...existing, useCount: 30 }]);

    await expect(service.updateCouponBatch({ ...patch, maxUseCount: 20 })).rejects.toThrow();
  });

  it('allows raising maxUseCount above the current usage', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ ...existing, useCount: 30 }]);

    await expect(service.updateCouponBatch({ ...patch, maxUseCount: 500 })).resolves.toBeUndefined();
  });

  it('ignores maxUseCount for an individual batch', async () => {
    prisma.coupon.findMany.mockResolvedValue([
      { ...existing, issueMode: 'INDIVIDUAL', maxUseCount: 1, useCount: 1 },
    ]);

    await service.updateCouponBatch({ ...patch, maxUseCount: 999 });

    expect(prisma.coupon.updateMany.mock.calls[0][0].data.maxUseCount).toBeUndefined();
  });

  it('rejects moving startAt once the batch has already started', async () => {
    prisma.coupon.findMany.mockResolvedValue([
      { ...existing, startAt: new Date('2020-01-01T00:00:00.000Z') },
    ]);

    await expect(service.updateCouponBatch({ ...patch, startAt: '2030-01-01' })).rejects.toThrow();
  });

  it('rejects an unknown batch', async () => {
    prisma.coupon.findMany.mockResolvedValue([]);

    await expect(service.updateCouponBatch(patch)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/admin/product/product.service.spec.ts -t updateCouponBatch`
Expected: FAIL — `service.updateCouponBatch is not a function`.

- [ ] **Step 3: Write the implementation**

Task 3 kept `UpdateCouponParams` alive in `types/product.types.ts` because `updateCoupon` still referenced it and a broken type chain collapses the whole jest suite (see Global Constraints). This task removes the last reference, so **delete `UpdateCouponParams` from `types/product.types.ts` here**, along with its retention comment.

In `src/admin/product/product.service.ts`, delete `updateCoupon` and add:

```ts
  async updateCouponBatch(params: UpdateCouponBatchParams): Promise<void> {
    const { batchId, name, startAt, dueAt, heart, star, ticketCount, ticketDueDayNum } = params;

    const codes = await this.prisma.coupon.findMany({ where: { batchId } });
    if (codes.length === 0) throw NotFoundException();

    const head = codes[0];
    const usedCount = codes.reduce((sum, row) => sum + row.useCount, 0);
    const peakUseCount = Math.max(...codes.map((row) => row.useCount));
    const isShared = head.issueMode === 'SHARED';

    const rewardsChanged =
      head.heart !== heart ||
      head.star !== star ||
      head.ticketCount !== ticketCount ||
      head.ticketDueDayNum !== ticketDueDayNum;

    // Once anyone has redeemed, two users would otherwise receive different
    // amounts from the same named coupon, which makes CS unanswerable.
    if (usedCount > 0 && rewardsChanged) {
      throw new BadRequestException('이미 사용된 쿠폰의 보상은 변경할 수 없습니다.');
    }

    // Compare on the calendar day, not the Date instance: the stored value is a
    // start-of-day DATETIME and an instant comparison would report an untouched
    // field as changed, wrongly rejecting an edit that only extends the due date.
    const nextStart = dayjs(startAt).startOf('day');
    const startChanged = nextStart.format('YYYY-MM-DD') !== dayjs(head.startAt).format('YYYY-MM-DD');

    if (startChanged && dayjs().isAfter(dayjs(head.startAt))) {
      throw new BadRequestException('이미 시작된 쿠폰의 시작일은 변경할 수 없습니다.');
    }

    let nextMaxUseCount: number | undefined;
    if (isShared && params.maxUseCount !== undefined) {
      if (!Number.isInteger(params.maxUseCount) || params.maxUseCount < 0) {
        throw new BadRequestException('최대 이용 횟수는 0 이상의 정수여야 합니다.');
      }
      if (params.maxUseCount !== 0 && params.maxUseCount < peakUseCount) {
        throw new BadRequestException(`이미 ${peakUseCount}명이 사용해 그보다 낮출 수 없습니다.`);
      }
      nextMaxUseCount = params.maxUseCount;
    }

    await this.prisma.coupon.updateMany({
      where: { batchId },
      data: {
        name,
        startAt: nextStart.toDate(),
        dueAt: dayjs(dueAt).endOf('day').toDate(),
        heart,
        star,
        ticketCount,
        ticketDueDayNum,
        ...(nextMaxUseCount !== undefined ? { maxUseCount: nextMaxUseCount } : {}),
      },
    });
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/admin/product/product.service.spec.ts -t updateCouponBatch`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/product/product.service.ts src/admin/product/product.service.spec.ts
git commit -m "feat(coupon): restrict batch edits once a coupon has been redeemed"
```

---

### Task 7: Batch delete and stop

**Files:**
- Modify: `src/admin/product/product.service.ts`
- Modify: `src/admin/product/product.service.spec.ts`

**Interfaces:**
- Produces: `removeCouponBatch(batchId: string): Promise<{ deleted: number; kept: number }>` and `stopCouponBatch(batchId: string): Promise<void>`. Replaces `removeCoupon`.

- [ ] **Step 1: Write the failing tests**

Add to the service type block:

```ts
    removeCouponBatch: (batchId: string) => Promise<{ deleted: number; kept: number }>;
    stopCouponBatch: (batchId: string) => Promise<void>;
```

Append:

```ts
describe('removeCouponBatch', () => {
  it('deletes only unused codes and reports what was kept', async () => {
    prisma.coupon.findMany.mockResolvedValue([
      { id: 1, useCount: 0 },
      { id: 2, useCount: 1 },
      { id: 3, useCount: 0 },
    ]);
    prisma.coupon.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removeCouponBatch('b-1');

    expect(prisma.coupon.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [1, 3] } } });
    expect(result).toEqual({ deleted: 2, kept: 1 });
  });

  it('deletes nothing when every code has been redeemed', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ id: 1, useCount: 1 }]);

    const result = await service.removeCouponBatch('b-1');

    expect(prisma.coupon.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: 0, kept: 1 });
  });

  it('rejects an unknown batch', async () => {
    prisma.coupon.findMany.mockResolvedValue([]);

    await expect(service.removeCouponBatch('nope')).rejects.toThrow();
  });
});

describe('stopCouponBatch', () => {
  it('moves the due date to now across the batch', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ id: 1, useCount: 0 }]);
    prisma.coupon.updateMany.mockResolvedValue({ count: 1 });

    await service.stopCouponBatch('b-1');

    const args = prisma.coupon.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ batchId: 'b-1' });
    expect(args.data.dueAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown batch', async () => {
    prisma.coupon.findMany.mockResolvedValue([]);

    await expect(service.stopCouponBatch('nope')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/admin/product/product.service.spec.ts -t CouponBatch`
Expected: FAIL for the two new describes.

- [ ] **Step 3: Write the implementation**

In `src/admin/product/product.service.ts`, delete `removeCoupon` and add:

```ts
  /** Redeemed codes are retained so CouponMeta history never orphans. */
  async removeCouponBatch(batchId: string): Promise<{ deleted: number; kept: number }> {
    const codes = await this.prisma.coupon.findMany({
      where: { batchId },
      select: { id: true, useCount: true },
    });
    if (codes.length === 0) throw NotFoundException();

    const removable = codes.filter((row) => row.useCount === 0).map((row) => row.id);
    const kept = codes.length - removable.length;

    if (removable.length === 0) return { deleted: 0, kept };

    const result = await this.prisma.coupon.deleteMany({ where: { id: { in: removable } } });
    return { deleted: result.count, kept };
  }

  async stopCouponBatch(batchId: string): Promise<void> {
    const codes = await this.prisma.coupon.findMany({ where: { batchId }, select: { id: true } });
    if (codes.length === 0) throw NotFoundException();

    await this.prisma.coupon.updateMany({ where: { batchId }, data: { dueAt: new Date() } });
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/admin/product/product.service.spec.ts -t CouponBatch`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/product/product.service.ts src/admin/product/product.service.spec.ts
git commit -m "feat(coupon): delete unused codes only and add batch stop"
```

---

### Task 8: DTOs and controller routes

**Files:**
- Modify: `src/admin/admin.dto.ts`
- Modify: `src/admin/admin.controller.ts`

**Interfaces:**
- Consumes: every service method from Tasks 3–7.
- Produces: HTTP surface `GET /coupon`, `GET /coupon/batch/:batchId/codes`, `POST /coupon`, `PUT /coupon/batch/:batchId`, `DELETE /coupon/batch/:batchId`, `POST /coupon/batch/:batchId/stop`.

- [ ] **Step 1: Replace the DTOs**

In `src/admin/admin.dto.ts`, replace `CreateCouponDto` and `UpdateCouponDto`:

```ts
export interface CreateCouponDto {
  name: string;
  issueMode: 'INDIVIDUAL' | 'SHARED';
  startAt: string;
  dueAt: string;
  count?: number;
  code?: string;
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
}

export interface UpdateCouponBatchDto {
  name: string;
  startAt: string;
  dueAt: string;
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
}
```

- [ ] **Step 2: Replace the routes**

In `src/admin/admin.controller.ts`, update the import to use `UpdateCouponBatchDto` in place of `UpdateCouponDto`, then replace the four coupon routes (currently lines ~506–538):

```ts
  @TypedRoute.Get('/coupon')
  async getCoupons(
    @TypedQuery() query: { page?: number; search?: string; status?: 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' },
  ) {
    const page = query.page ?? 1;
    return this.productAdminService.getCoupons({ page, search: query.search, status: query.status });
  }

  @TypedRoute.Get('/coupon/batch/:batchId/codes')
  async getCouponBatchCodes(
    @TypedParam('batchId') batchId: string,
    @TypedQuery() query: { page?: number; all?: boolean },
  ) {
    return this.productAdminService.getCouponBatchCodes({
      batchId,
      page: query.page ?? 1,
      all: query.all,
    });
  }

  @TypedRoute.Post('/coupon')
  async createCoupon(@TypedBody() dto: CreateCouponDto) {
    await this.productAdminService.createCoupon(dto);
    return { message: 'Coupon created successfully.' };
  }

  @TypedRoute.Put('/coupon/batch/:batchId')
  async updateCouponBatch(@TypedParam('batchId') batchId: string, @TypedBody() dto: UpdateCouponBatchDto) {
    await this.productAdminService.updateCouponBatch({ batchId, ...dto });
    return { message: 'Coupon batch updated successfully.' };
  }

  @TypedRoute.Delete('/coupon/batch/:batchId')
  async removeCouponBatch(@TypedParam('batchId') batchId: string) {
    return this.productAdminService.removeCouponBatch(batchId);
  }

  @TypedRoute.Post('/coupon/batch/:batchId/stop')
  async stopCouponBatch(@TypedParam('batchId') batchId: string) {
    await this.productAdminService.stopCouponBatch(batchId);
    return { message: 'Coupon batch stopped successfully.' };
  }
```

Match the existing `@TypedQuery` / `@TypedParam` usage in this controller — if neighbouring routes destructure query parameters differently, follow that style rather than the sketch above.

Route ordering matters: `/coupon/batch/:batchId/...` must not be shadowed by a `/coupon/:id` route. The old `DELETE /coupon/:id` is removed in this step, which eliminates the conflict.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS (exit 0).

- [ ] **Step 4: Verify the suite still passes**

Run: `npx jest src/admin/product/product.service.spec.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/admin.dto.ts src/admin/admin.controller.ts
git commit -m "feat(coupon): expose batch routes on the admin controller"
```

---

### Task 9: Thread the transaction client through grant helpers

`chargeCoin` and `createPremiumTickets` each open their own `this.prisma.$transaction`. Called from inside `useCoupon`'s transaction they run separately, so the outer transaction cannot roll them back. Task 10 depends on this being fixed.

**Files:**
- Modify: `src/premium/premium.service.ts` (`chargeCoin` ~line 1594, `createPremiumTickets` ~line 1486)

**Interfaces:**
- Produces: `chargeCoin(params: ChargeCoinParams, tx?: Prisma.TransactionClient)` and `createPremiumTickets(params: CreatePremiumTicketsParams, tx?: Prisma.TransactionClient)`. When `tx` is supplied, no new transaction is opened.

- [ ] **Step 1: Add the optional client to `chargeCoin`**

Replace the method body's transaction handling:

```ts
  private async chargeCoin(params: ChargeCoinParams, tx?: Prisma.TransactionClient) {
    const { spaceId, profileId, isPaid, isUse, amount, description } = params;

    const run = async (client: Prisma.TransactionClient) => {
      const [meta] = await Promise.all([
        client.coinMeta.create({
          data: { spaceId, isPaid, isUse, amount, profileId, description },
        }),
        client.space.update({
          where: { id: spaceId },
          data: isPaid ? { coinPaid: { increment: amount } } : { coin: { increment: amount } },
        }),
      ]);
      return meta;
    };

    // When a caller already holds a transaction, joining it is what makes their
    // rollback actually undo the grant.
    return tx ? run(tx) : this.prisma.$transaction(run);
  }
```

Add `import { Prisma } from '@prisma/client';` if it is not already imported.

- [ ] **Step 2: Apply the same shape to `createPremiumTickets`**

Wrap its existing `$transaction` callback body into a `run(client)` function that uses `client` in place of the callback's `prisma` parameter, then finish with:

```ts
    return tx ? run(tx) : this.prisma.$transaction(run);
```

Change the signature to `private async createPremiumTickets(params: CreatePremiumTicketsParams, tx?: Prisma.TransactionClient)`. Do not change any logic inside the callback — only the client it reads from.

- [ ] **Step 3: Verify no call site broke**

Run: `npx tsc --noEmit`
Expected: PASS. The parameter is optional, so all six existing `chargeCoin` call sites and every `createPremiumTickets` call site keep working unchanged.

- [ ] **Step 4: Verify the suite still passes**

Run: `npx jest`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/premium/premium.service.ts
git commit -m "fix(premium): let grant helpers join a caller's transaction"
```

---

### Task 10: Redemption checks and the capacity guard

**Files:**
- Modify: `src/premium/premium.service.ts` (`validateCoupon`, `useCoupon`)

**Interfaces:**
- Consumes: `chargeCoin(params, tx)` and `createPremiumTickets(params, tx)` from Task 9.

- [ ] **Step 1: Add the checks to `validateCoupon`**

```ts
  async validateCoupon(params: ValidateCouponParams) {
    const { code } = params;

    const now = dayjs();

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    // Not-yet-started is reported as Not Found, the same as expired: the shipped
    // app has no message for a new error code and would show a generic failure.
    if (!coupon || now.isAfter(dayjs(coupon.dueAt)) || now.isBefore(dayjs(coupon.startAt))) {
      throw NotFoundException();
    }

    if (coupon.maxUseCount !== 0 && coupon.useCount >= coupon.maxUseCount) throw AlreadyException();

    return coupon;
  }
```

`validateCoupon` takes no user id, so it cannot check per-user reuse; that check stays in `useCoupon` where the user is known.

- [ ] **Step 2: Rewrite `useCoupon` around the capacity guard**

```ts
  async useCoupon(params: UseCouponParams) {
    const { userId, username, code, spaceId } = params;

    const now = dayjs();

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (!coupon || now.isAfter(dayjs(coupon.dueAt)) || now.isBefore(dayjs(coupon.startAt))) {
      throw NotFoundException();
    }

    const isUsed = await this.prisma.couponMeta.count({
      where: { couponId: coupon.id, userId },
    });

    if (isUsed) throw AlreadyException();

    await this.prisma.$transaction(async (cli) => {
      // Claim a slot first. Checking with a SELECT would let two concurrent
      // redemptions both pass and overfill the batch; this statement checks and
      // increments together, so zero affected rows means the batch is full.
      const claimed = await cli.$executeRaw`
        UPDATE \`Coupon\`
           SET \`useCount\` = \`useCount\` + 1
         WHERE \`id\` = ${coupon.id}
           AND (\`maxUseCount\` = 0 OR \`useCount\` < \`maxUseCount\`)
      `;

      if (claimed === 0) throw AlreadyException();

      const profile = await cli.profile.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
      });

      if (coupon.heart > 0) {
        await this.chargeCoin(
          {
            spaceId,
            profileId: profile?.id,
            isUse: false,
            isPaid: false,
            amount: coupon.heart,
            description: coupon.name,
          },
          cli,
        );
      }

      if (coupon.star > 0) {
        await this.chargeCoin(
          {
            spaceId,
            profileId: profile?.id,
            isUse: false,
            isPaid: true,
            amount: coupon.star,
            description: coupon.name,
          },
          cli,
        );
      }

      if (coupon.ticketCount > 0) {
        const ticketDueAt =
          coupon.ticketDueDayNum > 0 ? now.add(coupon.ticketDueDayNum, 'day').toDate() : undefined;

        await this.createPremiumTickets(
          {
            ownerId: userId,
            count: coupon.ticketCount,
            platform: 'EVENT',
            productId: coupon.name,
            transactionId: coupon.name,
            dueAt: ticketDueAt,
          },
          cli,
        );
      }

      // The (couponId, userId) unique index is the last line of defence against
      // a single user's concurrent double-submit; a violation rolls the whole
      // transaction back, including the slot claim and the grants.
      await cli.couponMeta.create({
        data: { couponId: coupon.id, userId, spaceId, username },
      });
    });
  }
```

Keep whatever the method returned before this change; only the body above is replaced.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Verify the suite still passes**

Run: `npx jest`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/premium/premium.service.ts
git commit -m "feat(coupon): enforce start date and capacity when redeeming"
```

---

### Task 11: Backend verification gate

No code changes. This is the checkpoint before the frontend can be built against a real API.

- [ ] **Step 1: Full type and test check**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc exits 0, all tests PASS.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in the files touched by Tasks 1–10.

- [ ] **Step 3: Hand off the SQL**

Tell the operator to apply `docs/superpowers/specs/2026-08-09-coupon-management-enhancement.sql` **STEP 0 through STEP 5** to the **dev** database, and to hold STEP 6 until the backend is deployed. Confirm which database they applied it to before proceeding — never assume dev.

- [ ] **Step 4: Search-matching check on dev (manual, after deploy)**

The batch list query's `WHERE` clause is the one behaviour no unit test can prove — a mocked `$queryRaw` validates the bindings and the fragment's shape, never that MySQL selects the right rows. `coupon.sql.spec.ts` guards against a clause silently disappearing; this step is what proves the query actually works.

Against dev, with at least two batches present and at least one coupon already redeemed:

1. Search by **coupon name** → only batches whose name matches appear.
2. Search by **code** → for a `SHARED` batch, its own code finds it; for an `INDIVIDUAL` batch, pasting one of its member codes returns **the whole batch**, not a single row.
3. Search by **redeeming username** → the batch containing the coupon that user redeemed appears. This exercises the `LEFT JOIN CouponMeta`, which is the least-covered path in the feature.
4. Search a term matching nothing → empty list, no error.
5. Combine a search with each status filter → results are the intersection, and the status shown in the row matches the filter applied.

If any of these fails, the failure is in `couponSearchFilter` or `couponBatchSubquery` in `coupon.sql.ts`, not in the frontend.

- [ ] **Step 5: Concurrency check on dev (manual, after deploy)**

Create a `SHARED` coupon with `maxUseCount = 1`, then fire two redemption requests simultaneously from two different users:

```bash
# replace HOST, TOKEN_A, TOKEN_B, SPACE_A, SPACE_B, CODE
curl -s -X POST "$HOST/premium/coupon/use" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d "{\"spaceId\":\"$SPACE_A\",\"code\":\"$CODE\"}" &
curl -s -X POST "$HOST/premium/coupon/use" -H "Authorization: Bearer $TOKEN_B" \
  -H 'Content-Type: application/json' -d "{\"spaceId\":\"$SPACE_B\",\"code\":\"$CODE\"}" &
wait
```

Expected: exactly one success, one `Already` failure. Then confirm the counter did not overshoot:

```sql
SELECT `code`, `useCount`, `maxUseCount` FROM `Coupon` WHERE `code` = 'CODE';
SELECT COUNT(*) FROM `CouponMeta` WHERE `couponId` = (SELECT id FROM `Coupon` WHERE `code` = 'CODE');
```

Expected: `useCount = 1`, one `CouponMeta` row. If `useCount = 2`, the guard is not working — stop and fix before continuing.

---

# Phase B — Frontend (`mindqna-admin`)

All Phase B work happens in `~/Documents/frontend/mindqna-admin`. There is no test runner here; each task's verification is `npx tsc --noEmit`, `npm run lint`, and the named manual check.

---

### Task 12: Client types and API

**Files:**
- Modify: `src/client/coupon.ts`

**Interfaces:**
- Produces: `CouponBatch`, `CouponCode`, `CouponIssueMode`, `CouponStatus`, `CreateCouponParams`, `UpdateCouponBatchParams`, and the functions `getCoupons`, `getCouponBatchCodes`, `createCoupon`, `updateCouponBatch`, `removeCouponBatch`, `stopCouponBatch`.

- [ ] **Step 1: Replace the file contents**

```ts
import client from './@base';
import { QueryResultWithPagination } from './types';

export type CouponIssueMode = 'INDIVIDUAL' | 'SHARED';
export type CouponStatus = 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';

export type CouponBatch = {
  batchId: string;
  name: string;
  issueMode: CouponIssueMode;
  code: string | null;
  codeCount: number;
  usedCount: number;
  /** 0 means unlimited. */
  capacity: number;
  status: CouponStatus;
  startAt: string;
  dueAt: string;
  createdAt: string;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export type CouponCode = {
  codeId: number;
  code: string;
  username: string | null;
  usedAt: string | null;
};

export type CreateCouponParams = {
  name: string;
  issueMode: CouponIssueMode;
  startAt: string;
  dueAt: string;
  count?: number;
  code?: string;
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export type UpdateCouponBatchParams = {
  batchId: string;
  name: string;
  startAt: string;
  dueAt: string;
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export async function getCoupons(page: number, search?: string, status?: CouponStatus) {
  const res = await client.get<QueryResultWithPagination<CouponBatch>>('/coupon', {
    params: { page, search: search?.trim() || undefined, status },
  });

  return res.data;
}

export async function getCouponBatchCodes(batchId: string, page: number, all?: boolean) {
  const res = await client.get<QueryResultWithPagination<CouponCode>>(`/coupon/batch/${batchId}/codes`, {
    params: { page, all: all || undefined },
  });

  return res.data;
}

export async function createCoupon(params: CreateCouponParams) {
  const res = await client.post('/coupon', params);

  return res.data;
}

export async function updateCouponBatch(params: UpdateCouponBatchParams) {
  const { batchId, ...body } = params;
  const res = await client.put(`/coupon/batch/${batchId}`, body);

  return res.data;
}

export async function removeCouponBatch(batchId: string) {
  const res = await client.delete<{ deleted: number; kept: number }>(`/coupon/batch/${batchId}`);

  return res.data;
}

export async function stopCouponBatch(batchId: string) {
  const res = await client.post(`/coupon/batch/${batchId}/stop`);

  return res.data;
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: errors only in `CouponList.tsx` and `CouponForm.tsx`, which still import the removed `Coupon` type. Those are fixed in Tasks 18–19. Any other file failing means something else imported `Coupon` — fix it here.

- [ ] **Step 3: Commit**

```bash
git add src/client/coupon.ts
git commit -m "feat(coupon): rewrite the coupon api client around batches"
```

---

### Task 13: Query hooks

**Files:**
- Modify: `src/hooks/useCoupons.ts`
- Create: `src/hooks/useCouponBatchCodes.ts`

**Interfaces:**
- Consumes: `getCoupons`, `getCouponBatchCodes`, `CouponStatus` from Task 12.
- Produces: `useCoupons(page, search?, status?)` returning `{ items: CouponBatch[]; totalPage: number; isLoading: boolean; refetch }`, and `useCouponBatchCodes(batchId, page, enabled)` returning `{ items: CouponCode[]; totalPage: number; isLoading: boolean }`.

- [ ] **Step 1: Update `useCoupons.ts`**

```ts
import { getCoupons, type CouponStatus } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

function useCoupons(page: number, search?: string, status?: CouponStatus) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coupons', page, search, status],
    queryFn: () => getCoupons(page, search, status),
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useCoupons;
```

- [ ] **Step 2: Create `useCouponBatchCodes.ts`**

```ts
import { getCouponBatchCodes } from '@/client/coupon';
import { useQuery } from '@tanstack/react-query';

/** Only fetches while `enabled` — the expanded region mounts lazily. */
function useCouponBatchCodes(batchId: string, page: number, enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: ['coupon-batch-codes', batchId, page],
    queryFn: () => getCouponBatchCodes(batchId, page),
    enabled,
  });

  const items = data?.items ?? [];

  const totalPage = data?.pageInfo.totalPage ?? 1;

  return { items, totalPage, isLoading };
}

export default useCouponBatchCodes;
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: same remaining errors as Task 12 (`CouponList.tsx`, `CouponForm.tsx`) and no new ones.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCoupons.ts src/hooks/useCouponBatchCodes.ts
git commit -m "feat(coupon): add batch list and lazy code list hooks"
```

---

### Task 14: Status badge, usage meter, reward cell

Three leaf presentational components with no data dependencies.

**Files:**
- Create: `src/components/page/coupon/CouponStatusBadge.tsx`
- Create: `src/components/page/coupon/CouponUsageMeter.tsx`
- Create: `src/components/page/coupon/CouponRewardCell.tsx`

**Interfaces:**
- Produces: `<CouponStatusBadge status={CouponStatus} />`, `<CouponUsageMeter used={number} capacity={number} />`, `<CouponRewardCell heart={number} star={number} ticketCount={number} ticketDueDayNum={number} />`.

- [ ] **Step 1: Create `CouponStatusBadge.tsx`**

Follows the existing `PdfExportStatusBadge` pattern and uses the `dot*` badge variants already defined in `src/components/ui/badge.tsx`.

```tsx
import type { CouponStatus } from '@/client/coupon';
import { Badge } from '@/components/ui/badge';

const STATUS_MAP: Record<CouponStatus, { label: string; variant: 'dotInfo' | 'dotSuccess' | 'dotWarning' | 'dotNeutral' }> = {
  SCHEDULED: { label: '예정', variant: 'dotInfo' },
  ACTIVE: { label: '진행중', variant: 'dotSuccess' },
  EXHAUSTED: { label: '소진', variant: 'dotWarning' },
  EXPIRED: { label: '만료', variant: 'dotNeutral' },
};

function CouponStatusBadge({ status }: { status: CouponStatus }) {
  const entry = STATUS_MAP[status];
  if (!entry) return null;

  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export default CouponStatusBadge;
```

- [ ] **Step 2: Create `CouponUsageMeter.tsx`**

```tsx
type Props = {
  used: number;
  /** 0 means unlimited — there is no progress against an unbounded target. */
  capacity: number;
};

function CouponUsageMeter({ used, capacity }: Props) {
  const isUnlimited = capacity === 0;
  const ratio = isUnlimited ? 0 : Math.min(1, capacity > 0 ? used / capacity : 0);

  return (
    <div className='space-y-1'>
      <div className='tabular-nums text-slate-900'>
        {used}
        <span className='text-slate-500'> / {isUnlimited ? '무제한' : capacity}</span>
      </div>
      {!isUnlimited && (
        <div
          className='h-0.5 w-full overflow-hidden rounded-full bg-border'
          role='progressbar'
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={capacity}
        >
          <div className='h-full bg-slate-900' style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default CouponUsageMeter;
```

- [ ] **Step 3: Create `CouponRewardCell.tsx`**

Values are neutral text, never wrapped in a badge. Colour lives on the icon only, which `DESIGN.md` permits as currency-kind data semantics (heart = rose, star = amber).

```tsx
import { Heart, Star, Ticket } from 'lucide-react';

type Props = {
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

function CouponRewardCell({ heart, star, ticketCount, ticketDueDayNum }: Props) {
  const hasCoin = heart > 0 || star > 0;

  return (
    <div className='space-y-0.5'>
      {hasCoin && (
        <div className='flex items-center gap-1.5'>
          {heart > 0 ? (
            <Heart className='h-3.5 w-3.5 text-rose-600' aria-label='하트' />
          ) : (
            <Star className='h-3.5 w-3.5 text-amber-600' aria-label='스타' />
          )}
          <span className='tabular-nums text-slate-900'>{heart > 0 ? heart : star}</span>
        </div>
      )}
      {ticketCount > 0 && (
        <div className='flex items-center gap-1.5 text-slate-600'>
          <Ticket className='h-3.5 w-3.5 text-slate-500' aria-label='프리미엄 티켓' />
          <span className='tabular-nums'>{ticketCount}</span>
          <span>· {ticketDueDayNum > 0 ? `${ticketDueDayNum}일` : '평생'}</span>
        </div>
      )}
      {!hasCoin && ticketCount === 0 && <span className='text-slate-500'>—</span>}
    </div>
  );
}

export default CouponRewardCell;
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors from these three files.

- [ ] **Step 5: Commit**

```bash
git add src/components/page/coupon/CouponStatusBadge.tsx \
        src/components/page/coupon/CouponUsageMeter.tsx \
        src/components/page/coupon/CouponRewardCell.tsx
git commit -m "feat(coupon): add status badge, usage meter and reward cell"
```

---

### Task 15: Row expansion fix and column definitions

**Files:**
- Modify: `src/components/shared/ui/data-table.tsx`
- Create: `src/components/page/coupon/CouponColumns.tsx`

**Interfaces:**
- Consumes: `CouponBatch` (Task 12); `CouponStatusBadge`, `CouponUsageMeter`, `CouponRewardCell` (Task 14).
- Produces: `createCouponColumns(actions: CouponRowActions): ColumnDef<CouponBatch>[]` where `CouponRowActions = { onEdit; onStop; onDelete }`, each `(batch: CouponBatch) => void`.

- [ ] **Step 1: Make `DataTable`'s expansion actually work**

`DataTable` accepts an `expandable` prop but no module in this repo has ever used it, and as written it does not function. TanStack resolves `row.getCanExpand()` as `options.getRowCanExpand?.(row) ?? (enableExpanding && !!row.subRows?.length)` (`@tanstack/table-core@8.21.3`, `src/features/RowExpanding.ts:329`), and `getToggleExpandedHandler()` returns a no-op when that is false. These rows have no sub-rows and the option is never passed, so **the expander button would silently do nothing.**

In `src/components/shared/ui/data-table.tsx`, add one line to the conditional options block:

```ts
    ...(expandable && {
      getRowCanExpand: () => true,
      getExpandedRowModel: getExpandedRowModel(),
      onExpandedChange: setExpanded,
      state: { expanded },
    }),
```

This is a shared component used by 19 modules, but the changed branch only activates when `expandable` is supplied — which nothing else does — so it cannot regress an existing table.

- [ ] **Step 2: Create the columns file**

```tsx
import type { CouponBatch } from '@/client/coupon';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CouponRewardCell from './CouponRewardCell';
import CouponStatusBadge from './CouponStatusBadge';
import CouponUsageMeter from './CouponUsageMeter';

export interface CouponRowActions {
  onEdit: (batch: CouponBatch) => void;
  onStop: (batch: CouponBatch) => void;
  onDelete: (batch: CouponBatch) => void;
}

export const createCouponColumns = (actions: CouponRowActions): ColumnDef<CouponBatch>[] => [
  {
    id: 'expander',
    header: '',
    size: 40,
    meta: { useTruncateTooltip: false },
    cell: ({ row }) => (
      <button
        type='button'
        aria-label={row.getIsExpanded() ? '코드 접기' : '코드 펼치기'}
        onClick={row.getToggleExpandedHandler()}
        className='inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-700'
      >
        {row.getIsExpanded() ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
      </button>
    ),
  },
  {
    id: 'coupon',
    header: '쿠폰',
    size: 220,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-medium text-slate-900'>{row.original.name}</div>
        <div className='truncate font-mono text-xs text-slate-600'>
          {row.original.issueMode === 'SHARED' ? row.original.code : `코드 ${row.original.codeCount}개`}
        </div>
      </div>
    ),
  },
  {
    id: 'issueMode',
    header: '모드',
    size: 88,
    cell: ({ row }) => (
      <Badge variant={row.original.issueMode === 'SHARED' ? 'softInfo' : 'softNeutral'}>
        {row.original.issueMode === 'SHARED' ? '공용' : '개별'}
      </Badge>
    ),
  },
  {
    id: 'reward',
    header: '보상',
    size: 200,
    cell: ({ row }) => (
      <CouponRewardCell
        heart={row.original.heart}
        star={row.original.star}
        ticketCount={row.original.ticketCount}
        ticketDueDayNum={row.original.ticketDueDayNum}
      />
    ),
  },
  {
    id: 'usage',
    header: '사용 현황',
    size: 140,
    cell: ({ row }) => <CouponUsageMeter used={row.original.usedCount} capacity={row.original.capacity} />,
  },
  {
    id: 'period',
    header: '기간',
    size: 170,
    cell: ({ row }) => (
      <span className='text-sm text-slate-500'>
        {dayjs(row.original.startAt).format('YY.MM.DD')} – {dayjs(row.original.dueAt).format('YY.MM.DD')}
      </span>
    ),
  },
  {
    id: 'status',
    header: '상태',
    size: 104,
    cell: ({ row }) => <CouponStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: '발급일',
    size: 120,
    cell: ({ row }) => (
      <span className='text-sm text-slate-500'>{dayjs(row.original.createdAt).format('YY.MM.DD')}</span>
    ),
  },
  {
    id: 'actions',
    header: '관리',
    size: 80,
    cell: ({ row }) => {
      const batch = row.original;
      return (
        <TableRowActions
          items={[
            { label: '수정', onClick: () => actions.onEdit(batch) },
            ...(batch.status === 'EXPIRED'
              ? []
              : [{ label: '발급 중단', onClick: () => actions.onStop(batch) }]),
            { label: '삭제', onClick: () => actions.onDelete(batch), destructive: true },
          ]}
        />
      );
    },
  },
];
```

Every reward number is plain text — no `soft*` badge wraps a value. The `번호` (id) column is gone; a code's id is meaningless at batch level.

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors from these two files.

- [ ] **Step 4: Regression check on an existing table**

Run `npm run dev` and open a table that does **not** use expansion, for example `http://localhost:4000/product/iap-product`.
Expected: it renders and paginates exactly as before. The `getRowCanExpand` option only applies when `expandable` is supplied, so this confirms the shared component is untouched for every other consumer.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ui/data-table.tsx src/components/page/coupon/CouponColumns.tsx
git commit -m "feat(coupon): extract batch column definitions and enable row expansion"
```

---

### Task 16: Expanded code list with clipboard copy

**Files:**
- Create: `src/components/page/coupon/CouponCodeList.tsx`

**Interfaces:**
- Consumes: `useCouponBatchCodes` (Task 13), `getCouponBatchCodes` (Task 12).
- Produces: `<CouponCodeList batch={CouponBatch} />`.

- [ ] **Step 1: Create the file**

```tsx
import { getCouponBatchCodes, type CouponBatch } from '@/client/coupon';
import { Button } from '@/components/ui/button';
import useCouponBatchCodes from '@/hooks/useCouponBatchCodes';
import dayjs from 'dayjs';
import { Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function CouponCodeList({ batch }: { batch: CouponBatch }) {
  const [page, setPage] = useState(1);
  const [copying, setCopying] = useState(false);
  const { items, totalPage, isLoading } = useCouponBatchCodes(batch.batchId, page, true);

  const copyAll = async () => {
    setCopying(true);
    try {
      const all = await getCouponBatchCodes(batch.batchId, 1, true);
      const text = [...new Set(all.items.map((item) => item.code))].join('\n');
      await navigator.clipboard.writeText(text);
      toast.success('쿠폰 코드를 클립보드에 복사했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setCopying(false);
  };

  if (isLoading) {
    return (
      <div className='flex h-16 items-center justify-center'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='space-y-1'>
        {items.length === 0 && <div className='text-sm text-slate-500'>표시할 코드가 없습니다.</div>}
        {items.map((item, index) => (
          <div
            key={`${item.codeId}-${item.usedAt ?? index}`}
            className='flex items-center gap-3 text-sm'
          >
            <span className='w-36 truncate font-mono text-slate-900'>{item.code}</span>
            <span className={item.username ? 'text-slate-700' : 'text-slate-500'}>
              {item.username ? '사용' : '미사용'}
            </span>
            {item.username && <span className='text-slate-700'>{item.username}</span>}
            {item.usedAt && (
              <span className='text-slate-500'>{dayjs(item.usedAt).format('YY.MM.DD HH:mm')}</span>
            )}
          </div>
        ))}
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Button variant='outline' size='sm' onClick={() => setPage(page - 1)} disabled={page <= 1}>
            이전
          </Button>
          <span className='px-2 text-sm tabular-nums text-slate-600'>
            {page} / {totalPage}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPage}
          >
            다음
          </Button>
        </div>

        {batch.issueMode === 'INDIVIDUAL' && (
          <Button variant='outline' size='sm' onClick={copyAll} disabled={copying}>
            {copying ? <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' /> : <Copy className='mr-2 h-3.5 w-3.5' />}
            코드 전체 복사
          </Button>
        )}
      </div>
    </div>
  );
}

export default CouponCodeList;
```

Shared batches show one row per redemption, so the same code repeats — the `key` combines `codeId` with `usedAt` to stay stable.

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/page/coupon/CouponCodeList.tsx
git commit -m "feat(coupon): add the expanded code list with bulk copy"
```

---

### Task 17: Summary card

**Files:**
- Create: `src/components/page/coupon/CouponSummaryCard.tsx`

**Interfaces:**
- Produces: `<CouponSummaryCard values={CouponSummaryValues} />` where `CouponSummaryValues = { name; issueMode; code?; count; maxUseCount; isUnlimited; startAt; dueAt; isPaid; reward; ticketCount; ticketDueDayNum }`.

- [ ] **Step 1: Create the file**

```tsx
import type { CouponIssueMode } from '@/client/coupon';
import dayjs from 'dayjs';

export type CouponSummaryValues = {
  name: string;
  issueMode: CouponIssueMode;
  code?: string;
  count: number;
  maxUseCount: number;
  isUnlimited: boolean;
  startAt: string;
  dueAt: string;
  isPaid: boolean;
  reward: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

function CouponSummaryCard({ values }: { values: CouponSummaryValues }) {
  const identity =
    values.issueMode === 'SHARED'
      ? values.code?.trim().toUpperCase() || '자동 생성 코드'
      : `코드 ${values.count}개 자동 생성`;

  const capacity =
    values.issueMode === 'SHARED'
      ? values.isUnlimited
        ? '인원 무제한'
        : `최대 ${values.maxUseCount}명`
      : `1인 1코드 · 최대 ${values.count}명`;

  const rewards = [
    values.reward > 0 ? `${values.isPaid ? '스타' : '하트'} ${values.reward}` : null,
    values.ticketCount > 0
      ? `프리미엄 ${values.ticketDueDayNum > 0 ? `${values.ticketDueDayNum}일` : '평생'}${
          values.ticketCount > 1 ? ` ×${values.ticketCount}` : ''
        }`
      : null,
  ].filter(Boolean);

  const start = dayjs(values.startAt);
  const due = dayjs(values.dueAt);
  const period =
    start.isValid() && due.isValid()
      ? `${start.format('YYYY.MM.DD')} 00:00 부터 ${due.format('YYYY.MM.DD')} 23:59 까지`
      : '사용 기간을 입력해주세요.';

  return (
    <div className='rounded-lg border border-border bg-card p-4'>
      <div className='mb-2 font-mono text-xs font-medium uppercase tracking-wide text-slate-600'>
        이렇게 발급됩니다
      </div>
      <div className='space-y-1 text-sm text-slate-700'>
        <div className='font-medium text-slate-900'>
          {values.name.trim() || '(이름 없음)'} · {identity}
        </div>
        <div>{capacity}</div>
        <div>{rewards.length > 0 ? rewards.join(' + ') : '보상을 설정해주세요.'}</div>
        <div className='text-slate-600'>{period}</div>
      </div>
    </div>
  );
}

export default CouponSummaryCard;
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/page/coupon/CouponSummaryCard.tsx
git commit -m "feat(coupon): add an issuance summary card"
```

---

### Task 18: Rewrite the coupon form

**Files:**
- Modify: `src/components/page/coupon/CouponForm.tsx`

**Interfaces:**
- Consumes: `createCoupon`, `updateCouponBatch`, `CouponBatch` (Task 12); `CouponSummaryCard` (Task 17).
- Produces: `<CouponForm init?={CouponBatch} reload={() => Promise<any>} close={() => void} />`.

- [ ] **Step 1: Replace the file**

```tsx
import { createCoupon, updateCouponBatch, type CouponBatch } from '@/client/coupon';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import CouponSummaryCard from './CouponSummaryCard';

type Props = {
  init?: CouponBatch;
  reload: () => Promise<any>;
  close: () => void;
};

const CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
const MAX_ISSUE_COUNT = 1000;

const couponSchema = z
  .object({
    name: z.string().min(1, '이름을 입력해주세요.'),
    issueMode: z.enum(['INDIVIDUAL', 'SHARED']),
    count: z.coerce.number().int().min(1, '1 이상 입력해주세요.').max(MAX_ISSUE_COUNT),
    code: z.string(),
    maxUseCount: z.coerce.number().int().min(0),
    isUnlimited: z.boolean(),
    startAt: z.string().min(1, '시작일을 입력해주세요.'),
    dueAt: z.string().min(1, '만료일을 입력해주세요.'),
    isPaid: z.boolean(),
    reward: z.coerce.number().int().min(0, '0 이상 입력해주세요.'),
    ticketCount: z.coerce.number().int().min(0, '0 이상 입력해주세요.'),
    ticketDueDayNum: z.coerce.number().int().min(0, '0 이상 입력해주세요.'),
  })
  .superRefine((values, ctx) => {
    if (dayjs(values.startAt).isAfter(dayjs(values.dueAt))) {
      ctx.addIssue({ code: 'custom', path: ['dueAt'], message: '만료일은 시작일보다 빠를 수 없습니다.' });
    }

    if (values.reward <= 0 && values.ticketCount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['reward'], message: '코인 또는 티켓 보상을 설정해주세요.' });
    }

    if (values.issueMode === 'SHARED') {
      if (values.code.trim() && !CODE_PATTERN.test(values.code.trim())) {
        ctx.addIssue({ code: 'custom', path: ['code'], message: '영문/숫자/-/_ 4~32자로 입력해주세요.' });
      }
      if (!values.isUnlimited && values.maxUseCount < 1) {
        ctx.addIssue({ code: 'custom', path: ['maxUseCount'], message: '1 이상 입력하거나 무제한을 선택해주세요.' });
      }
    }
  });

type CouponFormValues = z.infer<typeof couponSchema>;

function CouponForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const isEdit = !!init;
  const isLocked = !!init && init.usedCount > 0;

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      name: '',
      issueMode: 'INDIVIDUAL',
      count: 1,
      code: '',
      maxUseCount: 1,
      isUnlimited: false,
      startAt: dayjs().format('YYYY-MM-DD'),
      dueAt: dayjs().add(30, 'day').format('YYYY-MM-DD'),
      isPaid: false,
      reward: 0,
      ticketCount: 0,
      ticketDueDayNum: 0,
    },
  });

  const values = form.watch();

  useEffect(() => {
    if (!init) return;

    form.reset({
      name: init.name,
      issueMode: init.issueMode,
      count: init.codeCount,
      code: init.code ?? '',
      // capacity is codeCount for individual batches, which is not a per-code
      // limit — only shared batches carry a meaningful maxUseCount.
      maxUseCount: init.issueMode === 'SHARED' ? init.capacity : 1,
      isUnlimited: init.issueMode === 'SHARED' && init.capacity === 0,
      startAt: dayjs(init.startAt).format('YYYY-MM-DD'),
      dueAt: dayjs(init.dueAt).format('YYYY-MM-DD'),
      isPaid: init.star > 0,
      reward: init.star > 0 ? init.star : init.heart,
      ticketCount: init.ticketCount,
      ticketDueDayNum: init.ticketDueDayNum,
    });
  }, [init]);

  const applyQuickRange = (days: number) => {
    form.setValue('startAt', dayjs().format('YYYY-MM-DD'));
    form.setValue('dueAt', dayjs().add(days, 'day').format('YYYY-MM-DD'));
  };

  const save = async (input: CouponFormValues) => {
    setLoading(true);
    try {
      const heart = input.isPaid ? 0 : input.reward;
      const star = input.isPaid ? input.reward : 0;

      if (init) {
        await updateCouponBatch({
          batchId: init.batchId,
          name: input.name,
          startAt: input.startAt,
          dueAt: input.dueAt,
          maxUseCount:
            input.issueMode === 'SHARED' ? (input.isUnlimited ? 0 : input.maxUseCount) : undefined,
          heart,
          star,
          ticketCount: input.ticketCount,
          ticketDueDayNum: input.ticketDueDayNum,
        });
        toast.success('쿠폰을 수정했습니다.');
      } else {
        await createCoupon({
          name: input.name,
          issueMode: input.issueMode,
          startAt: input.startAt,
          dueAt: input.dueAt,
          count: input.issueMode === 'INDIVIDUAL' ? input.count : undefined,
          code: input.issueMode === 'SHARED' ? input.code.trim() || undefined : undefined,
          maxUseCount:
            input.issueMode === 'SHARED' ? (input.isUnlimited ? 0 : input.maxUseCount) : undefined,
          heart,
          star,
          ticketCount: input.ticketCount,
          ticketDueDayNum: input.ticketDueDayNum,
        });
        toast.success('쿠폰을 발급했습니다.');
      }

      await reload();
      close();
    } catch (err) {
      toast.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      {isLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4 pb-2'>
          <FormSection
            title='발급 방식'
            description={
              isEdit
                ? '발급 방식은 변경할 수 없습니다.'
                : '개별 코드는 1인 1코드로 각 1회, 공용 코드는 모두 같은 코드를 씁니다.'
            }
          >
            {isEdit ? (
              <Badge variant={values.issueMode === 'SHARED' ? 'softInfo' : 'softNeutral'}>
                {values.issueMode === 'SHARED' ? '공용 코드' : '개별 코드'}
              </Badge>
            ) : (
              <FormField
                control={form.control}
                name='issueMode'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className='grid grid-cols-2 gap-2 sm:max-w-[360px]'
                      >
                        {[
                          { value: 'INDIVIDUAL', label: '개별 코드' },
                          { value: 'SHARED', label: '공용 코드' },
                        ].map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`mode-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormSection>

          <FormSection title='기본 정보'>
            <FormGroup title='쿠폰 이름*'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: 여름 이벤트 보상' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            {values.issueMode === 'INDIVIDUAL' && (
              <FormGroup title='발급 수량*' description={`1~${MAX_ISSUE_COUNT}장. 코드는 자동 생성됩니다.`}>
                <FormField
                  control={form.control}
                  name='count'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          max={MAX_ISSUE_COUNT}
                          disabled={isEdit}
                          {...field}
                          className='w-full sm:w-[220px]'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            )}

            {values.issueMode === 'SHARED' && (
              <>
                <FormGroup title='쿠폰 코드' description='비우면 10자리로 자동 생성됩니다. 대소문자는 구분하지 않습니다.'>
                  <FormField
                    control={form.control}
                    name='code'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder='예: SUMMER2026' disabled={isEdit} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FormGroup>

                <FormGroup title='최대 이용 횟수*'>
                  <div className='flex items-center gap-3'>
                    <FormField
                      control={form.control}
                      name='maxUseCount'
                      render={({ field }) => (
                        <FormItem className='flex-1'>
                          <FormControl>
                            <Input
                              type='number'
                              min={0}
                              disabled={values.isUnlimited}
                              {...field}
                              className='w-full sm:w-[220px]'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='isUnlimited'
                      render={({ field }) => (
                        <FormItem className='flex items-center gap-2'>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                              id='coupon-unlimited'
                            />
                          </FormControl>
                          <Label htmlFor='coupon-unlimited' className='text-sm font-medium'>
                            무제한
                          </Label>
                        </FormItem>
                      )}
                    />
                  </div>
                </FormGroup>
              </>
            )}
          </FormSection>

          <FormSection title='사용 기간'>
            <FormGroup title='시작일 / 만료일*'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='startAt'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='dueAt'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type='button'
                    onClick={() => applyQuickRange(days)}
                    className='rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors duration-fast hover:bg-slate-100'
                  >
                    오늘부터 {days}일
                  </button>
                ))}
              </div>
            </FormGroup>
          </FormSection>

          <FormSection
            title='보상'
            description={isLocked ? `이미 ${init?.usedCount}명이 사용한 쿠폰입니다. 보상과 코드는 변경할 수 없습니다.` : undefined}
          >
            <FormGroup title='코인 종류 / 수량*'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='isPaid'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(v === 'true')}
                          className='grid grid-cols-2 gap-2'
                          disabled={isLocked}
                        >
                          {[
                            { label: '하트', value: 'false' },
                            { label: '스타', value: 'true' },
                          ].map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`isPaid-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`isPaid-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='reward'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={0} disabled={isLocked} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>

            <FormGroup title='프리미엄 티켓' description='기간 0은 평생권입니다.'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='ticketCount'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={0} disabled={isLocked} placeholder='티켓 수량' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='ticketDueDayNum'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={0} disabled={isLocked} placeholder='기간 (일)' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>
          </FormSection>

          <CouponSummaryCard
            values={{
              name: values.name,
              issueMode: values.issueMode,
              code: values.code,
              count: values.count,
              maxUseCount: values.maxUseCount,
              isUnlimited: values.isUnlimited,
              startAt: values.startAt,
              dueAt: values.dueAt,
              isPaid: values.isPaid,
              reward: values.reward,
              ticketCount: values.ticketCount,
              ticketDueDayNum: values.ticketDueDayNum,
            }}
          />

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEdit ? '변경사항 저장' : '쿠폰 발급'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default CouponForm;
```

- [ ] **Step 2: Confirm the Checkbox component exists**

Run: `ls src/components/ui/checkbox.tsx`
Expected: the file exists. If it does not, replace the `Checkbox` usage with a native `<input type='checkbox'>` styled with `h-4 w-4 rounded-[4px] border-border` and drop the import.

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: errors remain only in `CouponList.tsx` (fixed next).

- [ ] **Step 4: Commit**

```bash
git add src/components/page/coupon/CouponForm.tsx
git commit -m "feat(coupon): rebuild the coupon form around issue modes"
```

---

### Task 19: Wire up the list

**Files:**
- Modify: `src/components/page/coupon/CouponList.tsx`

**Interfaces:**
- Consumes: everything from Tasks 12–18.

- [ ] **Step 1: Replace the file**

```tsx
import { removeCouponBatch, stopCouponBatch, type CouponBatch, type CouponStatus } from '@/client/coupon';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import useCoupons from '@/hooks/useCoupons';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CouponCodeList from './CouponCodeList';
import { createCouponColumns } from './CouponColumns';
import CouponForm from './CouponForm';

const STATUS_OPTIONS: { value: CouponStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'ACTIVE', label: '진행중' },
  { value: 'SCHEDULED', label: '예정' },
  { value: 'EXHAUSTED', label: '소진' },
  { value: 'EXPIRED', label: '만료' },
];

function CouponList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<CouponStatus | 'ALL'>('ALL');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { items, isLoading, refetch, totalPage } = useCoupons(
    currentPage,
    effectiveSearch,
    status === 'ALL' ? undefined : status,
  );

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<CouponBatch | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<CouponBatch | undefined>(undefined);
  const [confirmStop, setConfirmStop] = useState<CouponBatch | undefined>(undefined);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSearch, status]);

  const handleConfirmRemove = async () => {
    if (!confirmDelete) return;
    try {
      const result = await removeCouponBatch(confirmDelete.batchId);
      await refetch();
      toast.success(
        result.kept > 0
          ? `미사용 ${result.deleted}장을 삭제했습니다. 사용된 ${result.kept}장은 이력 보존을 위해 남겼습니다.`
          : `${result.deleted}장을 삭제했습니다.`,
      );
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmDelete(undefined);
  };

  const handleConfirmStop = async () => {
    if (!confirmStop) return;
    try {
      await stopCouponBatch(confirmStop.batchId);
      await refetch();
      toast.success('쿠폰 발급을 중단했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmStop(undefined);
  };

  const columns = useMemo(
    () =>
      createCouponColumns({
        onEdit: (batch) => {
          setFocused(batch);
          setOpenEdit(true);
        },
        onStop: (batch) => setConfirmStop(batch),
        onDelete: (batch) => setConfirmDelete(batch),
      }),
    [],
  );

  return (
    <>
      <FilterBar
        chips={
          status === 'ALL'
            ? []
            : [{ key: 'status', label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '상태' }]
        }
        onRemoveChip={() => setStatus('ALL')}
      >
        <div className='relative min-w-[260px]'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='쿠폰명 / 코드 / 사용자 검색 (2자 이상)'
            className={`pl-9 ${FILTER_CONTROL_CLASS}`}
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as CouponStatus | 'ALL')}>
          <SelectTrigger className={`w-[140px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex-1' />
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          className={FILTER_CONTROL_CLASS}
        >
          추가
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        rowKey='batchId'
        expandable={{ expandedRowRender: (batch) => <CouponCodeList batch={batch} /> }}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        <AdminSideSheetContent title='쿠폰 발급' size='md'>
          <CouponForm reload={refetch} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>

      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='쿠폰 수정' size='md'>
          <CouponForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </AdminSideSheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 ({confirmDelete?.name})</AlertDialogTitle>
            <AlertDialogDescription>
              아직 사용되지 않은 코드만 삭제됩니다. 이미 사용된 코드는 이력 보존을 위해 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmStop} onOpenChange={(open) => !open && setConfirmStop(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>발급 중단 ({confirmStop?.name})</AlertDialogTitle>
            <AlertDialogDescription>
              만료일을 지금으로 변경해 더 이상 등록할 수 없게 합니다. 이미 지급된 보상은 회수되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStop}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CouponList;
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc exits 0 with no errors. Lint shows no new warnings in `src/components/page/coupon/**`.

- [ ] **Step 3: Manual check on the dev server**

Run: `npm run dev`, open `http://localhost:4000/product/coupon`, and confirm:

1. Headers read 쿠폰 · 모드 · 보상 · 사용 현황 · 기간 · 상태 · 발급일 · 관리. **No header says 히트 or `code`.**
2. Reward numbers are plain text — no coloured pill around a number.
3. Issuing an individual batch of 3 produces **one** row reading `코드 3개`, not three rows.
4. Expanding that row lists 3 codes, all 미사용, and 코드 전체 복사 puts 3 newline-separated codes on the clipboard.
5. Issuing a shared code `SUMMER2026` with max 100 shows `0 / 100` and a meter at zero width.
6. Setting 무제한 shows `0 / 무제한` with no meter.
7. Setting a start date in the future shows 예정; a past due date shows 만료.
8. The status filter narrows the list and shows a removable chip.
9. Editing a batch with redemptions disables the reward fields and shows the "이미 N명이 사용한" notice.
10. The table does not scroll the page body sideways.

- [ ] **Step 4: Commit**

```bash
git add src/components/page/coupon/CouponList.tsx
git commit -m "feat(coupon): rebuild the coupon list around issue batches"
```

---

### Task 20: Route label and documentation

**Files:**
- Modify: `src/components/layout/route-labels.ts`
- Modify: `AGENTS.md`

- [ ] **Step 1: Fix the page header label**

The sidebar calls this screen `쿠폰 관리` (`main-menu.tsx:69`) but `route-labels.ts` maps the `coupon` segment to `쿠폰`, so the page header and the breadcrumb disagree with the nav. This is the same class of defect fixed for `pdf-export` in commit `b4fc234`.

In `src/components/layout/route-labels.ts`, change:

```ts
  coupon: '쿠폰 관리',
```

Verify by running `npm run dev` and confirming `http://localhost:4000/product/coupon` shows `쿠폰 관리` as the page title.

- [ ] **Step 2: Record the raw-SQL exception**

`AGENTS.md` §4 lists implementation conventions. Add one row noting that `src/admin/product/coupon.sql.ts` in `mindqna-server` is the project's only user-input-bearing raw SQL and must stay on `Prisma.sql` bindings — this is the kind of thing a future contributor copies without knowing why it is safe.

Also update §6 (알려진 잔존 이슈) if the residual TS errors listed there no longer reproduce after this work; `npx tsc --noEmit` currently exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/route-labels.ts AGENTS.md
git commit -m "fix(layout): align the coupon route label with the sidebar"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §3.1 schema | 1 |
| §3.2 migration SQL | delivered as a file; applied at Task 11 step 3 |
| §4.1 batch list + status | 4 |
| §4.2 code list + `?all=true` | 5, consumed in 16 |
| §4.3 create + validation | 2, 3 |
| §4.4 update / delete / stop | 6, 7 |
| §4.5 redemption + tx fix | 9, 10 |
| §4.6 error codes | 10 |
| §5.1 header corrections | 15 |
| §5.2 list columns | 14, 15 |
| §5.3 row actions | 15, 19 |
| §5.4 expanded region + copy | 16 |
| §5.5 side panel | 17, 18 |
| §5.6 file layout | 12–19 |
| §6 testing | 2–7 (unit), 11 (manual concurrency), 19 step 3 (manual UI) |
| §7 rollout | 11 |

**Fixes applied while drafting**

- Task 1 originally landed the schema alone, which left `createCoupon` uncompilable. It now includes a behaviour-preserving patch so the task is independently deployable.
- `CouponRewardCell` was not in the spec's file list but is needed to keep `CouponColumns.tsx` readable; added to the file structure table.
- `useCoupons` gained a `status` argument in Task 13 to match the Task 12 client signature.
- `getCouponBatchCodes` returns `usedAt` as `Date` from the service and `string` over HTTP; the client type (Task 12) declares `string`, and `CouponCodeList` passes it through `dayjs`, which accepts both.

**Fixes applied after reviewing the plan against the codebase**

Every claim the plan made about existing components was checked against the actual source. Seven were wrong or fragile:

| # | Severity | Finding | Fix |
|---|---|---|---|
| R1 | blocker | `DataTable`'s `expandable` prop has never been used anywhere and does not work. `row.getCanExpand()` falls back to `!!row.subRows?.length` when `getRowCanExpand` is absent (`table-core@8.21.3`, `RowExpanding.ts:329`), and `getToggleExpandedHandler()` no-ops when that is false — the expander button would do nothing | Task 15 Step 1 adds `getRowCanExpand: () => true`, plus a regression check on a non-expandable table |
| R2 | blocker | The plan imported `BadRequestException` from `src/common/exception/error`, but `product.service.ts:1` already imports it from `@nestjs/common` — a duplicate-identifier compile error | All 11 throw sites now use `new BadRequestException(...)` from `@nestjs/common`; the unnecessary spec-mock expansion was dropped |
| R3 | defect | The code-collision test was vacuous: a random `nanoid` can never equal the seeded `TAKEN00001`, so the retry path was never entered and the test passed regardless | Task 3 partially mocks `generateCouponCodes` so the collision is forced, and asserts the generator ran twice |
| R4 | defect | `startChanged` compared `Date` instances, so an unchanged start date could read as changed and wrongly reject an edit that only extends the due date | Compare on `YYYY-MM-DD` instead |
| R5 | minor | Edit mode seeded `maxUseCount` from `capacity`, which is `codeCount` for individual batches — a meaningless per-code limit | Seed `1` unless the batch is shared |
| R6 | minor | Non-null assertion on the status chip lookup | Optional chaining with a fallback label |
| R7 | gap | The sidebar says `쿠폰 관리` but `route-labels.ts` maps `coupon` to `쿠폰`, so the page header disagrees with the nav — the same defect fixed for `pdf-export` in `b4fc234` | Task 20 Step 1 |

**Verified as correct, no change needed:** `checkbox.tsx` and `select.tsx` exist with the APIs used; `FormSection` and `FormGroup` both accept `title` and `description`; `TableRowActions` takes `{ label, onClick, destructive }`; `Badge` exposes all four `dot*` and all five `soft*` variants; `DataTable`'s `rowKey` accepts a string key, so `'batchId'` works; `Prisma.Sql` exposes both `.values` and a `.sql` getter, so the binding assertions in Task 4 are sound; `Prisma.TransactionClient` includes `$executeRaw`, so the capacity guard can run on the transaction client.

**Known gaps left deliberately**

- The batch list query is exercised only through a mocked `$queryRaw`, so the SQL text itself is not proven by any automated test — Task 11's manual dev check validates it. A real integration test would need a test database, which this repo does not have. Task 4 Step 6 names the two specific things that stay unproven and how to fix the likelier one.
- `expandable` gains its first consumer here, so `DataTable`'s expansion path has no prior production exposure. Task 15 Step 4 is the regression check that the shared component is otherwise untouched.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-coupon-management-enhancement.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task with review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.
