# Book JSON v2 + new Cafe24 export format — Design

- **Date**: 2026-10-01
- **Status**: Approved (brainstorm)
- **Repos**: `mindqna-server` (backend), `mindqna-admin` (frontend)
- **Builds on**: `2026-09-30-book-export-design.md`, `2026-10-01-book-order-batch-design.md` (branch `feature/book-order-batch`, not yet merged)

## 1. Problem & Goal

Two things changed outside the code:

1. **The Cafe24 export changed.**
   - Each order is now one row.
   - The `상품옵션` cell holds every option, written as `키=값, 키=값, …` (for example `"표지 색상=브라운, 질문 개수=30, 유료 패키지 추가=A세트, 유료 내지 추가=친구"`).
   - The question count is now the option value (`질문 개수=30`). It used to be the 수량 of a separate row.
   - The inner-page option is now `유료 내지 추가`, and the record package option is now `유료 패키지 추가`.

   The current parser reads this cell as one option. As a result it puts the whole string into `coverColor` and loses `paidInner` and the question count. The sample file `prest201_20261001_14_8155.csv` reproduces this.
2. **The bindery wants a new JSON shape.** The option values move under `options`, the record package and the purchased question count are added, and the cover gains its first and last question dates and the member names.

**Goal**:
- Read both the old and the new export.
- Emit the new JSON from `/books`, which serves both the first download and re-downloads.
- Keep the change additive. Only the fields below change, and `cards` stays exactly as it is.

### Decided
- **JSON replaces the old top-level fields.** `coverColor` and `paidInner` move into `options` and no longer appear at the top level (answer A).
- **`cover.members`** lists the space's *current active members*: the app's canonical active-member rule, `getActiveMemberWhere(spaceId)` in `src/space/member-count.util.ts` (`disabled = false`, `removed = false`). They are ordered by `createdAt` ascending, with each nickname trimmed. The list is looked up whenever a book is built, so a re-download reflects current members (answer B).
- **`cover.firstQuestionDate` / `cover.lastQuestionDate`** are the `date` of the first and the last card in `cards`, using the same `YYYY-MM-DD` value the cards carry.
- **`options.purchaseQuestionCount`** is the purchased question count (the existing internal `paidQuestionCount`). It is `null` when the export does not carry it. The existing `PAID_COUNT_MISMATCH` warning keeps comparing it with the requested range size.
- **`options.recordPackage`** is a new parsed option. It is stored on `BookOrderBatchItem.recordPackage` so a re-download carries it. The user has already applied the column to dev and prod with:

  ```sql
  ALTER TABLE `BookOrderBatchItem` ADD COLUMN `recordPackage` VARCHAR(100) NOT NULL DEFAULT '' AFTER `paidInner`;
  ```

  Batches stored before this change read back `''`.
- Both export formats are read by the same code. No format flag or detection is needed.

### Out of scope
- Storing members or dates on the batch. Both are regenerated from current data.
- Other new export columns (판매가, 옵션추가 가격, 상품구매금액 and so on).
- Changing how 수량 is interpreted beyond the question-count fallback below.

## 2. Parsing (backend `book-order-parser.ts`)

- A `상품옵션` cell is split at every comma that is followed by a `key=` segment: `text.split(/,\s*(?=[^,=]+=)/)`. Each part is then split at its first `=` into a key and a value, both trimmed. An old-format cell yields a single part.
- Each order's options are collected across all of its rows (`flatMap`). Every option also carries its row's `수량`.
- Key mapping is by prefix, and the first match wins:

| Prefix | Field | Value |
|---|---|---|
| `표지 색상` | `coverColor` | option value |
| `질문 개수` | `paidQuestionCount` | the option value if it is all digits (new format); otherwise that row's `수량` if it is all digits (old format); otherwise `null` |
| `유료 내지` | `paidInner` | option value. This prefix covers both `유료 내지 추가` and `유료 내지`. |
| `유료 패키지`, else `기록 패키지` | `recordPackage` (new) | option value |

- Headers, grouping, limits and errors stay unchanged. The new export has every required header.

## 3. Data flow (backend)

The new field threads through every shape. Unchanged fields are not listed.

| Shape | Change |
|---|---|
| `ParsedBookOrder` | + `recordPackage: string` |
| `BookOrderValidation` | + `recordPackage: string` (passed through by `evaluateBookOrder`) |
| `BookExportRequestOrder` (`/books` body) | + `paidQuestionCount?: number \| null`, + `recordPackage?: string` (optional for older clients; default `null` / `''`; bounds checked) |
| `BookBatchRequestOrder` (confirm body) | + `recordPackage?: string` (optional; default `''`) |
| `BookOrderBatchItemDto` / stored item | + `recordPackage: string` |
| `BOOK_EXPORT_LIMITS` | + `maxRecordPackageLength: 100` (the confirm checks it with the other column limits) |

- `/books` keeps re-validating. Its request-to-parsed mapping now carries `paidQuestionCount` and `recordPackage` instead of `null` and nothing.

- Deploy order: the backend first, then the frontend. The request fields are optional so the deployed admin keeps working in between.

## 4. Book JSON v2 (backend `book-export-books.service.ts`)

```ts
interface BookExportBook {
  orderNo: string;
  options: {
    coverColor: string;
    purchaseQuestionCount: number | null;
    recordPackage: string;
    paidInner: string;
  };
  cover: {
    spaceName: string;
    startOrder: number;
    endOrder: number;
    count: number;
    generatedAt: string;
    locale: string;
    firstQuestionDate: string; // cards[0].date
    lastQuestionDate: string; // cards[cards.length - 1].date
    members: string[]; // current active members, join order
  };
  cards: { order: number; question: string; date: string; answers: { nickname: string; content: string }[] }[]; // unchanged
}
```

- Members come from one `profile.findMany` per book: `where: getActiveMemberWhere(spaceId)`, `select: { nickname: true }`, `orderBy: { createdAt: 'asc' }`.
- A book with no answered cards is still rejected (existing behavior), so `cards` is never empty and both dates always exist.

## 5. Frontend (`mindqna-admin`)

- **Types:**
  - `BookOrderValidation` and `BookOrderBatchItem` gain `recordPackage`.
  - `BookExportRequestOrder` gains `paidQuestionCount` and `recordPackage`.
  - `BookBatchRequestOrder` gains `recordPackage`.
  - `BookExportBook` becomes the v2 shape.
- **Mappers:** `toBookExportRequest`, `batchItemToExportRequest` and `toBatchRequestOrder` carry the new fields.
- **Tables:** the result table and the batch item table add a third line, 패키지 `recordPackage || '-'`, to the `표지 · 내지` column. The header becomes `표지 · 내지 · 패키지`.
- **Preview summary:** reads `book.options.*`, and adds 패키지 and 결제 질문 수 (`purchaseQuestionCount ?? '-'`).
- The zip and the preview keep using `toBookJson`, so both show the v2 shape.

## 6. Testing

- **Backend (Jest, TDD):**
  - Parser:
    - The new-format fixture (a copy of `prest201_20261001_14_8155.csv`) parses to `coverColor` 브라운, `paidQuestionCount` 30, `recordPackage` A세트 and `paidInner` 친구.
    - The old-format fixture still parses as before, with the new `recordPackage` read from `기록 패키지` (`선택 안함`).
    - A value containing a comma that is not followed by `key=` stays whole.
  - Evaluator and batch: `recordPackage` passes through, is stored, and reads back. A `recordPackage` longer than 100 is a 400.
  - Books: the v2 shape. Cover dates come from the first and the last card. The members query and its order are as specified. `purchaseQuestionCount` comes from the request.
- **Frontend:** existing tests are updated to the new shapes, plus `tsc`, `lint`, `test` and `build`. Manual QA: upload both CSVs, then preview and download, then confirm and re-download.

## 7. Implementation order

1. Backend:
   1. Schema column and migration file (no database command).
   2. Thread `recordPackage` and the request `paidQuestionCount`.
   3. Parser for the new format.
   4. Book JSON v2.
2. Frontend: types, mappers, tables, preview and tests.
