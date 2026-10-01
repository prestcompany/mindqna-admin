# Book Order Batch (책 제작 발주) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the book export into its own `책 제작 발주` menu, and store every bindery hand-off (발주) as a confirm-time record that can be listed, searched, opened and re-downloaded.

**Architecture:**
- Backend (`mindqna-server`) adds two tables and a `BookOrderBatchService` inside the existing `admin/book-export` module.
- `POST /batches` re-validates the selected orders with the existing `BookOrderValidationService` and stores the accepted ones with their validation snapshot in one transaction. `GET /batches` and `GET /batches/:id` read them back.
- Frontend (`mindqna-admin`) moves `components/page/book-export` to `components/page/book-order` and extracts the chunked zip download into a hook. It adds a list page with new-발주 and detail side sheets. Both download through the existing `/books` + browser `fflate` path.

**Tech Stack:**
- Backend: NestJS 10, `@nestia/core` 2.x (`TypedRoute`/`TypedBody`/`TypedQuery`/`TypedParam`), Prisma 5 (MySQL), Jest via `yarn jest`.
- Frontend: Next.js pages router, TanStack Query v5, shadcn/ui, `sonner`, `node:test` via `pnpm test`.

**Spec:** `docs/superpowers/specs/2026-10-01-book-order-batch-design.md`

## Global Constraints

- **Two repos.**
  - Backend root: `/Users/gargoyle92/Documents/backend/mindqna-server` (Tasks 1–5).
  - Frontend root: `/Users/gargoyle92/Documents/frontend/mindqna-admin` (Tasks 6–9).
  - Branch: `feature/book-order-batch` in both. The frontend branch already exists with the spec commit. Create the backend branch from `main` before Task 1. Never commit to `main` and never push.
- **Schema changes are manual SQL.** Write `prisma/migrations/20261001000000_add_book_order_batch/migration.sql` and the `schema.prisma` models, and run `npx prisma generate`. **Never run `prisma migrate` or anything that writes to a database.**
- **Evidence level A.** Store metadata and per-order confirm-time snapshots only. Never store zip/JSON. A re-download regenerates from current data.
- **No edit/delete** of 발주 through any API.
- **Limits:**
  - `managerName`: trimmed, 1–50 chars
  - `memo`: trimmed, ≤ 1000 chars (empty → null)
  - `sourceFileName`: 1–255 chars
  - `orders`: 1–500 per confirm, no duplicate `orderNo`
  - per-order column limits: `orderNo` ≤ 50, `orderedAt` ≤ 30, `coverColor` ≤ 50, `paidInner` ≤ 100
  - list page size: 20
- **Error-level orders are never stored.** Stored `level` is `'ok' | 'warning'`. `issues` is stored as a JSON string and returned as an array.
- **List search `q`:** matches when an item `orderNo` equals `q`, OR an item `spaceId` equals `q.toUpperCase()`, OR `managerName` contains `q`. Order is `createdAt desc, id desc`.
- **Backend conventions** (`.cursor/rules/mindbridge-sever-rule.mdc`):
  - English code and comments; all types declared; no `any` outside tests.
  - One runtime export per NEW file. `*.interface.ts` may export many types.
  - kebab-case filenames; verb-first functions; RO-RO for multi-param functions.
  - No blank lines inside function bodies; JSDoc on exports.
  - Format new/changed files with prettier before committing.
- **Backend errors:** `BadRequestException(message)` / `NotFoundException()` from `src/common/exception/error`. Messages shown to users are Korean.
- **Frontend:**
  - axios `baseURL` already includes `/admin`, so client paths are `/book-export/...`.
  - Show errors with `errorMessage(err)` from `src/components/page/coupon/errorMessage.ts`.
  - Verify with `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build` (lint: 0 errors).
  - Use DESIGN.md tokens.
- **No emoji** in code, UI copy, or commit messages.
- **Commit trailer** (after a blank line) on every commit:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GmkAizfVU3DuM4H7nFqpNW`

## Review Focus

1. **Manager name.** An operator types only spaces as the manager name. Both the client button and the server must refuse it, and nothing may be stored. Tests in Task 2 and Task 7.
2. **Duplicate order numbers.** The same Cafe24 order number appears twice in one confirm request (for example, the operator merged two exports). The server must answer 400 and store nothing; the unique index must not surface a 500. Test in Task 2.
3. **Download fails after confirm.** The 발주 must stay stored and stay reachable from its detail, and the zip must never be half-written. The download runner must stop at the first chunk that fails twice. Tests in Task 6 (runner); the UI flow is in Task 9.
4. **Search by space ID.** An operator searches with a lowercase or padded space ID. It must still find the 발주. Test in Task 4.
5. **Large re-download.** A 500-order 발주 is re-downloaded. Requests must stay at 20 orders each, and every order must land in the zip once. Test in Task 6 (runner chunking).

---

## Task 1: Schema models and migration SQL (backend)

**Files:**
- Modify: `prisma/schema.prisma` (append the two models after `model CardExportMeta { ... }`)
- Create: `prisma/migrations/20261001000000_add_book_order_batch/migration.sql`

**Interfaces:**
- Produces: the Prisma client delegates `prisma.bookOrderBatch` and `prisma.bookOrderBatchItem`, and the types `BookOrderBatch` and `BookOrderBatchItem`.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git checkout -b feature/book-order-batch
```

- [ ] **Step 2: Add the models to `prisma/schema.prisma`**

Insert after the closing `}` of `model CardExportMeta`:

```prisma
/// One confirmed hand-off of Cafe24 book orders to the bindery (admin "책 제작 발주").
/// Evidence only: rows are never edited or deleted through the API.
model BookOrderBatch {
  id             Int                  @id @default(autoincrement())
  managerName    String               @db.VarChar(50)
  memo           String?              @db.Text
  sourceFileName String               @db.VarChar(255)
  itemCount      Int
  createdAt      DateTime             @default(now())
  items          BookOrderBatchItem[]

  @@index([createdAt])
}

/// Confirm-time snapshot of one order in a BookOrderBatch. spaceId has no FK on purpose:
/// deleting a space must not erase the evidence.
model BookOrderBatchItem {
  id                Int            @id @default(autoincrement())
  batchId           Int
  orderNo           String         @db.VarChar(50)
  orderedAt         String         @db.VarChar(30)
  spaceId           String
  spaceName         String
  startOrder        Int
  endOrder          Int
  exportEnd         Int
  answeredCount     Int
  paidQuestionCount Int?
  coverColor        String         @db.VarChar(50)
  paidInner         String         @db.VarChar(100)
  level             String         @db.VarChar(10)
  issues            String         @db.Text
  batch             BookOrderBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@unique([batchId, orderNo])
  @@index([orderNo])
  @@index([spaceId])
}
```

- [ ] **Step 3: Write the migration SQL**

`prisma/migrations/20261001000000_add_book_order_batch/migration.sql`:

```sql
-- 어드민 "책 제작 발주" 증적. 제본소에 넘긴 발주 1건과 그 시점의 주문별 스냅샷을 남긴다.
-- 수정·삭제 API는 없다. spaceId 에는 FK 를 두지 않는다(공간이 지워져도 증적은 남아야 함).
-- CreateTable
CREATE TABLE `BookOrderBatch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `managerName` VARCHAR(50) NOT NULL,
    `memo` TEXT NULL,
    `sourceFileName` VARCHAR(255) NOT NULL,
    `itemCount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookOrderBatch_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookOrderBatchItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` INTEGER NOT NULL,
    `orderNo` VARCHAR(50) NOT NULL,
    `orderedAt` VARCHAR(30) NOT NULL,
    `spaceId` VARCHAR(191) NOT NULL,
    `spaceName` VARCHAR(191) NOT NULL,
    `startOrder` INTEGER NOT NULL,
    `endOrder` INTEGER NOT NULL,
    `exportEnd` INTEGER NOT NULL,
    `answeredCount` INTEGER NOT NULL,
    `paidQuestionCount` INTEGER NULL,
    `coverColor` VARCHAR(50) NOT NULL,
    `paidInner` VARCHAR(100) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `issues` TEXT NOT NULL,

    UNIQUE INDEX `BookOrderBatchItem_batchId_orderNo_key`(`batchId`, `orderNo`),
    INDEX `BookOrderBatchItem_orderNo_idx`(`orderNo`),
    INDEX `BookOrderBatchItem_spaceId_idx`(`spaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookOrderBatchItem` ADD CONSTRAINT `BookOrderBatchItem_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `BookOrderBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Check the SQL against Prisma's own output, offline (no database)**

Run:

```bash
npx prisma format
git show HEAD:prisma/schema.prisma > /tmp/book-order-old.prisma
npx prisma migrate diff --from-schema-datamodel /tmp/book-order-old.prisma --to-schema-datamodel prisma/schema.prisma --script
```

Expected: the printed SQL matches `migration.sql` statement for statement. Only the position of the `UNIQUE INDEX` line inside the table may differ. **Do not** use `--from-migrations` or `--shadow-database-url`: those replay migrations into a database and reset it first. No command in this plan may connect to any database.

Then run `npx prisma generate && npx tsc --noEmit -p tsconfig.json`.
Expected: generate succeeds; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261001000000_add_book_order_batch/migration.sql
git commit -m "feat(db): book order batch tables for confirmed bindery hand-offs"
```

---

## Task 2: Batch types, input normalization and order mapping (backend)

**Files:**
- Modify: `src/admin/book-export/book-export.interface.ts` (append types)
- Modify: `src/admin/book-export/book-export.limits.ts` (add limits)
- Create: `src/admin/book-export/normalize-batch-input.ts`, `src/admin/book-export/normalize-batch-input.spec.ts`
- Create: `src/admin/book-export/to-batch-parsed-order.ts`, `src/admin/book-export/to-batch-parsed-order.spec.ts`

**Interfaces:**
- Consumes: `ParsedBookOrder`, `BookOrderIssue`, `BookExportRejectedOrder`, `BOOK_EXPORT_LIMITS.maxOrders` (existing).
- Produces:
  - the types below (`BookOrderBatchItemDto.issues` uses the looser `BookOrderBatchStoredIssue`)
  - `BOOK_EXPORT_LIMITS` gains `maxManagerNameLength: 50`, `maxMemoLength: 1000`, `maxSourceFileNameLength: 255`, `maxOrderNoLength: 50`, `maxOrderedAtLength: 30`, `maxCoverColorLength: 50`, `maxPaidInnerLength: 100`, `batchesPerPage: 20`
  - `normalizeBatchInput(body: BookOrderBatchConfirmBody): NormalizedBatchInput`
  - `toBatchParsedOrder(order: BookBatchRequestOrder): ParsedBookOrder`

- [ ] **Step 1: Append types to `book-export.interface.ts`**

```ts
/** One selected order sent to POST /batches. The server re-validates it; nothing here is trusted. */
export interface BookBatchRequestOrder {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  startOrder: number;
  endOrder: number;
  coverColor: string;
  paidInner: string;
  paidQuestionCount: number | null;
}

export interface BookOrderBatchConfirmBody {
  managerName: string;
  memo?: string | null;
  sourceFileName: string;
  orders: BookBatchRequestOrder[];
}

export interface NormalizedBatchInput {
  managerName: string;
  memo: string | null;
  sourceFileName: string;
  orders: BookBatchRequestOrder[];
}

export interface BookOrderBatchSummary {
  id: number;
  managerName: string;
  memo: string | null;
  sourceFileName: string;
  itemCount: number;
  createdAt: string;
}

/**
 * An issue as stored with a 발주. Deliberately looser than BookOrderIssue: the response is
 * typia-asserted, and an issue code renamed later must not make old evidence unreadable.
 */
export interface BookOrderBatchStoredIssue {
  code: string;
  message: string;
}

export interface BookOrderBatchItemDto {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  spaceName: string;
  startOrder: number;
  endOrder: number;
  exportEnd: number;
  answeredCount: number;
  paidQuestionCount: number | null;
  coverColor: string;
  paidInner: string;
  level: 'ok' | 'warning';
  issues: BookOrderBatchStoredIssue[];
}

export interface BookOrderBatchDetail extends BookOrderBatchSummary {
  items: BookOrderBatchItemDto[];
}

export interface BookOrderBatchConfirmResult {
  batch: BookOrderBatchDetail;
  rejected: BookExportRejectedOrder[];
}

export interface BookOrderBatchListQuery {
  page?: number;
  q?: string;
}

export interface BookOrderBatchListResult {
  items: BookOrderBatchSummary[];
  totalCount: number;
  pageInfo: { totalPage: number };
}
```

- [ ] **Step 2: Extend `book-export.limits.ts`**

Replace the object with:

```ts
/** Upload, request and batch bounds for the admin book export (specs 2026-09-30 §3, 2026-10-01 §3). */
export const BOOK_EXPORT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxOrders: 500,
  maxBooksPerRequest: 20,
  minRangeSize: 30,
  maxRangeSize: 200,
  maxManagerNameLength: 50,
  maxMemoLength: 1000,
  maxSourceFileNameLength: 255,
  maxOrderNoLength: 50,
  maxOrderedAtLength: 30,
  maxCoverColorLength: 50,
  maxPaidInnerLength: 100,
  batchesPerPage: 20,
} as const;
```

- [ ] **Step 3: Write the failing tests**

`src/admin/book-export/normalize-batch-input.spec.ts`:

```ts
import { BookBatchRequestOrder, BookOrderBatchConfirmBody } from './book-export.interface';
import { normalizeBatchInput } from './normalize-batch-input';

const ORDER: BookBatchRequestOrder = {
  orderNo: '20260930-0000024',
  orderedAt: '2026-09-30 14:36',
  spaceId: 'ABCD1234',
  startOrder: 1,
  endOrder: 30,
  coverColor: '브라운',
  paidInner: '선택 안함',
  paidQuestionCount: 30,
};

function buildBody(overrides: Partial<BookOrderBatchConfirmBody> = {}): BookOrderBatchConfirmBody {
  return { managerName: '김담당', memo: '10월 1차', sourceFileName: 'prest201.csv', orders: [ORDER], ...overrides };
}

describe('normalizeBatchInput', () => {
  it('trims the manager name, memo and file name', () => {
    const actual = normalizeBatchInput(buildBody({ managerName: '  김담당 ', memo: ' 메모 ', sourceFileName: ' a.csv ' }));
    expect(actual).toEqual({ managerName: '김담당', memo: '메모', sourceFileName: 'a.csv', orders: [ORDER] });
  });

  it.each([undefined, null, '', '   '])('turns an empty memo (%p) into null', (memo) => {
    expect(normalizeBatchInput(buildBody({ memo })).memo).toBeNull();
  });

  it.each(['', '   ', 'x'.repeat(51)])('rejects a manager name of %p', (managerName) => {
    expect(() => normalizeBatchInput(buildBody({ managerName }))).toThrow('담당자명');
  });

  it('accepts a 50-character manager name', () => {
    expect(normalizeBatchInput(buildBody({ managerName: 'x'.repeat(50) })).managerName).toHaveLength(50);
  });

  it('rejects a memo over 1000 characters', () => {
    expect(() => normalizeBatchInput(buildBody({ memo: 'x'.repeat(1001) }))).toThrow('메모');
  });

  it.each(['', 'x'.repeat(256)])('rejects a source file name of length %p', (sourceFileName) => {
    expect(() => normalizeBatchInput(buildBody({ sourceFileName }))).toThrow('파일명');
  });

  it.each([0, 501])('rejects %p orders', (count) => {
    const orders = Array.from({ length: count }, (_, i) => ({ ...ORDER, orderNo: `O-${i}` }));
    expect(() => normalizeBatchInput(buildBody({ orders }))).toThrow('1~500');
  });

  it('rejects a duplicate order number and names it', () => {
    expect(() => normalizeBatchInput(buildBody({ orders: [ORDER, { ...ORDER }] }))).toThrow('20260930-0000024');
  });

  it.each([
    ['orderNo', 'x'.repeat(51)],
    ['orderedAt', 'x'.repeat(31)],
    ['coverColor', 'x'.repeat(51)],
    ['paidInner', 'x'.repeat(101)],
  ])('rejects an order whose %s is too long for its column', (field, value) => {
    expect(() => normalizeBatchInput(buildBody({ orders: [{ ...ORDER, [field]: value }] }))).toThrow('너무 깁니다');
  });
});
```

`src/admin/book-export/to-batch-parsed-order.spec.ts`:

```ts
import { toBatchParsedOrder } from './to-batch-parsed-order';

describe('toBatchParsedOrder', () => {
  it('maps a request order to a parsed order, normalizing the space ID and carrying confirm-time fields', () => {
    const actual = toBatchParsedOrder({
      orderNo: 'A-1',
      orderedAt: '2026-09-30 14:36',
      spaceId: ' abcd1234 ',
      startOrder: 1,
      endOrder: 30,
      coverColor: '브라운',
      paidInner: '선택 안함',
      paidQuestionCount: 29,
    });
    expect(actual).toEqual({
      orderNo: 'A-1',
      orderedAt: '2026-09-30 14:36',
      spaceId: 'ABCD1234',
      rangeRaw: '1-30',
      isConsistent: true,
      coverColor: '브라운',
      paidInner: '선택 안함',
      paidQuestionCount: 29,
    });
  });
});
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `yarn jest src/admin/book-export/normalize-batch-input.spec.ts src/admin/book-export/to-batch-parsed-order.spec.ts`
Expected: FAIL. Both modules are missing.

- [ ] **Step 5: Implement**

`src/admin/book-export/normalize-batch-input.ts`:

```ts
import { BadRequestException } from 'src/common/exception/error';
import { BookBatchRequestOrder, BookOrderBatchConfirmBody, NormalizedBatchInput } from './book-export.interface';
import { BOOK_EXPORT_LIMITS } from './book-export.limits';

const COLUMN_LIMITS: { field: keyof BookBatchRequestOrder; max: number }[] = [
  { field: 'orderNo', max: BOOK_EXPORT_LIMITS.maxOrderNoLength },
  { field: 'orderedAt', max: BOOK_EXPORT_LIMITS.maxOrderedAtLength },
  { field: 'coverColor', max: BOOK_EXPORT_LIMITS.maxCoverColorLength },
  { field: 'paidInner', max: BOOK_EXPORT_LIMITS.maxPaidInnerLength },
];

/**
 * Checks and trims a POST /batches body before anything is validated or stored. Throws a 400
 * with a Korean message for out-of-bounds text, order count, duplicate order numbers, or values
 * that would not fit their columns (which would otherwise surface as a 500 from the database).
 */
export function normalizeBatchInput(body: BookOrderBatchConfirmBody): NormalizedBatchInput {
  const managerName = body.managerName.trim();
  const memo = (body.memo ?? '').trim();
  const sourceFileName = body.sourceFileName.trim();
  if (managerName.length === 0 || managerName.length > BOOK_EXPORT_LIMITS.maxManagerNameLength) {
    throw BadRequestException(`담당자명은 1~${BOOK_EXPORT_LIMITS.maxManagerNameLength}자로 입력해 주세요.`);
  }
  if (memo.length > BOOK_EXPORT_LIMITS.maxMemoLength) {
    throw BadRequestException(`메모는 ${BOOK_EXPORT_LIMITS.maxMemoLength}자 이하로 입력해 주세요.`);
  }
  if (sourceFileName.length === 0 || sourceFileName.length > BOOK_EXPORT_LIMITS.maxSourceFileNameLength) {
    throw BadRequestException('원본 파일명이 올바르지 않습니다.');
  }
  assertOrders(body.orders);
  return { managerName, memo: memo || null, sourceFileName, orders: body.orders };
}

function assertOrders(orders: BookBatchRequestOrder[]): void {
  if (orders.length === 0 || orders.length > BOOK_EXPORT_LIMITS.maxOrders) {
    throw BadRequestException(`한 번에 1~${BOOK_EXPORT_LIMITS.maxOrders}건까지 발주할 수 있습니다.`);
  }
  const seen = new Set<string>();
  orders.forEach((order) => {
    if (seen.has(order.orderNo)) throw BadRequestException(`같은 주문번호가 두 번 들어 있습니다: ${order.orderNo}`);
    seen.add(order.orderNo);
    const tooLong = COLUMN_LIMITS.find(({ field, max }) => String(order[field] ?? '').length > max);
    if (tooLong) throw BadRequestException(`주문 정보가 너무 깁니다: ${order.orderNo} (${tooLong.field})`);
  });
}
```

`src/admin/book-export/to-batch-parsed-order.ts`:

```ts
import { BookBatchRequestOrder, ParsedBookOrder } from './book-export.interface';

/**
 * Turns a confirm request order back into the parser's shape so the upload validator can re-check
 * it. Unlike the /books mapping, it keeps orderedAt and paidQuestionCount, so confirm-time warnings
 * such as PAID_COUNT_MISMATCH are recomputed and stored.
 */
export function toBatchParsedOrder(order: BookBatchRequestOrder): ParsedBookOrder {
  return {
    orderNo: order.orderNo,
    orderedAt: order.orderedAt,
    spaceId: order.spaceId.trim().toUpperCase(),
    rangeRaw: `${order.startOrder}-${order.endOrder}`,
    isConsistent: true,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
    paidQuestionCount: order.paidQuestionCount,
  };
}
```

- [ ] **Step 6: Run the tests, then typecheck and format**

Run: `yarn jest src/admin/book-export && npx tsc --noEmit -p tsconfig.json && npx prettier --write src/admin/book-export/book-export.interface.ts src/admin/book-export/book-export.limits.ts src/admin/book-export/normalize-batch-input.ts src/admin/book-export/normalize-batch-input.spec.ts src/admin/book-export/to-batch-parsed-order.ts src/admin/book-export/to-batch-parsed-order.spec.ts`
Expected: all specs PASS (existing book-export specs included); tsc exits 0. Format only the files this task touches; several older book-export files are not prettier-clean and must not ride along.

- [ ] **Step 7: Commit**

```bash
git add src/admin/book-export/book-export.interface.ts src/admin/book-export/book-export.limits.ts src/admin/book-export/normalize-batch-input.ts src/admin/book-export/normalize-batch-input.spec.ts src/admin/book-export/to-batch-parsed-order.ts src/admin/book-export/to-batch-parsed-order.spec.ts
git commit -m "feat(book-export): batch types, input limits, and confirm-order mapping"
```

---

## Task 3: Confirm a batch (backend)

**Files:**
- Create: `src/admin/book-export/to-batch-summary.ts`
- Create: `src/admin/book-export/to-batch-detail.ts`
- Create: `src/admin/book-export/book-order-batch.service.ts`
- Create: `src/admin/book-export/book-order-batch.service.spec.ts`

**Interfaces:**
- Consumes:
  - `normalizeBatchInput` and `toBatchParsedOrder` (Task 2)
  - `BookOrderValidationService.validateOrders(orders: ParsedBookOrder[]): Promise<BookOrderValidation[]>` (existing; returns results in input order)
  - Prisma `bookOrderBatch` / `bookOrderBatchItem` (Task 1)
- Produces:
  - `toBatchSummary(batch: BookOrderBatch): BookOrderBatchSummary`
  - `toBatchDetail(batch: BookOrderBatch & { items: BookOrderBatchItem[] }): BookOrderBatchDetail`
  - `class BookOrderBatchService` with `confirmBatch(body: BookOrderBatchConfirmBody): Promise<BookOrderBatchConfirmResult>`. Task 4 adds `listBatches` and `getBatch`.

- [ ] **Step 1: Write the failing tests**

`src/admin/book-export/book-order-batch.service.spec.ts`:

```ts
import { BookBatchRequestOrder, BookOrderBatchConfirmBody, BookOrderValidation } from './book-export.interface';

jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('./book-order-validation.service', () => ({ BookOrderValidationService: class {} }));

const { BookOrderBatchService } = require('./book-order-batch.service');

const REQUEST: BookBatchRequestOrder = {
  orderNo: 'A-1',
  orderedAt: '2026-09-30 14:36',
  spaceId: 'abcd1234',
  startOrder: 1,
  endOrder: 30,
  coverColor: '브라운',
  paidInner: '선택 안함',
  paidQuestionCount: 30,
};

function buildBody(orders: BookBatchRequestOrder[] = [REQUEST]): BookOrderBatchConfirmBody {
  return { managerName: ' 김담당 ', memo: '', sourceFileName: 'prest201.csv', orders };
}

function buildValidation(overrides: Partial<BookOrderValidation> = {}): BookOrderValidation {
  return {
    orderNo: 'A-1',
    orderedAt: '2026-09-30 14:36',
    spaceId: 'ABCD1234',
    rangeRaw: '1-30',
    startOrder: 1,
    endOrder: 30,
    exportEnd: 29,
    paidQuestionCount: 30,
    answeredCount: 29,
    coverColor: '브라운',
    paidInner: '선택 안함',
    spaceName: '우리 가족',
    locale: 'ko',
    level: 'warning',
    issues: [{ code: 'UNANSWERED_DROPPED', message: '답변이 없는 질문은 책에서 빠집니다.' }],
    ...overrides,
  };
}

function buildStoredBatch(items: Record<string, unknown>[]) {
  return {
    id: 7,
    managerName: '김담당',
    memo: null,
    sourceFileName: 'prest201.csv',
    itemCount: items.length,
    createdAt: new Date('2026-10-01T01:02:03Z'),
    items,
  };
}

describe('BookOrderBatchService.confirmBatch', () => {
  let tx: any;
  let prisma: any;
  let validation: any;
  let service: any;

  beforeEach(() => {
    tx = {
      bookOrderBatch: {
        create: jest.fn().mockResolvedValue({ id: 7 }),
        findUniqueOrThrow: jest.fn(),
      },
      bookOrderBatchItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    prisma = { $transaction: jest.fn((callback: (client: unknown) => unknown) => callback(tx)) };
    validation = { validateOrders: jest.fn() };
    service = new BookOrderBatchService(prisma, validation);
  });

  it('re-validates the request with confirm-time fields and an uppercased space ID', async () => {
    validation.validateOrders.mockResolvedValue([buildValidation()]);
    tx.bookOrderBatch.findUniqueOrThrow.mockResolvedValue(buildStoredBatch([]));
    await service.confirmBatch(buildBody());
    expect(validation.validateOrders).toHaveBeenCalledWith([
      {
        orderNo: 'A-1',
        orderedAt: '2026-09-30 14:36',
        spaceId: 'ABCD1234',
        rangeRaw: '1-30',
        isConsistent: true,
        coverColor: '브라운',
        paidInner: '선택 안함',
        paidQuestionCount: 30,
      },
    ]);
  });

  it('stores the batch and the confirm-time snapshot of each accepted order in one transaction', async () => {
    validation.validateOrders.mockResolvedValue([buildValidation()]);
    tx.bookOrderBatch.findUniqueOrThrow.mockResolvedValue(buildStoredBatch([]));
    await service.confirmBatch(buildBody());
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.bookOrderBatch.create).toHaveBeenCalledWith({
      data: { managerName: '김담당', memo: null, sourceFileName: 'prest201.csv', itemCount: 1 },
    });
    expect(tx.bookOrderBatchItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          batchId: 7,
          orderNo: 'A-1',
          orderedAt: '2026-09-30 14:36',
          spaceId: 'ABCD1234',
          spaceName: '우리 가족',
          startOrder: 1,
          endOrder: 30,
          exportEnd: 29,
          answeredCount: 29,
          paidQuestionCount: 30,
          coverColor: '브라운',
          paidInner: '선택 안함',
          level: 'warning',
          issues: JSON.stringify([{ code: 'UNANSWERED_DROPPED', message: '답변이 없는 질문은 책에서 빠집니다.' }]),
        },
      ],
    });
    expect(tx.bookOrderBatch.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { items: { orderBy: { id: 'asc' } } },
    });
  });

  it('returns the stored detail with issues parsed back to an array, plus the rejected orders', async () => {
    const rejected = buildValidation({
      orderNo: 'A-2',
      level: 'error',
      issues: [{ code: 'SPACE_NOT_FOUND', message: '존재하지 않는 공간 ID입니다.' }],
    });
    validation.validateOrders.mockResolvedValue([buildValidation(), rejected]);
    tx.bookOrderBatch.findUniqueOrThrow.mockResolvedValue(
      buildStoredBatch([
        {
          id: 1,
          batchId: 7,
          orderNo: 'A-1',
          orderedAt: '2026-09-30 14:36',
          spaceId: 'ABCD1234',
          spaceName: '우리 가족',
          startOrder: 1,
          endOrder: 30,
          exportEnd: 29,
          answeredCount: 29,
          paidQuestionCount: 30,
          coverColor: '브라운',
          paidInner: '선택 안함',
          level: 'warning',
          issues: '[{"code":"UNANSWERED_DROPPED","message":"답변이 없는 질문은 책에서 빠집니다."}]',
        },
      ]),
    );
    const actual = await service.confirmBatch(buildBody([REQUEST, { ...REQUEST, orderNo: 'A-2' }]));
    expect(tx.bookOrderBatch.create.mock.calls[0][0].data.itemCount).toBe(1);
    expect(actual.rejected).toEqual([{ orderNo: 'A-2', issues: rejected.issues }]);
    expect(actual.batch).toEqual({
      id: 7,
      managerName: '김담당',
      memo: null,
      sourceFileName: 'prest201.csv',
      itemCount: 1,
      createdAt: '2026-10-01T01:02:03.000Z',
      items: [
        {
          orderNo: 'A-1',
          orderedAt: '2026-09-30 14:36',
          spaceId: 'ABCD1234',
          spaceName: '우리 가족',
          startOrder: 1,
          endOrder: 30,
          exportEnd: 29,
          answeredCount: 29,
          paidQuestionCount: 30,
          coverColor: '브라운',
          paidInner: '선택 안함',
          level: 'warning',
          issues: [{ code: 'UNANSWERED_DROPPED', message: '답변이 없는 질문은 책에서 빠집니다.' }],
        },
      ],
    });
  });

  it('stores nothing and answers 400 when every order is rejected', async () => {
    validation.validateOrders.mockResolvedValue([buildValidation({ level: 'error', issues: [] })]);
    await expect(service.confirmBatch(buildBody())).rejects.toThrow('발주할 수 있는 주문이 없습니다');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('checks the input before validating anything', async () => {
    await expect(service.confirmBatch({ ...buildBody(), managerName: '   ' })).rejects.toThrow('담당자명');
    expect(validation.validateOrders).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `yarn jest src/admin/book-export/book-order-batch.service.spec.ts`
Expected: FAIL with "Cannot find module './book-order-batch.service'".

- [ ] **Step 3: Implement the mappers and the service**

`src/admin/book-export/to-batch-summary.ts`:

```ts
import { BookOrderBatch } from '@prisma/client';
import { BookOrderBatchSummary } from './book-export.interface';

/** Maps a stored batch row to its list/header shape. */
export function toBatchSummary(batch: BookOrderBatch): BookOrderBatchSummary {
  return {
    id: batch.id,
    managerName: batch.managerName,
    memo: batch.memo,
    sourceFileName: batch.sourceFileName,
    itemCount: batch.itemCount,
    createdAt: batch.createdAt.toISOString(),
  };
}
```

`src/admin/book-export/to-batch-detail.ts`:

```ts
import { BookOrderBatch, BookOrderBatchItem } from '@prisma/client';
import { BookOrderBatchDetail, BookOrderBatchStoredIssue } from './book-export.interface';
import { toBatchSummary } from './to-batch-summary';

/** Maps a stored batch with its items to the detail shape; `issues` is parsed back from JSON. */
export function toBatchDetail(batch: BookOrderBatch & { items: BookOrderBatchItem[] }): BookOrderBatchDetail {
  return {
    ...toBatchSummary(batch),
    items: batch.items.map((item) => ({
      orderNo: item.orderNo,
      orderedAt: item.orderedAt,
      spaceId: item.spaceId,
      spaceName: item.spaceName,
      startOrder: item.startOrder,
      endOrder: item.endOrder,
      exportEnd: item.exportEnd,
      answeredCount: item.answeredCount,
      paidQuestionCount: item.paidQuestionCount,
      coverColor: item.coverColor,
      paidInner: item.paidInner,
      level: item.level === 'warning' ? 'warning' : 'ok',
      issues: JSON.parse(item.issues) as BookOrderBatchStoredIssue[],
    })),
  };
}
```

`src/admin/book-export/book-order-batch.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BadRequestException } from 'src/common/exception/error';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BookExportRejectedOrder,
  BookOrderBatchConfirmBody,
  BookOrderBatchConfirmResult,
  BookOrderValidation,
} from './book-export.interface';
import { BookOrderValidationService } from './book-order-validation.service';
import { normalizeBatchInput } from './normalize-batch-input';
import { toBatchDetail } from './to-batch-detail';
import { toBatchParsedOrder } from './to-batch-parsed-order';

const ITEMS_IN_INSERT_ORDER = { items: { orderBy: { id: 'asc' } } } as const;
const MAX_INT_ID = 2147483647;

/** Confirms, lists and reads admin "책 제작 발주" batches (spec 2026-10-01 §3). */
@Injectable()
export class BookOrderBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: BookOrderValidationService,
  ) {}

  /** Re-validates the selected orders and stores the accepted ones with their confirm-time snapshot. */
  async confirmBatch(body: BookOrderBatchConfirmBody): Promise<BookOrderBatchConfirmResult> {
    const input = normalizeBatchInput(body);
    const validations = await this.validation.validateOrders(input.orders.map(toBatchParsedOrder));
    const rejected: BookExportRejectedOrder[] = validations
      .filter((validation) => validation.level === 'error')
      .map((validation) => ({ orderNo: validation.orderNo, issues: validation.issues }));
    const accepted = validations.filter((validation) => validation.level !== 'error');
    if (accepted.length === 0) throw BadRequestException('발주할 수 있는 주문이 없습니다.');
    const stored = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.bookOrderBatch.create({
        data: {
          managerName: input.managerName,
          memo: input.memo,
          sourceFileName: input.sourceFileName,
          itemCount: accepted.length,
        },
      });
      await tx.bookOrderBatchItem.createMany({
        data: accepted.map((validation) => toItemData({ batchId: batch.id, validation })),
      });
      return tx.bookOrderBatch.findUniqueOrThrow({ where: { id: batch.id }, include: ITEMS_IN_INSERT_ORDER });
    });
    return { batch: toBatchDetail(stored), rejected };
  }
}

function toItemData(params: {
  batchId: number;
  validation: BookOrderValidation;
}): Prisma.BookOrderBatchItemCreateManyInput {
  const { batchId, validation } = params;
  if (validation.startOrder === null || validation.endOrder === null || validation.exportEnd === null) {
    throw new Error(`Order ${validation.orderNo} has no export range`);
  }
  return {
    batchId,
    orderNo: validation.orderNo,
    orderedAt: validation.orderedAt,
    spaceId: validation.spaceId,
    spaceName: validation.spaceName,
    startOrder: validation.startOrder,
    endOrder: validation.endOrder,
    exportEnd: validation.exportEnd,
    answeredCount: validation.answeredCount,
    paidQuestionCount: validation.paidQuestionCount,
    coverColor: validation.coverColor,
    paidInner: validation.paidInner,
    level: validation.level,
    issues: JSON.stringify(validation.issues),
  };
}
```

`toItemData` throws a plain `Error` on a null range. That branch is unreachable: a non-error validation always has a parsed range, and it has `exportEnd` because `answeredCount > 0`. It guards against a future invariant break.

- [ ] **Step 4: Run the tests, then typecheck and format**

Run: `yarn jest src/admin/book-export && npx tsc --noEmit -p tsconfig.json && npx prettier --write src/admin/book-export/to-batch-summary.ts src/admin/book-export/to-batch-detail.ts src/admin/book-export/book-order-batch.service.ts src/admin/book-export/book-order-batch.service.spec.ts`
Expected: PASS; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/admin/book-export/to-batch-summary.ts src/admin/book-export/to-batch-detail.ts src/admin/book-export/book-order-batch.service.ts src/admin/book-export/book-order-batch.service.spec.ts
git commit -m "feat(book-export): confirm a bindery batch with a confirm-time snapshot"
```

---

## Task 4: List and read batches (backend)

**Files:**
- Create: `src/admin/book-export/build-batch-where.ts`, `src/admin/book-export/build-batch-where.spec.ts`
- Modify: `src/admin/book-export/book-order-batch.service.ts` (add two methods)
- Modify: `src/admin/book-export/book-order-batch.service.spec.ts` (add two describes)

**Interfaces:**
- Consumes: `toBatchSummary` and `toBatchDetail` (Task 3); `BOOK_EXPORT_LIMITS.batchesPerPage` (Task 2).
- Produces:
  - `buildBatchWhere(q: string | undefined): Prisma.BookOrderBatchWhereInput`
  - `listBatches(query: BookOrderBatchListQuery): Promise<BookOrderBatchListResult>`
  - `getBatch(id: number): Promise<BookOrderBatchDetail>`

- [ ] **Step 1: Write the failing tests**

`src/admin/book-export/build-batch-where.spec.ts`:

```ts
import { buildBatchWhere } from './build-batch-where';

describe('buildBatchWhere', () => {
  it.each([undefined, '', '   '])('matches everything for an empty query (%p)', (q) => {
    expect(buildBatchWhere(q)).toEqual({});
  });

  it('matches an exact order number, an uppercased exact space ID, or a manager name substring', () => {
    expect(buildBatchWhere('  abcd1234 ')).toEqual({
      OR: [
        { items: { some: { orderNo: 'abcd1234' } } },
        { items: { some: { spaceId: 'ABCD1234' } } },
        { managerName: { contains: 'abcd1234' } },
      ],
    });
  });
});
```

Append to `src/admin/book-export/book-order-batch.service.spec.ts`:

```ts
describe('BookOrderBatchService.listBatches', () => {
  let prisma: any;
  let service: any;

  beforeEach(() => {
    prisma = {
      bookOrderBatch: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    service = new BookOrderBatchService(prisma, {});
  });

  it('pages 20 at a time, newest first, with the search where-clause on both queries', async () => {
    prisma.bookOrderBatch.findMany.mockResolvedValue([buildStoredBatch([])]);
    prisma.bookOrderBatch.count.mockResolvedValue(41);
    const actual = await service.listBatches({ page: 3, q: 'abcd1234' });
    const where = {
      OR: [
        { items: { some: { orderNo: 'abcd1234' } } },
        { items: { some: { spaceId: 'ABCD1234' } } },
        { managerName: { contains: 'abcd1234' } },
      ],
    };
    expect(prisma.bookOrderBatch.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      skip: 40,
    });
    expect(prisma.bookOrderBatch.count).toHaveBeenCalledWith({ where });
    expect(actual).toEqual({
      items: [
        {
          id: 7,
          managerName: '김담당',
          memo: null,
          sourceFileName: 'prest201.csv',
          itemCount: 0,
          createdAt: '2026-10-01T01:02:03.000Z',
        },
      ],
      totalCount: 41,
      pageInfo: { totalPage: 3 },
    });
  });

  it.each([undefined, 0, -1])('treats page %p as page 1', async (page) => {
    await service.listBatches({ page });
    expect(prisma.bookOrderBatch.findMany.mock.calls[0][0].skip).toBe(0);
  });
});

describe('BookOrderBatchService.getBatch', () => {
  let prisma: any;
  let service: any;

  beforeEach(() => {
    prisma = { bookOrderBatch: { findUnique: jest.fn() } };
    service = new BookOrderBatchService(prisma, {});
  });

  it('reads the batch with its items in insert order', async () => {
    prisma.bookOrderBatch.findUnique.mockResolvedValue(buildStoredBatch([]));
    const actual = await service.getBatch(7);
    expect(prisma.bookOrderBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { items: { orderBy: { id: 'asc' } } },
    });
    expect(actual.id).toBe(7);
  });

  it('answers 404 for an unknown batch', async () => {
    prisma.bookOrderBatch.findUnique.mockResolvedValue(null);
    await expect(service.getBatch(999)).rejects.toThrow('Not Found');
  });

  it.each([0, -1, 1.5, 2147483648])('answers 404 without querying for an invalid id %p', async (id) => {
    await expect(service.getBatch(id)).rejects.toThrow('Not Found');
    expect(prisma.bookOrderBatch.findUnique).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `yarn jest src/admin/book-export/build-batch-where.spec.ts src/admin/book-export/book-order-batch.service.spec.ts`
Expected: FAIL. `./build-batch-where` is missing, and `listBatches` / `getBatch` are not functions.

- [ ] **Step 3: Implement**

`src/admin/book-export/build-batch-where.ts`:

```ts
import { Prisma } from '@prisma/client';

/**
 * Search for the batch list (spec 2026-10-01 §3.2): an exact Cafe24 order number, an exact space ID
 * (uppercased, since Space.id is [0-9A-Z]), or part of the manager name. Empty matches everything.
 */
export function buildBatchWhere(q: string | undefined): Prisma.BookOrderBatchWhereInput {
  const text = q?.trim() ?? '';
  if (!text) return {};
  return {
    OR: [
      { items: { some: { orderNo: text } } },
      { items: { some: { spaceId: text.toUpperCase() } } },
      { managerName: { contains: text } },
    ],
  };
}
```

In `book-order-batch.service.ts`, add these imports:
- `NotFoundException` next to `BadRequestException`
- `BookOrderBatchDetail`, `BookOrderBatchListQuery`, `BookOrderBatchListResult` from the interface file
- `BOOK_EXPORT_LIMITS` from `./book-export.limits`
- `buildBatchWhere` from `./build-batch-where`
- `toBatchSummary` from `./to-batch-summary`

Then add the methods below `confirmBatch`:

```ts
  /** Lists batches newest first, 20 per page, optionally filtered by order number, space ID or manager. */
  async listBatches(query: BookOrderBatchListQuery): Promise<BookOrderBatchListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const perPage = BOOK_EXPORT_LIMITS.batchesPerPage;
    const where = buildBatchWhere(query.q);
    const [batches, totalCount] = await this.prisma.$transaction([
      this.prisma.bookOrderBatch.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: perPage,
        skip: (page - 1) * perPage,
      }),
      this.prisma.bookOrderBatch.count({ where }),
    ]);
    return { items: batches.map(toBatchSummary), totalCount, pageInfo: { totalPage: Math.ceil(totalCount / perPage) } };
  }

  /** Reads one batch with its items; 404 when it does not exist or the id is not a valid INT key. */
  async getBatch(id: number): Promise<BookOrderBatchDetail> {
    if (!Number.isInteger(id) || id < 1 || id > MAX_INT_ID) throw NotFoundException();
    const batch = await this.prisma.bookOrderBatch.findUnique({ where: { id }, include: ITEMS_IN_INSERT_ORDER });
    if (!batch) throw NotFoundException();
    return toBatchDetail(batch);
  }
```

- [ ] **Step 4: Run the tests, then typecheck and format**

Run: `yarn jest src/admin/book-export && npx tsc --noEmit -p tsconfig.json && npx prettier --write src/admin/book-export/build-batch-where.ts src/admin/book-export/build-batch-where.spec.ts src/admin/book-export/book-order-batch.service.ts src/admin/book-export/book-order-batch.service.spec.ts`
Expected: PASS; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/admin/book-export/build-batch-where.ts src/admin/book-export/build-batch-where.spec.ts src/admin/book-export/book-order-batch.service.ts src/admin/book-export/book-order-batch.service.spec.ts
git commit -m "feat(book-export): list and read bindery batches with order and space search"
```

---

## Task 5: Batch routes (backend)

**Files:**
- Modify: `src/admin/book-export/book-export.controller.ts`
- Modify: `src/admin/book-export/book-export.module.ts`

**Interfaces:**
- Consumes: `BookOrderBatchService` (Tasks 3–4).
- Produces:
  - `POST /admin/book-export/batches`: body `BookOrderBatchConfirmBody` → `BookOrderBatchConfirmResult`
  - `GET /admin/book-export/batches`: query `BookOrderBatchListQuery` → `BookOrderBatchListResult`
  - `GET /admin/book-export/batches/:id` → `BookOrderBatchDetail`

- [ ] **Step 1: Add the routes**

`book-export.controller.ts`:
- Import `TypedParam` and `TypedQuery` from `@nestia/core`, `BookOrderBatchService` from `./book-order-batch.service`, and the batch types from the interface file.
- Add `private readonly batches: BookOrderBatchService` as the third constructor parameter.
- Append:

```ts
  /** Confirms a bindery batch: re-validates the selected orders and stores the accepted ones. */
  @TypedRoute.Post('/batches')
  async confirmBatch(@TypedBody() body: BookOrderBatchConfirmBody): Promise<BookOrderBatchConfirmResult> {
    return this.batches.confirmBatch(body);
  }

  // Static `/batches` stays declared before `/batches/:id` so the list is not captured by the id param.
  /** Lists confirmed batches, newest first, with optional order number / space ID / manager search. */
  @TypedRoute.Get('/batches')
  async listBatches(@TypedQuery() query: BookOrderBatchListQuery): Promise<BookOrderBatchListResult> {
    return this.batches.listBatches(query);
  }

  /** Reads one confirmed batch with its confirm-time items. */
  @TypedRoute.Get('/batches/:id')
  async getBatch(@TypedParam('id') id: number): Promise<BookOrderBatchDetail> {
    return this.batches.getBatch(id);
  }
```

Update the class JSDoc to: `/** Admin book export: validate a Cafe24 order export, fetch book JSON, and confirm/list bindery batches. */`

`book-export.module.ts`: add `BookOrderBatchService` to `providers` and import it. Update the module comment to mention batches.

- [ ] **Step 2: Typecheck, test, build**

Run: `npx tsc --noEmit -p tsconfig.json && yarn jest src/admin/book-export src/card/export && yarn build`
Expected: tsc exits 0, all specs PASS, `nest build` succeeds.

- [ ] **Step 3: Smoke test (only if possible without touching dev/prod data)**

Skip this step unless both of the following hold:
- a local server can start against a database you are allowed to write to, and
- the migration from Task 1 has been applied there.

Otherwise write "Step 3 not run: <reason>" in the report. The routes must not be exercised against dev or prod, because `POST /batches` writes rows.

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write src/admin/book-export/book-export.controller.ts src/admin/book-export/book-export.module.ts
git add src/admin/book-export/book-export.controller.ts src/admin/book-export/book-export.module.ts
git commit -m "feat(book-export): expose confirm, list and detail routes for bindery batches"
```

---

## Task 6: Move to `book-order`, extract the zip download (frontend, no behavior change)

**Files:**
- Move: `src/components/page/book-export/` → `src/components/page/book-order/` (`git mv`)
- Create: `src/components/page/book-order/services/run-book-zip-download.ts`, `src/components/page/book-order/services/run-book-zip-download.test.ts`
- Create: `src/components/page/book-order/useBookZipDownload.ts`
- Modify: `src/components/page/book-order/BookExportPanel.tsx`, `src/components/page/book-order/BookExportPreviewDialog.tsx`
- Modify: `src/components/page/pdf-export/PdfExportManager.tsx` (import path only)

**Interfaces:**
- Consumes:
  - `getBookExportBooks(orders)`
  - `chunkItems` and `BOOKS_PER_REQUEST` from `services/book-export-download.ts`
  - `createBookZipWriter()` from `services/book-zip-writer.ts`
- Produces:
  - `runBookZipDownload(params: { orders: BookExportRequestOrder[]; fetchBooks: (chunk: BookExportRequestOrder[]) => Promise<BookExportBooksResult>; onProgress: (done: number) => void }): Promise<BookZipRun>`, where `BookZipRun = { zip: Blob; bookCount: number; rejected: BookExportRejectedOrder[] }`. It throws when a chunk fails twice.
  - `useBookZipDownload(): { progress: { done: number; total: number } | null; isDownloading: boolean; download: (params: { orders: BookExportRequestOrder[]; fileName: string }) => Promise<BookZipRun> }`. It saves the zip only when `bookCount > 0`, and rethrows on failure.
  - `BookExportPreviewDialog` props become `{ request: BookExportRequestOrder | null; onClose: () => void }`.

- [ ] **Step 1: Move the folder and fix imports**

```bash
git mv src/components/page/book-export src/components/page/book-order
```

In `src/components/page/pdf-export/PdfExportManager.tsx`, change the import to `@/components/page/book-order/BookExportPanel`. Then run `grep -rn "page/book-export" src`; it must return nothing.

- [ ] **Step 2: Write the failing runner test**

`src/components/page/book-order/services/run-book-zip-download.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { unzipSync } from 'fflate';

import type { BookExportBook, BookExportBooksResult, BookExportRequestOrder } from '../../../../client/types';
import { runBookZipDownload } from './run-book-zip-download';

function buildOrders(count: number): BookExportRequestOrder[] {
  return Array.from({ length: count }, (_, i) => ({
    orderNo: `O-${i}`,
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
  }));
}

function buildBook(orderNo: string): BookExportBook {
  return {
    orderNo,
    coverColor: '브라운',
    paidInner: '선택 안함',
    cover: { spaceName: '우리', startOrder: 1, endOrder: 30, count: 30, generatedAt: '2026-10-01', locale: 'ko' },
    cards: [],
  };
}

async function fetchAll(chunk: BookExportRequestOrder[]): Promise<BookExportBooksResult> {
  return { books: chunk.map((order) => buildBook(order.orderNo)), rejected: [] };
}

test('fetches 20 orders per request and zips every order exactly once', async () => {
  const sizes: number[] = [];
  const progress: number[] = [];
  const run = await runBookZipDownload({
    orders: buildOrders(41),
    fetchBooks: async (chunk) => {
      sizes.push(chunk.length);
      return fetchAll(chunk);
    },
    onProgress: (done) => progress.push(done),
  });
  assert.deepEqual(sizes, [20, 20, 1]);
  assert.deepEqual(progress, [20, 40, 41]);
  assert.equal(run.bookCount, 41);
  const files = unzipSync(new Uint8Array(await run.zip.arrayBuffer()));
  assert.equal(Object.keys(files).length, 41);
});

test('collects the orders the server rejected', async () => {
  const run = await runBookZipDownload({
    orders: buildOrders(2),
    fetchBooks: async (chunk) => ({
      books: [buildBook(chunk[0].orderNo)],
      rejected: [{ orderNo: chunk[1].orderNo, issues: [] }],
    }),
    onProgress: () => undefined,
  });
  assert.equal(run.bookCount, 1);
  assert.deepEqual(run.rejected, [{ orderNo: 'O-1', issues: [] }]);
});

test('retries a failed chunk once and continues', async () => {
  let calls = 0;
  const run = await runBookZipDownload({
    orders: buildOrders(1),
    fetchBooks: async (chunk) => {
      calls += 1;
      if (calls === 1) throw new Error('network');
      return fetchAll(chunk);
    },
    onProgress: () => undefined,
  });
  assert.equal(calls, 2);
  assert.equal(run.bookCount, 1);
});

test('stops at the first chunk that fails twice and fetches nothing after it', async () => {
  const seen: string[] = [];
  await assert.rejects(
    runBookZipDownload({
      orders: buildOrders(45),
      fetchBooks: async (chunk) => {
        seen.push(chunk[0].orderNo);
        if (chunk[0].orderNo === 'O-20') throw new Error('down');
        return fetchAll(chunk);
      },
      onProgress: () => undefined,
    }),
    /down/,
  );
  assert.deepEqual(seen, ['O-0', 'O-20', 'O-20']);
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `pnpm test`
Expected: FAIL, because `./run-book-zip-download` cannot be found.

- [ ] **Step 4: Implement the runner and the hook**

`src/components/page/book-order/services/run-book-zip-download.ts`:

```ts
import type { BookExportBooksResult, BookExportRejectedOrder, BookExportRequestOrder } from '../../../../client/types';
import { BOOKS_PER_REQUEST, chunkItems } from './book-export-download';
import { createBookZipWriter } from './book-zip-writer';

export type BookZipRun = { zip: Blob; bookCount: number; rejected: BookExportRejectedOrder[] };

type RunParams = {
  orders: BookExportRequestOrder[];
  fetchBooks: (chunk: BookExportRequestOrder[]) => Promise<BookExportBooksResult>;
  onProgress: (done: number) => void;
};

// One retry per chunk: a transient failure late in a long run should not throw away finished chunks.
async function fetchWithRetry(
  fetchBooks: RunParams['fetchBooks'],
  chunk: BookExportRequestOrder[],
): Promise<BookExportBooksResult> {
  try {
    return await fetchBooks(chunk);
  } catch {
    return fetchBooks(chunk);
  }
}

// Fetches books 20 at a time and streams them into one zip. A chunk that fails twice throws, so the
// caller never gets a partial zip.
export async function runBookZipDownload({ orders, fetchBooks, onProgress }: RunParams): Promise<BookZipRun> {
  const writer = await createBookZipWriter();
  const rejected: BookExportRejectedOrder[] = [];
  let bookCount = 0;
  let done = 0;
  for (const chunk of chunkItems(orders, BOOKS_PER_REQUEST)) {
    const result = await fetchWithRetry(fetchBooks, chunk);
    writer.add(result.books);
    bookCount += result.books.length;
    rejected.push(...result.rejected);
    done += chunk.length;
    onProgress(done);
  }
  return { zip: await writer.finish(), bookCount, rejected };
}
```

`src/components/page/book-order/useBookZipDownload.ts`:

```ts
import { getBookExportBooks } from '@/client/book-export';
import type { BookExportRequestOrder } from '@/client/types';
import { useState } from 'react';
import { runBookZipDownload, type BookZipRun } from './services/run-book-zip-download';

const REVOKE_DELAY_MS = 60_000;

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoking right away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

// Shared by the new-발주 sheet and the detail sheet's re-download. Saves only when at least one
// book was built; rethrows when a chunk fails twice so the caller can say what happened.
export function useBookZipDownload() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const download = async ({ orders, fileName }: { orders: BookExportRequestOrder[]; fileName: string }): Promise<BookZipRun> => {
    setProgress({ done: 0, total: orders.length });
    try {
      const run = await runBookZipDownload({
        orders,
        fetchBooks: getBookExportBooks,
        onProgress: (done) => setProgress({ done, total: orders.length }),
      });
      if (run.bookCount > 0) saveBlob(run.zip, fileName);
      return run;
    } finally {
      setProgress(null);
    }
  };

  return { progress, isDownloading: progress !== null, download };
}
```

- [ ] **Step 5: Use the hook in the panel and switch the preview to a request**

In `BookExportPanel.tsx`:
- Remove `REVOKE_DELAY_MS`, `saveZip` and `fetchBooksWithRetry`, the `progress` state, and the now-unused imports (`getBookExportBooks`, `BookExportBooksResult`, `BOOKS_PER_REQUEST`, `chunkItems`, `createBookZipWriter`).
- Add `const zip = useBookZipDownload();` and `const progress = zip.progress;`.
- Replace `download` with:

```tsx
  const download = async () => {
    const targets = selectable.filter((order) => selected.has(order.orderNo)).map(toBookExportRequest);
    if (targets.length === 0) return;
    onBusyChange(true);
    setRejected([]);
    try {
      const run = await zip.download({ orders: targets, fileName: buildBookZipName(new Date()) });
      setRejected(run.rejected);
      if (run.bookCount === 0) {
        toast.warning('추출할 수 있는 주문이 없습니다.');
      } else {
        toast.success(
          run.rejected.length > 0
            ? `${run.bookCount}건을 zip으로 내려받았습니다. ${run.rejected.length}건은 제외되었습니다.`
            : `${run.bookCount}건을 zip으로 내려받았습니다.`,
        );
      }
    } catch (err) {
      toast.error(`다운로드를 중단했습니다. ${errorMessage(err)}`);
    }
    onBusyChange(false);
  };
```

- Keep `const isDownloading = progress !== null;`.
- Replace the `previewOrder` state with `const [previewRequest, setPreviewRequest] = useState<BookExportRequestOrder | null>(null);`.
- Pass `onPreview: (order) => setPreviewRequest(toBookExportRequest(order))` to the columns.
- Render `<BookExportPreviewDialog request={previewRequest} onClose={() => setPreviewRequest(null)} />`. The request is held in state, so its identity is stable and the preview effect runs once per open.

In `BookExportPreviewDialog.tsx`:
- Props become `{ request: BookExportRequestOrder | null; onClose: () => void }`.
- Open state is `request !== null`.
- Title is `request ? \`주문 미리보기 · ${request.orderNo}\` : '주문 미리보기'`.
- Body is `{request ? <BookExportPreviewBody key={request.orderNo} request={request} /> : null}`.
- `BookExportPreviewBody({ request }: { request: BookExportRequestOrder })`. In its effect:
  - Replace `.then(() => toBookExportRequest(order)).then((request) => getBookExportBooks([request]))` with `.then(() => getBookExportBooks([request]))`.
  - Replace the fallback `{ orderNo: order.orderNo, issues: [] }` with `{ orderNo: request.orderNo, issues: [] }`.
  - Change the deps to `[request, attempt]`.
  - Update the comment above the chain, since `toBookExportRequest` no longer runs here.
- Remove the unused imports (`BookOrderValidation`, `toBookExportRequest`). Import `BookExportRequestOrder`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected: tsc 0, lint 0 errors, all node tests PASS (4 new), build succeeds. The PDF export page still opens the same panel, and its behavior is unchanged.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/page/book-order src/components/page/pdf-export/PdfExportManager.tsx
git status --short   # the book-export paths must show as renames (R), nothing left unstaged under it
git commit -m "refactor(book-order): move the book export under book-order and share the zip download"
```

---

## Task 7: Batch types, client and helpers (frontend)

**Files:**
- Modify: `src/client/types.ts` (append after the book-export types)
- Create: `src/client/book-order.ts`
- Create: `src/components/page/book-order/services/book-order-batch.ts`, `src/components/page/book-order/services/book-order-batch.test.ts`

**Interfaces:**
- Consumes: the backend routes from Task 5.
- Produces:
  - Types: `BookBatchRequestOrder`, `BookOrderBatchConfirmBody`, `BookOrderBatchSummary`, `BookOrderBatchItem`, `BookOrderBatchDetail`, `BookOrderBatchConfirmResult`, `BookOrderBatchListResult`
  - Client: `confirmBookOrderBatch(body: BookOrderBatchConfirmBody): Promise<BookOrderBatchConfirmResult>`, `getBookOrderBatches(params: { page: number; q?: string }): Promise<BookOrderBatchListResult>`, `getBookOrderBatch(id: number): Promise<BookOrderBatchDetail>`
  - Helpers:
    - `MAX_MANAGER_NAME_LENGTH = 50`, `MAX_MEMO_LENGTH = 1000`
    - `toBatchRequestOrder(order: BookOrderValidation): BookBatchRequestOrder`
    - `batchItemToExportRequest(item: BookOrderBatchItem): BookExportRequestOrder`
    - `buildBatchZipName(batchId: number, now: Date): string` → `mindbridge-books-batch-<id>-YYYYMMDD-HHmm.zip` (no `#`: the bindery's tools may not accept it)
    - `canConfirmBatch(params: { managerName: string; selectedCount: number; isBusy: boolean }): boolean`

- [ ] **Step 1: Add the types and the client**

Append to `src/client/types.ts`:

```ts
export type BookBatchRequestOrder = {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  startOrder: number;
  endOrder: number;
  coverColor: string;
  paidInner: string;
  paidQuestionCount: number | null;
};

export type BookOrderBatchConfirmBody = {
  managerName: string;
  memo: string | null;
  sourceFileName: string;
  orders: BookBatchRequestOrder[];
};

export type BookOrderBatchSummary = {
  id: number;
  managerName: string;
  memo: string | null;
  sourceFileName: string;
  itemCount: number;
  createdAt: string;
};

export type BookOrderBatchItem = {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  spaceName: string;
  startOrder: number;
  endOrder: number;
  exportEnd: number;
  answeredCount: number;
  paidQuestionCount: number | null;
  coverColor: string;
  paidInner: string;
  level: 'ok' | 'warning';
  // Stored evidence: codes are plain strings so a later rename never breaks old 발주.
  issues: { code: string; message: string }[];
};

export type BookOrderBatchDetail = BookOrderBatchSummary & {
  items: BookOrderBatchItem[];
};

export type BookOrderBatchConfirmResult = {
  batch: BookOrderBatchDetail;
  rejected: BookExportRejectedOrder[];
};

export type BookOrderBatchListResult = QueryResultWithPagination<BookOrderBatchSummary> & {
  totalCount: number;
};
```

`src/client/book-order.ts`:

```ts
import client from './@base';
import {
  BookOrderBatchConfirmBody,
  BookOrderBatchConfirmResult,
  BookOrderBatchDetail,
  BookOrderBatchListResult,
} from './types';

export async function confirmBookOrderBatch(body: BookOrderBatchConfirmBody) {
  const res = await client.post<BookOrderBatchConfirmResult>('/book-export/batches', body);

  return res.data;
}

export async function getBookOrderBatches(params: { page: number; q?: string }) {
  const res = await client.get<BookOrderBatchListResult>('/book-export/batches', { params });

  return res.data;
}

export async function getBookOrderBatch(id: number) {
  const res = await client.get<BookOrderBatchDetail>(`/book-export/batches/${id}`);

  return res.data;
}
```

- [ ] **Step 2: Write the failing helper tests**

`src/components/page/book-order/services/book-order-batch.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BookOrderBatchItem, BookOrderValidation } from '../../../../client/types';
import {
  batchItemToExportRequest,
  buildBatchZipName,
  canConfirmBatch,
  toBatchRequestOrder,
} from './book-order-batch';

const VALIDATION: BookOrderValidation = {
  orderNo: 'A-1',
  orderedAt: '2026-09-30 14:36',
  spaceId: 'ABCD1234',
  rangeRaw: '1-30',
  startOrder: 1,
  endOrder: 30,
  exportEnd: 29,
  paidQuestionCount: 30,
  answeredCount: 29,
  coverColor: '브라운',
  paidInner: '선택 안함',
  spaceName: '우리',
  locale: 'ko',
  level: 'warning',
  issues: [],
};

test('maps a validated order to a confirm request with the requested range and confirm-time fields', () => {
  assert.deepEqual(toBatchRequestOrder(VALIDATION), {
    orderNo: 'A-1',
    orderedAt: '2026-09-30 14:36',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    paidQuestionCount: 30,
  });
});

test('refuses to map an order without a parsed range', () => {
  assert.throws(() => toBatchRequestOrder({ ...VALIDATION, startOrder: null }));
});

test('maps a stored batch item back to a books request using the requested range', () => {
  const item: BookOrderBatchItem = {
    orderNo: 'A-1',
    orderedAt: '2026-09-30 14:36',
    spaceId: 'ABCD1234',
    spaceName: '우리',
    startOrder: 1,
    endOrder: 30,
    exportEnd: 29,
    answeredCount: 29,
    paidQuestionCount: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    level: 'warning',
    issues: [],
  };
  assert.deepEqual(batchItemToExportRequest(item), {
    orderNo: 'A-1',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
  });
});

test('names the zip with the batch number and local time', () => {
  assert.equal(buildBatchZipName(12, new Date(2026, 9, 1, 9, 5)), 'mindbridge-books-batch-12-20261001-0905.zip');
});

test('allows confirming only with a 1-50 character manager name, a selection, and nothing running', () => {
  assert.equal(canConfirmBatch({ managerName: '김담당', selectedCount: 1, isBusy: false }), true);
  assert.equal(canConfirmBatch({ managerName: '   ', selectedCount: 1, isBusy: false }), false);
  assert.equal(canConfirmBatch({ managerName: 'x'.repeat(51), selectedCount: 1, isBusy: false }), false);
  assert.equal(canConfirmBatch({ managerName: '김담당', selectedCount: 0, isBusy: false }), false);
  assert.equal(canConfirmBatch({ managerName: '김담당', selectedCount: 1, isBusy: true }), false);
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, because `./book-order-batch` cannot be found.

- [ ] **Step 4: Implement**

`src/components/page/book-order/services/book-order-batch.ts`:

```ts
import dayjs from 'dayjs';

import type {
  BookBatchRequestOrder,
  BookExportRequestOrder,
  BookOrderBatchItem,
  BookOrderValidation,
} from '../../../../client/types';

// Mirrors the server's BOOK_EXPORT_LIMITS so the form can stop obviously invalid input early.
export const MAX_MANAGER_NAME_LENGTH = 50;
export const MAX_MEMO_LENGTH = 1000;

// Sends the requested range plus confirm-time fields; the server re-validates everything.
export function toBatchRequestOrder(order: BookOrderValidation): BookBatchRequestOrder {
  if (order.startOrder === null || order.endOrder === null) {
    throw new Error(`주문 ${order.orderNo}의 질문 범위가 없습니다.`);
  }
  return {
    orderNo: order.orderNo,
    orderedAt: order.orderedAt,
    spaceId: order.spaceId,
    startOrder: order.startOrder,
    endOrder: order.endOrder,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
    paidQuestionCount: order.paidQuestionCount,
  };
}

// Re-downloads regenerate from current data with the same request the 발주 was confirmed with.
export function batchItemToExportRequest(item: BookOrderBatchItem): BookExportRequestOrder {
  return {
    orderNo: item.orderNo,
    spaceId: item.spaceId,
    startOrder: item.startOrder,
    endOrder: item.endOrder,
    coverColor: item.coverColor,
    paidInner: item.paidInner,
  };
}

export function buildBatchZipName(batchId: number, now: Date): string {
  return `mindbridge-books-batch-${batchId}-${dayjs(now).format('YYYYMMDD-HHmm')}.zip`;
}

export function canConfirmBatch({
  managerName,
  selectedCount,
  isBusy,
}: {
  managerName: string;
  selectedCount: number;
  isBusy: boolean;
}): boolean {
  const name = managerName.trim();
  return !isBusy && selectedCount > 0 && name.length > 0 && name.length <= MAX_MANAGER_NAME_LENGTH;
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: tsc 0, lint 0 errors, all tests PASS (5 new).

- [ ] **Step 6: Commit**

```bash
git add src/client/types.ts src/client/book-order.ts src/components/page/book-order/services/book-order-batch.ts src/components/page/book-order/services/book-order-batch.test.ts
git commit -m "feat(book-order): batch client, types, and confirm/re-download helpers"
```

---

## Task 8: `책 제작 발주` menu, list page and detail sheet (frontend)

**Files:**
- Create: `src/pages/book-order/index.tsx`
- Create: `src/components/page/book-order/BookOrderList.tsx`
- Create: `src/components/page/book-order/BookOrderDetailPanel.tsx`
- Create: `src/components/page/book-order/BookOrderBatchItemColumns.tsx`
- Modify: `src/components/layout/main-menu.tsx` (add an item after the `product` group in `managementMenu`)
- Modify: `src/components/layout/route-labels.ts` (add `'book-order': '책 제작 발주'`)

**Interfaces:**
- Consumes:
  - `getBookOrderBatches` and `getBookOrderBatch` (Task 7)
  - `batchItemToExportRequest` and `buildBatchZipName` (Task 7)
  - `useBookZipDownload` (Task 6)
  - `BookExportPreviewDialog` with the `request` prop (Task 6)
  - `BookExportStatusBadge`
  - `DataTable`, `FilterBar` (`FILTER_CONTROL_CLASS`), `AdminSideSheetContent`, `Sheet`
- Produces:
  - `BookOrderDetailPanel` props: `{ batchId: number; confirmRejected?: BookExportRejectedOrder[]; downloadRejected?: BookExportRejectedOrder[]; onBusyChange: (isBusy: boolean) => void }`
  - `BookOrderList`: the sheet state type is `type SheetState = { mode: 'detail'; batchId: number; confirmRejected?: BookExportRejectedOrder[]; downloadRejected?: BookExportRejectedOrder[] } | null`. Task 9 adds `{ mode: 'new' }`.
  - Detail query key `['book-order-batch', id]` with `staleTime: Infinity` (a 발주 never changes). Task 9 seeds it with `setQueryData` right after confirm, so a replica lag cannot show a fresh 발주 as missing.

- [ ] **Step 1: Menu, route label and page**

`main-menu.tsx`: in `managementMenu`, insert after the `product` group's closing `},` (before the `game` group):

```tsx
  {
    id: 'book-order',
    name: '책 제작 발주',
    icon: <BookOpen className='w-4 h-4' />,
    link: { path: '/book-order' },
  },
```

`route-labels.ts`: add `'book-order': '책 제작 발주',` after `'pdf-export': 'PDF 내보내기 관리',`.

`src/pages/book-order/index.tsx`:

```tsx
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import BookOrderList from '@/components/page/book-order/BookOrderList';

function BookOrderPage() {
  return (
    <div>
      <BookOrderList />
    </div>
  );
}

BookOrderPage.getLayout = getDefaultLayout;
BookOrderPage.pageHeader = pageHeader;

export default BookOrderPage;
```

- [ ] **Step 2: Item columns**

`src/components/page/book-order/BookOrderBatchItemColumns.tsx`:

```tsx
import type { BookOrderBatchItem } from '@/client/types';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import BookExportStatusBadge from './BookExportStatusBadge';

export interface BookOrderBatchItemActions {
  onPreview: (item: BookOrderBatchItem) => void;
  isDownloading: boolean;
}

// Every value here is the confirm-time snapshot stored with the 발주.
export const createBookOrderBatchItemColumns = (actions: BookOrderBatchItemActions): ColumnDef<BookOrderBatchItem>[] => [
  {
    id: 'order',
    header: '주문',
    size: 170,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-mono text-sm text-foreground'>{row.original.orderNo}</div>
        <div className='truncate text-xs text-muted-foreground'>{row.original.orderedAt}</div>
      </div>
    ),
  },
  {
    id: 'space',
    header: '공간',
    size: 170,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-medium text-foreground'>{row.original.spaceName || '-'}</div>
        <div className='truncate font-mono text-xs text-muted-foreground'>{row.original.spaceId}</div>
      </div>
    ),
  },
  {
    id: 'range',
    header: '범위',
    size: 130,
    cell: ({ row }) => (
      <div className='tabular-nums'>
        <div className='text-foreground'>
          {row.original.startOrder}-{row.original.endOrder}
        </div>
        <div className='text-xs text-muted-foreground'>
          수록 {row.original.startOrder}~{row.original.exportEnd}
        </div>
      </div>
    ),
  },
  {
    id: 'count',
    header: '질문 수',
    size: 120,
    cell: ({ row }) => (
      <div className='text-sm tabular-nums'>
        <div className='text-foreground'>결제 {row.original.paidQuestionCount ?? '-'}</div>
        <div className='text-xs text-muted-foreground'>수록 {row.original.answeredCount}</div>
      </div>
    ),
  },
  {
    id: 'options',
    header: '표지 · 내지',
    size: 130,
    cell: ({ row }) => (
      <div className='min-w-0 text-sm'>
        <div className='truncate text-foreground'>{row.original.coverColor || '-'}</div>
        <div className='truncate text-xs text-muted-foreground'>{row.original.paidInner || '-'}</div>
      </div>
    ),
  },
  {
    id: 'status',
    header: '상태',
    size: 240,
    cell: ({ row }) => (
      <div className='space-y-1'>
        <BookExportStatusBadge level={row.original.level} />
        {row.original.issues.map((issue) => (
          <p key={issue.code} className='text-xs text-muted-foreground'>
            {issue.message}
          </p>
        ))}
      </div>
    ),
  },
  {
    id: 'preview',
    header: '미리보기',
    size: 96,
    cell: ({ row }) => (
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={actions.isDownloading}
        onClick={(event) => {
          event.stopPropagation();
          actions.onPreview(row.original);
        }}
      >
        <Eye className='h-3.5 w-3.5' />
        미리보기
      </Button>
    ),
  },
];
```

- [ ] **Step 3: Detail panel**

`src/components/page/book-order/BookOrderDetailPanel.tsx`:

```tsx
import { getBookOrderBatch } from '@/client/book-order';
import type { BookExportRejectedOrder, BookExportRequestOrder } from '@/client/types';
import { errorMessage } from '@/components/page/coupon/errorMessage';
import DataTable from '@/components/shared/ui/data-table';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import BookExportPreviewDialog from './BookExportPreviewDialog';
import { createBookOrderBatchItemColumns } from './BookOrderBatchItemColumns';
import { batchItemToExportRequest, buildBatchZipName } from './services/book-order-batch';
import { useBookZipDownload } from './useBookZipDownload';

type Props = {
  batchId: number;
  /** Orders the confirm refused: they are NOT part of this 발주. Shown once right after confirming. */
  confirmRejected?: BookExportRejectedOrder[];
  /** Orders stored in this 발주 but missing from the first zip. Shown once right after confirming. */
  downloadRejected?: BookExportRejectedOrder[];
  onBusyChange: (isBusy: boolean) => void;
};

function RejectedList({ title, items }: { title: string; items: BookExportRejectedOrder[] }) {
  return (
    <div className='rounded-md border border-border p-3'>
      <p className='text-sm font-medium text-foreground'>
        {title} {items.length}건
      </p>
      <ul className='mt-2 space-y-1'>
        {items.map((item) => (
          <li key={item.orderNo} className='text-xs text-muted-foreground'>
            <span className='font-mono'>{item.orderNo}</span> {item.issues.map((issue) => issue.message).join(' ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookOrderDetailPanel({ batchId, confirmRejected = [], downloadRejected = [], onBusyChange }: Props) {
  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['book-order-batch', batchId],
    queryFn: () => getBookOrderBatch(batchId),
    // A 발주 is evidence and never changes once stored.
    staleTime: Infinity,
  });
  const zip = useBookZipDownload();
  const [previewRequest, setPreviewRequest] = useState<BookExportRequestOrder | null>(null);
  const [redownloadRejected, setRedownloadRejected] = useState<BookExportRejectedOrder[]>([]);

  if (isLoading) {
    return (
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        불러오는 중입니다.
      </p>
    );
  }
  if (error || !batch) {
    const isMissing = isAxiosError(error) && error.response?.status === 404;
    return <p className='text-sm text-foreground'>{isMissing ? '발주를 찾을 수 없습니다.' : errorMessage(error)}</p>;
  }

  const redownload = async () => {
    onBusyChange(true);
    setRedownloadRejected([]);
    try {
      const run = await zip.download({
        orders: batch.items.map(batchItemToExportRequest),
        fileName: buildBatchZipName(batch.id, new Date()),
      });
      setRedownloadRejected(run.rejected);
      if (run.bookCount === 0) toast.warning('지금 추출할 수 있는 주문이 없습니다.');
      else
        toast.success(
          run.rejected.length > 0
            ? `${run.bookCount}건을 다시 내려받았습니다. ${run.rejected.length}건은 제외되었습니다.`
            : `${run.bookCount}건을 다시 내려받았습니다.`,
        );
    } catch (err) {
      toast.error(`다운로드를 중단했습니다. ${errorMessage(err)}`);
    }
    onBusyChange(false);
  };

  const columns = createBookOrderBatchItemColumns({
    onPreview: (item) => setPreviewRequest(batchItemToExportRequest(item)),
    isDownloading: zip.isDownloading,
  });

  return (
    <>
      <div className='space-y-4 pb-4'>
        <dl className='grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-3'>
          <div>
            <dt className='text-muted-foreground'>발주 번호</dt>
            <dd className='font-medium tabular-nums text-foreground'>#{batch.id}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>확정일시</dt>
            <dd className='tabular-nums text-foreground'>{dayjs(batch.createdAt).format('YY.MM.DD HH:mm')}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>담당자</dt>
            <dd className='text-foreground'>{batch.managerName}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>주문 수</dt>
            <dd className='tabular-nums text-foreground'>{batch.itemCount}건</dd>
          </div>
          <div className='col-span-2'>
            <dt className='text-muted-foreground'>원본 파일</dt>
            <dd className='truncate text-foreground'>{batch.sourceFileName}</dd>
          </div>
          <div className='col-span-full'>
            <dt className='text-muted-foreground'>메모</dt>
            <dd className='whitespace-pre-wrap text-foreground'>{batch.memo || '-'}</dd>
          </div>
        </dl>

        {confirmRejected.length > 0 ? (
          <RejectedList title='확정에서 제외되어 발주에 포함되지 않은 주문' items={confirmRejected} />
        ) : null}
        {downloadRejected.length > 0 ? (
          <RejectedList title='발주에는 포함됐지만 zip에서 빠진 주문' items={downloadRejected} />
        ) : null}
        {redownloadRejected.length > 0 ? (
          <RejectedList title='다시 받기에서 제외된 주문' items={redownloadRejected} />
        ) : null}

        <DataTable columns={columns} data={batch.items} rowKey='orderNo' />
      </div>

      <BookExportPreviewDialog request={previewRequest} onClose={() => setPreviewRequest(null)} />

      <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
        <div className='flex items-center justify-end gap-3'>
          <span className='mr-auto text-xs text-muted-foreground'>다시 받는 zip은 현재 데이터로 새로 만들어집니다.</span>
          {zip.progress ? (
            <span className='text-sm tabular-nums text-muted-foreground'>
              {zip.progress.done} / {zip.progress.total}건 처리 중
            </span>
          ) : null}
          <Button type='button' onClick={redownload} disabled={zip.isDownloading}>
            {zip.isDownloading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
            zip 다시 받기
          </Button>
        </div>
      </div>
    </>
  );
}

export default BookOrderDetailPanel;
```

- [ ] **Step 4: List page with the detail sheet**

`src/components/page/book-order/BookOrderList.tsx`:

```tsx
import { getBookOrderBatches } from '@/client/book-order';
import type { BookExportRejectedOrder, BookOrderBatchSummary } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar, type FilterChipItem } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import BookOrderDetailPanel from './BookOrderDetailPanel';

const PAGE_SIZE = 20;

type SheetState = {
  mode: 'detail';
  batchId: number;
  confirmRejected?: BookExportRejectedOrder[];
  downloadRejected?: BookExportRejectedOrder[];
} | null;

const columns: ColumnDef<BookOrderBatchSummary>[] = [
  {
    id: 'id',
    header: '발주 번호',
    size: 96,
    cell: ({ row }) => <span className='font-medium tabular-nums text-foreground'>#{row.original.id}</span>,
  },
  {
    id: 'createdAt',
    header: '확정일시',
    size: 140,
    cell: ({ row }) => (
      <span className='text-sm tabular-nums text-muted-foreground'>
        {dayjs(row.original.createdAt).format('YY.MM.DD HH:mm')}
      </span>
    ),
  },
  { id: 'managerName', header: '담당자', size: 120, cell: ({ row }) => row.original.managerName },
  {
    id: 'itemCount',
    header: '주문 수',
    size: 90,
    cell: ({ row }) => <span className='tabular-nums text-foreground'>{row.original.itemCount}건</span>,
  },
  {
    id: 'sourceFileName',
    header: '원본 파일',
    size: 220,
    cell: ({ row }) => <span className='block truncate'>{row.original.sourceFileName}</span>,
  },
  {
    id: 'memo',
    header: '메모',
    size: 240,
    cell: ({ row }) => <span className='block truncate text-muted-foreground'>{row.original.memo || '-'}</span>,
  },
];

function BookOrderList() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [isSheetBusy, setIsSheetBusy] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['book-order-batches', page, q],
    queryFn: () => getBookOrderBatches({ page, q: q || undefined }),
    placeholderData: keepPreviousData,
  });

  const applySearch = () => {
    setPage(1);
    setQ(search.trim());
  };

  const chips: FilterChipItem[] = q ? [{ key: 'q', label: `검색: ${q}` }] : [];

  return (
    <>
      <FilterBar
        chips={chips}
        onRemoveChip={() => {
          setSearch('');
          setQ('');
          setPage(1);
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder='주문번호 · 공간 ID · 담당자명'
          className={`w-64 ${FILTER_CONTROL_CLASS}`}
        />
        <Button onClick={applySearch} disabled={isFetching} className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}>
          <Search className='h-3.5 w-3.5' />
          검색
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        rowKey={(record) => String(record.id)}
        onRow={(record) => ({ onClick: () => setSheet({ mode: 'detail', batchId: record.id }) })}
        emptyState={<p className='text-sm text-muted-foreground'>{q ? '검색 결과가 없습니다.' : '아직 발주가 없습니다.'}</p>}
        pagination={{ total: data?.totalCount ?? 0, page, pageSize: PAGE_SIZE, onChange: setPage }}
      />

      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => {
          // Closing mid-download would unmount the panel and drop the zip being built.
          if (!open && isSheetBusy) {
            toast.info('작업이 끝나면 닫을 수 있습니다.');
            return;
          }
          if (!open) setSheet(null);
        }}
      >
        {sheet?.mode === 'detail' ? (
          <AdminSideSheetContent title={`발주 #${sheet.batchId}`} description='확정 시점에 저장된 주문 기록입니다.' size='xl'>
            <BookOrderDetailPanel
              batchId={sheet.batchId}
              confirmRejected={sheet.confirmRejected}
              downloadRejected={sheet.downloadRejected}
              onBusyChange={setIsSheetBusy}
            />
          </AdminSideSheetContent>
        ) : null}
      </Sheet>
    </>
  );
}

export default BookOrderList;
```

If `DataTable`'s `emptyState`, `onRow`, `rowKey` (function form) or `pagination` props differ from this usage, read `src/components/shared/ui/data-table.tsx` and adapt to its real props, and note the change in your report. As of this plan they exist as used here.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected: all green; the build lists the `/book-order` route.

- [ ] **Step 6: Commit**

```bash
git add src/pages/book-order src/components/page/book-order src/components/layout/main-menu.tsx src/components/layout/route-labels.ts
git commit -m "feat(book-order): 책 제작 발주 menu with the batch list and detail re-download"
```

---

## Task 9: New 발주 with confirm, and the PDF page cleanup (frontend)

**Files:**
- Move: `src/components/page/book-order/BookExportPanel.tsx` → `src/components/page/book-order/BookOrderNewPanel.tsx` (`git mv`, rename the component)
- Modify: `src/components/page/book-order/BookOrderList.tsx` (`새 발주` button + `new` sheet mode)
- Modify: `src/components/page/pdf-export/PdfExportManager.tsx` (remove the book export entry)

**Interfaces:**
- Consumes:
  - `confirmBookOrderBatch` (Task 7)
  - `toBatchRequestOrder`, `batchItemToExportRequest`, `buildBatchZipName`, `canConfirmBatch`, `MAX_MANAGER_NAME_LENGTH`, `MAX_MEMO_LENGTH` (Task 7)
  - `useBookZipDownload` (Task 6)
  - `SheetState` in `BookOrderList` (Task 8)
- Produces: `BookOrderNewPanel` props `{ onBusyChange: (isBusy: boolean) => void; onConfirmed: (params: { batch: BookOrderBatchDetail; confirmRejected: BookExportRejectedOrder[]; downloadRejected: BookExportRejectedOrder[] }) => void }`.

- [ ] **Step 1: Rename and turn the download into a confirm**

```bash
git mv src/components/page/book-order/BookExportPanel.tsx src/components/page/book-order/BookOrderNewPanel.tsx
```

In `BookOrderNewPanel.tsx`:
- Rename the component to `BookOrderNewPanel` (and its default export).
- Props become `{ onBusyChange; onConfirmed }` as above.
- Add these imports:
  - `confirmBookOrderBatch` from `@/client/book-order`
  - the `BookOrderBatchDetail` type
  - `Input` from `@/components/ui/input`
  - `Textarea` from `@/components/ui/textarea`
  - `Label` from `@/components/ui/label`
  - `CheckCircle2` from `lucide-react`
  - `toBatchRequestOrder`, `batchItemToExportRequest`, `buildBatchZipName`, `canConfirmBatch`, `MAX_MANAGER_NAME_LENGTH`, `MAX_MEMO_LENGTH` from `./services/book-order-batch`
- Remove the now-unused `buildBookZipName` import and the `Download` icon. Keep `toBookExportRequest`: `onPreview` still uses it.
- Add state:

```tsx
  const [sourceFileName, setSourceFileName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [memo, setMemo] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
```

- In `validate`, right after `if (!file) return;`, add `setSourceFileName(file.name);`.
- Replace `download` with:

```tsx
  const confirm = async () => {
    const targets = selectable.filter((order) => selected.has(order.orderNo)).map(toBatchRequestOrder);
    if (targets.length === 0) return;
    onBusyChange(true);
    setIsConfirming(true);
    let batch: BookOrderBatchDetail;
    let confirmRejected: BookExportRejectedOrder[];
    let downloadRejected: BookExportRejectedOrder[] = [];
    try {
      const result = await confirmBookOrderBatch({
        managerName: managerName.trim(),
        memo: memo.trim() || null,
        sourceFileName,
        orders: targets,
      });
      batch = result.batch;
      confirmRejected = result.rejected;
    } catch (err) {
      toast.error(errorMessage(err));
      setIsConfirming(false);
      onBusyChange(false);
      return;
    }
    setIsConfirming(false);
    try {
      const run = await zip.download({
        orders: batch.items.map(batchItemToExportRequest),
        fileName: buildBatchZipName(batch.id, new Date()),
      });
      downloadRejected = run.rejected;
      const excludedCount = confirmRejected.length + downloadRejected.length;
      if (run.bookCount === 0) {
        toast.warning(`발주 #${batch.id}을 저장했지만 지금 추출할 수 있는 주문이 없습니다.`);
      } else {
        toast.success(
          excludedCount > 0
            ? `발주 #${batch.id}을 확정하고 ${run.bookCount}건을 내려받았습니다. ${excludedCount}건은 제외되었습니다.`
            : `발주 #${batch.id}을 확정하고 ${run.bookCount}건을 내려받았습니다.`,
        );
      }
    } catch (err) {
      toast.error(
        `발주 #${batch.id}은 저장되었습니다. zip 다운로드가 실패했으니 발주 상세에서 다시 받아 주세요. ${errorMessage(err)}`,
      );
    }
    onBusyChange(false);
    onConfirmed({ batch, confirmRejected, downloadRejected });
  };
```

- Set `const isBusy = isValidating || isConfirming || isDownloading;` (where `isDownloading` = `zip.isDownloading`).
- Replace the sticky footer content with:

```tsx
        <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <div className='grid gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] sm:items-end'>
            <div className='space-y-1.5'>
              <Label htmlFor='book-order-manager'>담당자명</Label>
              <Input
                id='book-order-manager'
                value={managerName}
                maxLength={MAX_MANAGER_NAME_LENGTH}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder='필수'
                disabled={isBusy}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='book-order-memo'>메모</Label>
              <Textarea
                id='book-order-memo'
                value={memo}
                maxLength={MAX_MEMO_LENGTH}
                onChange={(e) => setMemo(e.target.value)}
                placeholder='선택'
                rows={1}
                disabled={isBusy}
              />
            </div>
            <div className='flex items-center justify-end gap-3'>
              {zip.progress ? (
                <span className='text-sm tabular-nums text-muted-foreground'>
                  {zip.progress.done} / {zip.progress.total}건 처리 중
                </span>
              ) : null}
              <Button
                type='button'
                onClick={confirm}
                disabled={!canConfirmBatch({ managerName, selectedCount: selected.size, isBusy })}
              >
                {isBusy && !isValidating ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle2 className='h-4 w-4' />}
                선택 {selected.size}건 발주 확정
              </Button>
            </div>
          </div>
        </div>
```

- Remove the `rejected` state and its rejected-orders box (and every `setRejected` call): after a confirm the sheet switches to the detail, which shows both rejected lists, so the box here would never show anything.
- Keep the preview (`previewRequest`), level tiles, table and uploader as they are.

If `@/components/ui/textarea` or `@/components/ui/label` exports differ, read them and adapt. Both exist in `src/components/ui/`.

- [ ] **Step 2: `새 발주` on the list**

In `BookOrderList.tsx`:
- Import `BookOrderNewPanel`, `useQueryClient`, and `Plus` from `lucide-react`.
- Change `SheetState` to `{ mode: 'new' } | { mode: 'detail'; batchId: number; confirmRejected?: BookExportRejectedOrder[]; downloadRejected?: BookExportRejectedOrder[] } | null`.
- Add `const queryClient = useQueryClient();`.
- After the 검색 button inside `FilterBar`, add:

```tsx
        <Button onClick={() => setSheet({ mode: 'new' })} className={`ml-auto ${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}>
          <Plus className='h-3.5 w-3.5' />
          새 발주
        </Button>
```

If `FilterBar` lays out its children so that `ml-auto` cannot push the button right, read `src/components/shared/ui/filter-bar.tsx` and use its trailing-actions slot or prop if one exists. Otherwise keep the button inline.

- Inside `<Sheet>`, before the detail branch, add:

```tsx
        {sheet?.mode === 'new' ? (
          <AdminSideSheetContent
            title='새 발주'
            description='카페24 발주서(csv, xlsx)를 올려 주문을 확인하고, 발주를 확정하면 제본소에 넘길 zip을 내려받습니다.'
            size='xl'
          >
            <BookOrderNewPanel
              onBusyChange={setIsSheetBusy}
              onConfirmed={({ batch, confirmRejected, downloadRejected }) => {
                // Seed the detail so a read-replica lag right after the write cannot show it as missing.
                queryClient.setQueryData(['book-order-batch', batch.id], batch);
                queryClient.invalidateQueries({ queryKey: ['book-order-batches'] });
                setSheet({ mode: 'detail', batchId: batch.id, confirmRejected, downloadRejected });
              }}
            />
          </AdminSideSheetContent>
        ) : null}
```

- [ ] **Step 3: Remove the entry from the PDF export page**

Replace `src/components/page/pdf-export/PdfExportManager.tsx` with the plain tabs version:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PdfExportHistoryTab from './PdfExportHistoryTab';
import PdfExportPolicyTab from './PdfExportPolicyTab';

function PdfExportManager() {
  return (
    <Tabs defaultValue='history' className='space-y-4'>
      <TabsList>
        <TabsTrigger value='history'>발급 이력</TabsTrigger>
        <TabsTrigger value='policy'>정책 설정</TabsTrigger>
      </TabsList>
      <TabsContent value='history'>
        <PdfExportHistoryTab />
      </TabsContent>
      <TabsContent value='policy'>
        <PdfExportPolicyTab />
      </TabsContent>
    </Tabs>
  );
}

export default PdfExportManager;
```

Then run `grep -rn "BookExportPanel" src`; it must return nothing.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected: all green.

- [ ] **Step 5: Manual QA (left for the user; list it in the report)**

Run this after the migration from Task 1 is applied to dev, with the backend running locally.

1. In the sidebar, open `관리` > `책 제작 발주`. An empty list shows `아직 발주가 없습니다.`.
2. Click `새 발주` and upload the sample CSV edited to a real dev space ID.
   - Type spaces only as the manager name: the confirm button stays disabled.
   - Type a name and a memo, then confirm: a zip `mindbridge-books-batch-N-...zip` downloads, and the sheet switches to `발주 #N`.
3. The detail shows the manager, the file name, the memo, and items with confirm-time values. `zip 다시 받기` downloads again, and `미리보기` opens the JSON.
4. Close the sheet: the list shows the new 발주. Search by order number, by the space ID in lowercase, and by part of the manager name; each one finds it.
5. The `PDF 내보내기 관리` page no longer shows `책 제작 데이터 추출`.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/page/book-order src/components/page/pdf-export/PdfExportManager.tsx
git commit -m "feat(book-order): confirm a 발주 before downloading, and move the entry off the PDF page"
```
