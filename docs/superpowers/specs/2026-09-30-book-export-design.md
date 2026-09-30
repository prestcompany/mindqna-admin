# Book Export (MindBridge 책 제작 데이터 추출) — Design

- **Date**: 2026-09-30
- **Status**: Approved (brainstorm)
- **Repos**: `mindqna-admin` (frontend), `mindqna-server` (backend)
- **Related**: `2026-07-19-admin-pdf-export-management-design.md` (the admin PDF export page this feature lives on); backend `card/export/` (the user-facing PDF export whose data this reuses)

## 1. Problem & Goal

MindBridge is launching a beta printed-book product: a space's questions and answers, printed and bound. Customers order through a Cafe24 shop; the shop's order export (CSV/XLSX) lists, per order, the space ID and the question range to print, plus product options (cover color, paid inner pages).

The bindery receives **only a zip we hand over** — one JSON file per order, holding the same data our in-app PDF export renders, plus the print options the bindery needs.

**Goal**: in the admin, upload the Cafe24 order export → see, per order, whether it can be extracted and why not → download one zip of JSON files for the selected orders.

### Decided
- Output: one zip, one `{orderNo}.json` per order. Zip built **in the browser** (`fflate`), not on the server.
- JSON content = PDF export data (cover meta + cards) + `orderNo` + `coverColor` + `paidInner`. **No copies/quantity, no shipping info, no 기록 패키지.**
- Card inclusion follows the PDF rule: cards with zero replies are dropped, trailing unanswered cards trim the range (confirmed with the bindery owner).
- Spaces scheduled for deletion (`Space.dueRemovedAt` set) are still extractable; the result only flags them (`SPACE_PENDING_DELETION` warning).
- Stateless: nothing is persisted. Re-uploading the same file reproduces the result.
- UI: a button on the existing `PDF 내보내기 관리` page opening a wide side sheet. No new menu or route.

### Out of scope (YAGNI)
- Storing orders / export history / re-download.
- Payment verification (done in Cafe24).
- Copies, shipping, 기록 패키지 handling.
- Non-UTF-8 CSV (CP949) decoding — rejected with a message to re-save as UTF-8 or upload the XLSX.
- Coin charges or `CardExportMeta` records (this is not the paid in-app export).

## 2. Input: Cafe24 order export

Observed sample (`prest201_20260930_8_27e1.csv`): UTF-8 without BOM, CRLF, 13 columns:

```
발주일,주문번호,품목별 주문번호,수량,주문서추가항목01_Mindbridge 공간 ID (공통입력사항),주문서추가항목02_인쇄 질문 범위 (공통입력사항),주문상품명,상품옵션,품목별 결제금액,총 상품구매금액,기본배송비,총 주문금액,총 결제금액
2026-09-30 14:36,20260930-0000024,20260930-0000024-01,1,dsdfsdf,1-100,[10월] Mindbridge 책 주문,표지 색상=브라운,...
2026-09-30 14:36,20260930-0000024,20260930-0000024-02,1,dsdfsdf,1-100,[10월] Mindbridge 책 주문,유료 내지=선택 안함,...
2026-09-30 14:36,20260930-0000024,20260930-0000024-03,1,dsdfsdf,1-100,[10월] Mindbridge 책 주문,질문 개수 (예시 : Q1~Q100 희망 시 100개 상품을 담아주세요)=질문 개수만큼 상품을 담아주세요.,...
2026-09-30 14:36,20260930-0000024,20260930-0000024-04,1,dsdfsdf,1-100,[10월] Mindbridge 책 주문,기록 패키지 책 구매자 25% 할인 (스티커 2종/메모지 1종)=선택 안함,...
```

- One order spans several rows (one per 품목별 주문번호); group by `주문번호`.
- `공간 ID` and `질문 범위` are order-level and repeat on every row.
- `상품옵션` is `key=value`; the key identifies the option.
- The space ID is `Space.id` (8 chars, `[0-9A-Z]`, generated in `space.service.ts`).

## 3. Backend (`mindqna-server`)

New module `src/admin/book-export/`, registered in `AdminModule.imports` like `PdfExportModule`. Controller `@Controller('admin/book-export')` + `@UseGuards(AdminGuard)`.

### 3.1 Parsing (`book-order-parser.ts`, pure)

- Input: the uploaded file (`File` from `@TypedFormData.Body()`, nestia 2.x — read via `arrayBuffer()`, as `card-template.service.ts` does).
- Format by extension: `.xlsx` → `workbook.xlsx.load`; any other extension → file error `UNSUPPORTED_FORMAT`; `.csv` → decode as UTF-8 (strip BOM), parse with a small in-module RFC 4180 parser (`parse-csv-text.ts`; no value coercion, so IDs keep leading zeros). If the decoded text contains U+FFFD → file error `ENCODING` ("UTF-8 CSV 또는 XLSX로 올려주세요").
- Header lookup by **substring** so suffixes like `(공통입력사항)` may change: required `주문번호` (exact, not `품목별 주문번호`), `수량` (exact), `공간 ID`, `질문 범위`, `상품옵션` (exact); optional `발주일`. Missing required header → file error `MISSING_HEADER` naming it.
- Group rows by `주문번호`, preserving first-seen order. Per order:
  - `spaceIds` / `ranges`: the distinct trimmed values across rows (for the inconsistency check). The space ID is also uppercased (`Space.id` alphabet is `[0-9A-Z]`).
  - Options: split `상품옵션` at the first `=`; match key by prefix:
    - `표지 색상` → `coverColor` (value)
    - `유료 내지` → `paidInner` (value, raw)
    - `질문 개수` → `paidQuestionCount` = that row's `수량` (integer)
    - anything else ignored.
- Range parsing (`parseRange`): strip spaces and a leading `Q`/`q` on each side; separators `-`, `~`, `–`; both sides positive integers → `{ startOrder, endOrder }`, else `null`.
- A `.csv` that is not valid UTF-8, or an `.xlsx` exceljs cannot load, is a 400 with a message to upload the original Cafe24 file unchanged (re-saving in Excel changes the encoding and can turn ranges like `1-30` into dates).
- Limits: file size ≤ 5 MB (`FILE_TOO_LARGE`; checked after multer has buffered the upload, acceptable on an `AdminGuard` route), 1–500 orders (`NO_ORDERS` / `TOO_MANY_ORDERS`). File errors → `BadRequestException` with a Korean message (the codes above name the cases; the response carries only the message).

### 3.2 Validation (`book-order-validator.ts`)

Batched — no per-order card fetch, no reply content:
1. `space.findMany({ where: { id: { in: spaceIds } }, select: { id, cardOrder, dueRemovedAt, spaceInfo: { name, locale } } })`.
2. Answered-card counts per (space, range): for each order that passed the checks above, `card.findMany({ where: { spaceId, order: { gte, lte }, replies: { some: {} } }, select: { order: true } })` (answered cards only, as `CardExportService.getMeta` does — no `_count`, which the team avoids for performance) batched in a single `$transaction([...])` of up to 500 light queries. From it compute `answeredCount` and `exportEnd` (last answered order) with the **same rule as the PDF** (§3.3).

Per-order result:

```ts
type BookOrderIssueCode =
  | 'SPACE_ID_MISSING' | 'SPACE_NOT_FOUND' | 'RANGE_INVALID' | 'RANGE_SIZE' | 'COVER_COLOR_MISSING'
  | 'INCONSISTENT_ROWS' | 'NO_ANSWERED_CARDS'                                   // errors
  | 'PAID_COUNT_MISMATCH' | 'UNANSWERED_DROPPED' | 'RANGE_CLAMPED' | 'DUPLICATE_SPACE'
  | 'SPACE_PENDING_DELETION';                                                  // warnings

type BookOrderValidation = {
  orderNo: string;
  orderedAt: string;            // 발주일 raw
  spaceId: string;
  rangeRaw: string;
  startOrder: number | null;
  endOrder: number | null;      // requested
  exportEnd: number | null;     // after clamp + trailing-unanswered trim
  paidQuestionCount: number | null;
  answeredCount: number;        // cards that will be in the book
  coverColor: string;
  paidInner: string;
  spaceName: string;
  locale: string;
  level: 'ok' | 'warning' | 'error';
  issues: { code: BookOrderIssueCode; message: string }[];
};
```

| Code | Level | Condition |
|---|---|---|
| `SPACE_ID_MISSING` | error | empty space ID |
| `SPACE_NOT_FOUND` | error | no `Space` with that id |
| `RANGE_INVALID` | error | `parseRange` → null, or `startOrder < 1`, or `endOrder < startOrder` |
| `RANGE_SIZE` | error | `endOrder - startOrder + 1` outside 30–200 |
| `COVER_COLOR_MISSING` | error | no `표지 색상` option |
| `INCONSISTENT_ROWS` | error | rows of one order disagree on space ID or range |
| `NO_ANSWERED_CARDS` | error | `answeredCount === 0` |
| `PAID_COUNT_MISMATCH` | warning | `paidQuestionCount` present and ≠ requested range size |
| `UNANSWERED_DROPPED` | warning | `answeredCount` < clamped range size (`min(endOrder, cardOrder) - startOrder + 1`), so a clamp alone does not also raise this |
| `RANGE_CLAMPED` | warning | `endOrder > space.cardOrder` |
| `DUPLICATE_SPACE` | warning | same space ID in another order of the file |
| `SPACE_PENDING_DELETION` | warning | `space.dueRemovedAt` is set (scheduled for deletion) |

`level` = worst issue. Checks that need the space/range are skipped once an earlier error makes them meaningless (e.g. no `NO_ANSWERED_CARDS` when `SPACE_NOT_FOUND`).

### 3.3 Shared card building (targeted refactor of `card/export/`)

The PDF export's "which cards, which end" rule and its `Card → ExportCard` mapping move into shared, exported helpers so the PDF and the book never diverge:

- `card/export/card-export.answered.ts`: `selectAnsweredCards({ cards, clampedEnd, countReplies })` → `{ answered, exportEnd, totalInRange }` — the filter + trailing trim now inside `countAnswered`.
- `card/export/card-export.cards.ts`: `toExportCards(cards)` → `ExportCard[]` — the `order/question/date/answers` mapping now inline in `runExport`.
- `card/export/card-export.cover.ts`: `resolveCoverIdentity(spaceInfo)` → `{ spaceName, locale }`; raw name, or the localized `pdf_cover_default_space_name` when blank (logic now inline in `runExport`).

`CardExportService` imports them; its behavior and tests are unchanged. This mirrors the earlier `computeStatus` extraction.

### 3.4 Endpoints

| Route | Body | Response |
|---|---|---|
| `POST /admin/book-export/validate` | multipart `{ file }` | `{ orders: BookOrderValidation[] }` |
| `POST /admin/book-export/books` | `{ orders: { orderNo, spaceId, startOrder, endOrder, coverColor, paidInner }[] }`, 1–20 items | `{ books: BookExportBook[]; rejected: { orderNo; issues }[] }` |

`books` re-validates each order server-side (space exists, range valid/size, answered > 0 — client values are not trusted), then per accepted order, sequentially: the PDF card query (`template.name`, `replies.profile`) for `[startOrder, min(endOrder, cardOrder)]` → `selectAnsweredCards` → `toExportCards`.

```ts
type BookExportBook = {
  orderNo: string;
  coverColor: string;
  paidInner: string;
  cover: { spaceName: string; startOrder: number; endOrder: number; count: number; generatedAt: string; locale: string };
  cards: { order: number; question: string; date: string; answers: { nickname: string; content: string }[] }[];
};
```

`cover` matches `PdfCoverMeta` exactly (`endOrder` = trimmed end, `count` = answered cards, `generatedAt` = `YYYY-MM-DD`). More than 20 orders → `BadRequestException`.

### 3.5 Load bounds

- Validation never reads reply content; cost is ~2 queries + ≤500 light count queries.
- `books` holds at most 20 books in memory per request; the browser chunks the selection, so request time stays short regardless of total size.

## 4. Frontend (`mindqna-admin`)

```
src/client/book-export.ts                        # validateBookOrders(file), getBookExportBooks(orders)
src/client/types.ts                              # BookOrderValidation, BookExportBook, ... (mirror §3)
src/components/page/pdf-export/PdfExportManager.tsx   # + '책 제작 데이터 추출' button + Sheet
src/components/page/book-export/
  BookExportPanel.tsx          # upload → results → download (sheet body)
  BookExportResultColumns.tsx  # column defs
  BookExportStatusBadge.tsx    # ok / warning / error badge
  services/book-export-download.ts  # chunking, request mapping, level counts, zip name
  services/book-zip-writer.ts       # streaming fflate zip (dynamic import)
```

- **Entry**: `PdfExportManager` tab row gets a right-aligned `책 제작 데이터 추출` button → `Sheet` + `AdminSideSheetContent size='xl'`.
- **Upload**: `CardUploader` (`accept='.csv,.xlsx'`). On file select → `validateBookOrders` (multipart `FormData`, like `card/bulk`). File errors → `toast.error(message)`.
- **Results**:
  - Summary chips `전체 · 정상 · 확인 필요 · 추출 불가` act as a level filter.
  - `DataTable` columns: select · 주문번호 (+발주일) · 공간 (이름 / ID) · 범위 (`rangeRaw` → `start~exportEnd`) · 질문 수 (결제 `paidQuestionCount` / 수록 `answeredCount`) · 표지·내지 · 상태 (badge + issue messages).
  - Selection follows `CardList`'s `select` column pattern; `ok` + `warning` preselected; `error` rows disabled.
- **Download** (sticky footer): `선택 N건 zip 다운로드`. Chunk selection by 20 → `getBookExportBooks` sequentially → each chunk streamed into an fflate `Zip` (`{orderNo}.json`, pretty-printed UTF-8, path characters in `orderNo` replaced by `_`) → progress `x / N` → save as `mindbridge-books-YYYYMMDD-HHmm.zip`.
  - Each chunk is retried once; a second failure aborts the whole download (no partial zip) with `toast.error`.
  - The upload area is inert while validating or downloading; a stale validation response is ignored.
  - `rejected` from the server is listed after completion; accepted books are still zipped.
  - While downloading, the sheet cannot be closed (`onOpenChange` ignored, with a toast explaining why) and the button is disabled.
- **Dependency**: add `fflate` to the admin; import it dynamically inside `book-zip-writer.ts` so it only loads on download.

## 5. Error Handling

- File-level (400): `FILE_TOO_LARGE`, `ENCODING`, `UNSUPPORTED_FORMAT`, `MISSING_HEADER`, `NO_ORDERS`, `TOO_MANY_ORDERS` — shown as a toast; results area stays empty.
- Order-level: never fails the request; carried in `issues`.
- Download-time drift (space deleted after upload, etc.) → `rejected`.
- Axios interceptor (401 → sign-out) and `toast.error` pattern as in `@base.ts`.

## 6. Testing

- **Backend (Jest, TDD)**:
  - `book-order-parser`: the sample CSV (fixture), an XLSX built with `exceljs` in-test, range variants (`1-100`, `1~100`, `Q1-Q100`, `1 - 100`, garbage), missing header, BOM, U+FFFD, >500 orders, per-order inconsistency.
  - `book-order-validator`: each issue code and the `level` rollup, with a mocked `PrismaService`.
  - `books`: re-validation rejects, >20 → 400; the card query uses the same `where`/`include`/`orderBy` as `CardExportService.countAnswered`, and cards go through the shared `selectAnsweredCards` + `toExportCards`, so the output equals the PDF's cards.
  - `card-export.cards` / `card-export.cover`: unit tests; existing `card-export.service.spec.ts` stays green.
- **Frontend**: `npx tsc --noEmit` + `pnpm lint` + `pnpm build`; manual QA with the sample CSV (expect `SPACE_NOT_FOUND` for `dsdfsdf`) and with a CSV edited to a real space ID; unzip and inspect a JSON.

## 7. Implementation Order

1. Backend: extract shared card helpers (§3.3) with tests, existing tests green.
2. Backend: parser → validator → `books` builder → controller + module.
3. Frontend: types + client → `fflate` + zip helper → panel (upload → results → download) → button on `PdfExportManager`.
