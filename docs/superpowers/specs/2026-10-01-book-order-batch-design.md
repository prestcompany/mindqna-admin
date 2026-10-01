# Book Order Batch (책 제작 발주) — Design

- **Date**: 2026-10-01
- **Status**: Approved (brainstorm)
- **Repos**: `mindqna-admin` (frontend), `mindqna-server` (backend)
- **Builds on**: `2026-09-30-book-export-design.md` (upload → validate → books → browser zip, shipped)

## 1. Problem & Goal

The book export runs today as a side sheet on the `PDF 내보내기 관리` page, and it keeps nothing. The operations owner wants two things:

1. Its own menu.
2. A permanent record of each hand-off to the bindery: what was sent, when, and by whom. The owner calls this a "발주 단위 증적".

**Goal**: add a `책 제작 발주` menu. An operator uploads the Cafe24 export, validates it, selects orders, and **confirms a 발주** with a manager name and memo. The server stores the 발주 and the confirm-time state of each order, then the browser downloads the zip. Past 발주 are listed and searchable, and each one can be opened and re-downloaded.

### Decided
- **Evidence level A**: metadata only. Each 발주 stores who (typed manager name), when, the source file name, and per-order snapshots taken at confirm time:
  - space name
  - requested range and actual export end
  - answered count
  - cover and inner options
  - paid question count
  - warnings
- The zip file itself is **not** stored. A re-download regenerates JSON from current data with the same order parameters, so its content may differ if answers changed since.
- **A 발주 is created by an explicit `발주 확정`**, not by every download. The zip downloads right after a successful confirm. Download failure does not undo the 발주; the operator re-downloads from its detail.
- **Approach 1**: the server re-validates and stores on confirm; zips keep using the existing `/books` + browser `fflate` path, for both the first download and any re-download.
- No per-order 발주 status. The same Cafe24 order can appear in two 발주s; it is only *findable* (search by order number / space ID), not blocked.
- 발주 records are not editable or deletable through the API. They are evidence.
- The admin login is one shared account (`AdminGuard` payload `userId: 'admin'`), so "who" is a required, typed `managerName`.

### Out of scope (YAGNI)
- Storing zip/JSON snapshots, upload batches that were never confirmed, per-order 발주 status or duplicate blocking, edit/delete of 발주, memo editing, per-admin accounts.

## 2. Data model (backend, manual SQL)

```prisma
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

- `spaceId` has no FK to `Space`. A later space deletion must not erase the evidence.
- `level` is `'ok' | 'warning'`; error-level orders are never stored.
- `issues` holds the confirm-time `BookOrderIssue[]` as a JSON string. The API parses it back to an array.
- SQL is handed over as `prisma/migrations/20261001000000_add_book_order_batch/migration.sql` and applied manually to dev and prod. Never run `prisma migrate`. The `schema.prisma` models are added in the same change so the client is generated.

## 3. Backend API (`admin/book-export`, `AdminGuard`)

The existing `POST /validate` and `POST /books` stay unchanged. New routes:

| Route | Body / query | Response |
|---|---|---|
| `POST /batches` | `{ managerName, memo?, sourceFileName, orders: BookBatchRequestOrder[] }` | `{ batch: BookOrderBatchDetail, rejected: BookExportRejectedOrder[] }` |
| `GET /batches` | `?page=1&q=` | `{ items: BookOrderBatchSummary[], totalCount, pageInfo: { totalPage } }` |
| `GET /batches/:id` | — | `BookOrderBatchDetail` |

```ts
interface BookBatchRequestOrder {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  startOrder: number;
  endOrder: number;
  coverColor: string;
  paidInner: string;
  paidQuestionCount: number | null;
}
interface BookOrderBatchSummary {
  id: number;
  managerName: string;
  memo: string | null;
  sourceFileName: string;
  itemCount: number;
  createdAt: string;
}
interface BookOrderBatchItemDto {
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
  issues: { code: string; message: string }[]; // plain-string codes so a later rename never breaks old evidence
}
interface BookOrderBatchDetail extends BookOrderBatchSummary {
  items: BookOrderBatchItemDto[];
}
```

### 3.1 Confirm (`POST /batches`)
1. Input checks (400 with a Korean message):
   - `managerName` trimmed, 1–50 chars
   - `memo` trimmed, ≤ 1000 chars (empty becomes null)
   - `sourceFileName` 1–255 chars
   - `orders` 1–500 items (`BOOK_EXPORT_LIMITS.maxOrders`)
   - no duplicate `orderNo` in the request
2. Re-validate with `BookOrderValidationService.validateOrders`. Map each request order to `ParsedBookOrder`:
   - `spaceId` trimmed and uppercased
   - `rangeRaw` = `${startOrder}-${endOrder}`
   - `isConsistent` = true
   - `orderedAt` and `paidQuestionCount` carried through, so `PAID_COUNT_MISMATCH` and `DUPLICATE_SPACE` are recomputed
3. Error-level results go to `rejected`. If nothing is left, return 400 `발주할 수 있는 주문이 없습니다.` and store nothing.
4. In one `$transaction`, create the batch (`itemCount` = accepted count) and `createMany` its items from the validation results:
   - `spaceName`, `exportEnd`, `answeredCount`, `level`, and `issues` (JSON) come from the validation results.
   - `startOrder`/`endOrder` are the requested range.
5. Respond with the stored detail, items in request order, plus `rejected`.

### 3.2 List (`GET /batches`)
- 20 per page, `createdAt desc`. `page` defaults to 1.
- `q` (trimmed, optional) matches when any of the following holds:
  - an item `orderNo` equals `q`
  - an item `spaceId` equals `q.toUpperCase()`
  - `managerName` contains `q`
- Response shape matches the admin's `QueryResultWithPagination` + `totalCount`.

### 3.3 Detail (`GET /batches/:id`)
- Unknown id → `NotFoundException`.
- Items are ordered by `id asc`, which is insertion order.

### 3.4 Module layout
- New, under `src/admin/book-export/`:
  - `book-order-batch.service.ts`: `confirmBatch`, `listBatches`, `getBatch`
  - pure input/mapping helpers in their own files, following the existing one-export-per-file rule
- Routes are added to the existing `BookExportController`.
- Types go in `book-export.interface.ts`.

## 4. Frontend (`mindqna-admin`)

### 4.1 Navigation and moves
- `main-menu.tsx`: add `{ id: 'book-order', name: '책 제작 발주', icon: <BookOpen />, link: { path: '/book-order' } }` to `managementMenu`, right after the `product` group. Also add `'book-order': '책 제작 발주'` to `route-labels.ts`.
- Remove the `책 제작 데이터 추출` button and sheet from `PdfExportManager.tsx`, restoring its plain tabs.
- Move `src/components/page/book-export/` to `src/components/page/book-order/`, keeping `services/*`, `BookExportPreviewDialog`, `BookExportLevelFilter`, `BookExportResultColumns`, and `BookExportStatusBadge`. Renaming the component files is optional; moving them is required.

### 4.2 Shared download hook
- `useBookZipDownload()` returns `{ progress, isDownloading, download(orders: BookExportRequestOrder[], fileName: string) }`. It runs the existing loop:
  - chunk by 20 → `getBookExportBooks` with one retry per chunk → streaming zip writer → save
  - on a second failure, abort with no partial zip
- It returns the collected `rejected`. Both the new-발주 sheet and the detail sheet use it.

### 4.3 `/book-order` list page
- `src/pages/book-order/index.tsx` uses `getDefaultLayout` + `pageHeader` and renders `BookOrderList`.
- Toolbar (`FilterBar`): one search input (`주문번호 · 공간 ID · 담당자명`) plus a `새 발주` primary button.
- `DataTable`, 20 per page. Columns:
  - 발주 번호 (`#id`)
  - 확정일시 (`YY.MM.DD HH:mm`)
  - 담당자
  - 주문 수
  - 원본 파일명
  - 메모 (truncated)
- A row click opens the detail sheet. Empty state: `아직 발주가 없습니다.` / `검색 결과가 없습니다.`
- Data comes from TanStack Query `['book-order-batches', page, q]`.

### 4.4 New 발주 sheet (`xl`)
- Same flow as today's panel: upload → validate → level tiles → table with preview and selection.
- The sticky footer replaces the download button with three controls:
  - `담당자명` input (required, max 50)
  - `메모` input (optional, max 1000)
  - `선택 N건 발주 확정` button. It is disabled while busy, with nothing selected, or with an empty name.
- On confirm:
  1. `POST /batches`, with every selected order mapped to `BookBatchRequestOrder` and `sourceFileName` set to the uploaded file's name.
  2. On success, `useBookZipDownload` runs over `batch.items` and saves `mindbridge-books-batch-<id>-YYYYMMDD-HHmm.zip` (no `#`, which the bindery's tools may reject).
  3. The detail lists, separately, orders the confirm refused (not part of the 발주) and orders stored in the 발주 but missing from the zip. The detail query is seeded from the confirm response so a read-replica lag cannot show the new 발주 as missing.
  4. The list query is invalidated, and the sheet switches to that 발주's detail.
  5. If the zip fails after the 발주 was stored, a toast says the 발주 was saved and can be re-downloaded from its detail.
- The sheet cannot close while confirming or downloading (existing toast).

### 4.5 Detail sheet (`xl`)
- Header block: 발주 번호, 확정일시, 담당자, 원본 파일명, 메모 (full), 주문 수.
- Table (all confirm-time values):
  - 주문번호 (+발주일)
  - 공간 (이름 / ID)
  - 범위 (`startOrder-endOrder` → `startOrder~exportEnd`)
  - 질문 수 (결제 / 수록)
  - 표지·내지
  - 상태 badge + issue messages
- A per-row `미리보기` reuses `BookExportPreviewDialog`. It regenerates from current data.
- The footer has a `zip 다시 받기` button with a note: `다시 받는 zip은 현재 데이터로 새로 만들어집니다.` It runs `useBookZipDownload` over the items and uses the same file name pattern.

## 5. Error handling
- Confirm validation errors (400) → `toast.error(errorMessage(err))`. Nothing is stored and nothing is downloaded.
- Confirm OK + download failure → the 발주 stays and the toast points to its detail.
- Detail 404 → the sheet shows `발주를 찾을 수 없습니다.`
- The existing axios 401 handling is reused.

## 6. Testing
- **Backend (Jest, TDD, mocked Prisma)**:
  - confirm: input limits, duplicate orderNo, re-validation mapping (uppercase spaceId, rangeRaw, carried paidQuestionCount/orderedAt), error-level → rejected, nothing accepted → 400 and no write, a single `$transaction` creating batch + items with confirm-time snapshot values and `issues` JSON
  - list: `q` where-clause shape, pagination, ordering
  - detail: 404, `issues` parsed back to an array
- **Frontend**:
  - node:test for pure helpers: validation → `BookBatchRequestOrder` mapping, batch item → `BookExportRequestOrder` mapping, zip file name with the batch id
  - `npx tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`
  - manual QA of list, new 발주, detail, and re-download

## 7. Implementation order
1. Backend: schema models + migration SQL → confirm service (TDD) → list/detail (TDD) → controller routes.
2. Frontend: types + client → move `book-export` → `book-order` + extract `useBookZipDownload` → remove the PDF page entry → list page + menu → new-발주 sheet with confirm → detail sheet with re-download.
