# Book Export (책 제작 데이터 추출) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload a Cafe24 order export in the admin, see per order whether its book can be extracted, and download one zip with a `{orderNo}.json` per order holding the same data the in-app PDF export renders.

**Architecture:** Backend (`mindqna-server`) gets a stateless `admin/book-export` module: a pure parser (file → rows → orders), a pure rule evaluator, a validation service with batched Prisma lookups, and a books service that re-validates and builds book JSON through helpers extracted from `card/export/` so the PDF and the book never diverge. Frontend (`mindqna-admin`) adds a button + wide side sheet on the PDF export page that uploads, shows results, fetches books 20 at a time, and zips them in the browser with `fflate`.

**Tech Stack:** Backend — NestJS 10, `@nestia/core` 2.x (`TypedRoute`/`TypedBody`/`TypedFormData`), Prisma, `exceljs` 4.4 (already a dependency), Jest via `yarn jest`. Frontend — Next.js 13 pages router, TanStack Query not needed (imperative calls), shadcn/ui, `sonner`, `fflate` (new), `node:test` via `pnpm test`.

**Spec:** `docs/superpowers/specs/2026-09-30-book-export-design.md`

## Global Constraints

- **Two repos.** Backend root `/Users/gargoyle92/Documents/backend/mindqna-server` (Tasks 1–8, paths relative to it). Frontend root `/Users/gargoyle92/Documents/frontend/mindqna-admin` (Tasks 9–10). Before Task 1, create branch `feature/book-export` from `main` in each repo; never commit to `main`.
- **Stateless.** No Prisma schema change, no new table, no migration.
- **No coin charge, no `CardExportMeta` write.** This is not the paid in-app export.
- **JSON per order:** `{ orderNo, coverColor, paidInner, cover: { spaceName, startOrder, endOrder, count, generatedAt, locale }, cards: [{ order, question, date, answers: [{ nickname, content }] }] }`. No copies, shipping, or 기록 패키지.
- **Card inclusion = PDF rule (confirmed):** only cards with at least one reply; range end moves back to the last answered card. Unanswered cards are excluded from the book.
- **Spaces pending deletion** (`Space.dueRemovedAt` set) are still extractable; they only get the `SPACE_PENDING_DELETION` warning.
- **Validation must not count replies with `_count`** (the team moved off `_count` for performance, see `src/admin/space/space.service.ts:487`): count answered cards with `replies: { some: {} }`, the way `CardExportService.getMeta` does.
- **Limits:** file ≤ 5 MB; 1–500 orders per upload; range size 30–200; 1–20 orders per `books` request.
- **Space ID:** `Space.id`, 8 chars `[0-9A-Z]`; the parser trims and uppercases it.
- **Backend conventions (`.cursor/rules/mindbridge-sever-rule.mdc`):** English code/comments; declare all types, no `any` outside tests; one runtime export per NEW file (type-only `*.interface.ts` files may export many types); kebab-case filenames; functions start with a verb; RO-RO for multi-param functions; no blank lines inside function bodies; JSDoc on exported functions/classes.
- **Backend errors:** use `BadRequestException(message)` from `src/common/exception/error` (status 400, body `{ code: 16, statusCode, message }`). User-facing messages are Korean.
- **Frontend API base:** axios `baseURL` already includes `/admin`, so client paths are `/book-export/...`.
- **Frontend errors:** show `errorMessage(err)` from `src/components/page/coupon/errorMessage.ts` (reads `response.data.message`).
- **Frontend verification (AGENTS.md):** `npx tsc --noEmit` + `pnpm lint` + `pnpm build`; pure helpers get `node:test` tests (`pnpm test`).
- **Design:** follow `DESIGN.md` tokens; badges use existing `dotSuccess` / `dotWarning` / `dotDanger` variants.
- **No emoji** in code, UI copy, or commit messages.

## Review Focus

1. A customer types the space ID in lowercase or with spaces (`" abcd1234"`) — it must still match the space (trim + uppercase). Test in Task 4.
2. Cafe24 option text contains commas, quotes, or several `=` inside a quoted CSV field — the CSV parser must keep it in one cell and the option split must use the first `=` only. Tests in Tasks 2 and 4.
3. Operator opens the CSV in Excel and re-saves it (CP949) — the upload must fail with a clear Korean "save as UTF-8 or upload xlsx" message instead of every order showing `SPACE_NOT_FOUND` with garbled headers. Test in Task 3.
4. Excel adds trailing blank rows or a totals row with no 주문번호 — those rows must be ignored, not become an order. Test in Task 4.
5. Selecting 21+ orders — requests must be chunked at 20 and every selected order must land in the zip exactly once. Test in Task 9.

---

## Task 1: Extract shared card helpers from the PDF export (backend)

**Files:**
- Create: `src/card/export/card-export.answered.ts`, `src/card/export/card-export.answered.spec.ts`
- Create: `src/card/export/card-export.cards.ts`, `src/card/export/card-export.cards.spec.ts`
- Create: `src/card/export/card-export.cover.ts`, `src/card/export/card-export.cover.spec.ts`
- Modify: `src/card/export/card-export.service.ts` (imports at lines ~19–20; `runExport` lines ~162–174; `countAnswered` tail lines ~263–272)

**Interfaces:**
- Produces:
  - `selectAnsweredCards<T extends { order: number }>(params: { cards: T[]; clampedEnd: number; countReplies: (card: T) => number }): { answered: T[]; exportEnd: number; totalInRange: number }` — `cards` must be sorted by `order` ascending.
  - `toExportCards(cards: { order: number; createdAt: Date; template: { name: string }; replies: { content: string; profile: { nickname: string } }[] }[]): ExportCard[]`
  - `resolveCoverIdentity(spaceInfo: { name: string; locale: string } | null): { spaceName: string; locale: string }`

- [ ] **Step 1: Write the failing tests**

`src/card/export/card-export.answered.spec.ts`:

```ts
import { selectAnsweredCards } from './card-export.answered';

type TestCard = { order: number; replies: number };
const countReplies = (card: TestCard): number => card.replies;

describe('selectAnsweredCards', () => {
  it('keeps answered cards and moves the end back to the last answered card', () => {
    const cards: TestCard[] = [
      { order: 1, replies: 2 },
      { order: 2, replies: 0 },
      { order: 3, replies: 1 },
      { order: 4, replies: 0 },
    ];
    const actual = selectAnsweredCards({ cards, clampedEnd: 4, countReplies });
    expect(actual.answered.map((card) => card.order)).toEqual([1, 3]);
    expect(actual.exportEnd).toBe(3);
    expect(actual.totalInRange).toBe(3);
  });

  it('keeps the clamped end when nothing is answered', () => {
    const cards: TestCard[] = [{ order: 5, replies: 0 }];
    const actual = selectAnsweredCards({ cards, clampedEnd: 5, countReplies });
    expect(actual.answered).toEqual([]);
    expect(actual.exportEnd).toBe(5);
    expect(actual.totalInRange).toBe(1);
  });
});
```

`src/card/export/card-export.cards.spec.ts`:

```ts
import { toExportCards } from './card-export.cards';

describe('toExportCards', () => {
  it('maps question text, UTC date, and every reply with its nickname', () => {
    const actual = toExportCards([
      {
        order: 7,
        createdAt: new Date('2026-09-01T23:30:00Z'),
        template: { name: '가장 행복했던 순간은?' },
        replies: [
          { content: '여행', profile: { nickname: '엄마' } },
          { content: '생일', profile: { nickname: '아빠' } },
        ],
      },
    ]);
    expect(actual).toEqual([
      {
        order: 7,
        question: '가장 행복했던 순간은?',
        date: '2026-09-01',
        answers: [
          { nickname: '엄마', content: '여행' },
          { nickname: '아빠', content: '생일' },
        ],
      },
    ]);
  });
});
```

`src/card/export/card-export.cover.spec.ts`:

```ts
import { resolveCoverIdentity } from './card-export.cover';

describe('resolveCoverIdentity', () => {
  it('keeps a non-blank name as-is (no trimming) with its locale', () => {
    const actual = resolveCoverIdentity({ name: ' 우리 가족 ', locale: 'ko' });
    expect(actual).toEqual({ spaceName: ' 우리 가족 ', locale: 'ko' });
  });

  it('falls back to the localized default name when the name is blank', () => {
    const actual = resolveCoverIdentity({ name: '   ', locale: 'en' });
    expect(actual).toEqual({ spaceName: 'My Space', locale: 'en' });
  });

  it('defaults to ko when the space has no spaceInfo', () => {
    const actual = resolveCoverIdentity(null);
    expect(actual.locale).toBe('ko');
    expect(actual.spaceName.trim()).not.toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn jest src/card/export/card-export.answered.spec.ts src/card/export/card-export.cards.spec.ts src/card/export/card-export.cover.spec.ts`
Expected: FAIL — "Cannot find module './card-export.answered'" (and the other two).

- [ ] **Step 3: Implement the helpers**

`src/card/export/card-export.answered.ts`:

```ts
/**
 * The PDF export's inclusion rule, shared with the admin book export: keep cards with at least one
 * reply and move the range end back to the last answered card, so the cover and filename never
 * point past the content. `cards` must be sorted by `order` ascending.
 */
export function selectAnsweredCards<T extends { order: number }>(params: {
  cards: T[];
  clampedEnd: number;
  countReplies: (card: T) => number;
}): { answered: T[]; exportEnd: number; totalInRange: number } {
  const answered = params.cards.filter((card) => params.countReplies(card) > 0);
  const exportEnd = answered.length > 0 ? answered[answered.length - 1].order : params.clampedEnd;
  const totalInRange = params.cards.filter((card) => card.order <= exportEnd).length;
  return { answered, exportEnd, totalInRange };
}
```

`src/card/export/card-export.cards.ts`:

```ts
import type { ExportCard } from './card-pdf-renderer';

type ExportSourceCard = {
  order: number;
  createdAt: Date;
  template: { name: string };
  replies: { content: string; profile: { nickname: string } }[];
};

/**
 * Maps queried cards (question text on `template.name`, every reply with its author) to the
 * renderer's card shape. Shared by the PDF export and the admin book export.
 */
export function toExportCards(cards: ExportSourceCard[]): ExportCard[] {
  return cards.map((card) => ({
    order: card.order,
    question: card.template.name,
    date: card.createdAt.toISOString().slice(0, 10),
    answers: card.replies.map((reply) => ({ nickname: reply.profile.nickname, content: reply.content })),
  }));
}
```

`src/card/export/card-export.cover.ts`:

```ts
import t, { Locale as I18nLocale } from '../../i18n';

/**
 * Resolves the cover's space name and locale. A blank name falls back to the localized default so
 * neither the cover nor the filename ever renders empty; a non-blank name is kept raw.
 */
export function resolveCoverIdentity(spaceInfo: { name: string; locale: string } | null): {
  spaceName: string;
  locale: string;
} {
  const locale = spaceInfo?.locale ?? 'ko';
  const rawName = spaceInfo?.name ?? '';
  const spaceName = rawName.trim() ? rawName : t(locale as I18nLocale, 'pdf_cover_default_space_name', {});
  return { spaceName, locale };
}
```

`import type` in `card-export.cards.ts` keeps `card-pdf-renderer` (pdfkit, SVG file reads) out of callers' runtime imports.

- [ ] **Step 4: Run the new tests**

Run: `yarn jest src/card/export/card-export.answered.spec.ts src/card/export/card-export.cards.spec.ts src/card/export/card-export.cover.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Use the helpers in `CardExportService`**

In `src/card/export/card-export.service.ts`:

Replace the import `import t, { Locale as I18nLocale } from '../../i18n';` with:

```ts
import { selectAnsweredCards } from './card-export.answered';
import { toExportCards } from './card-export.cards';
import { resolveCoverIdentity } from './card-export.cover';
```

(Keep `import { renderCardsPdf, ExportCard } from './card-pdf-renderer';`.) Confirm `t(` has no other use in the file: `grep -nE "(^|[^A-Za-z0-9_.])t\(" src/card/export/card-export.service.ts` should show only the line being replaced below.

In `runExport`, replace this block:

```ts
    // `locale` is the Prisma `Locale` enum (maps to a string). es/id fall through to Pretendard in FontResolver.
    const locale = space.spaceInfo?.locale ?? 'ko';
    // Fall back to a localized default when the space has no (or a blank) name, so neither the PDF
    // cover nor the filename ever renders empty (QA: "공간이름이 안보인다"). Keep the raw name otherwise.
    const rawName = space.spaceInfo?.name ?? '';
    const spaceName = rawName.trim() ? rawName : t(locale as I18nLocale, 'pdf_cover_default_space_name', {});
    const exportCards: ExportCard[] = cards.map((c) => ({
      order: c.order,
      question: c.template.name,
      date: c.createdAt.toISOString().slice(0, 10),
      answers: c.replies.map((r) => ({ nickname: r.profile.nickname, content: r.content })),
    }));
```

with:

```ts
    // `locale` is the Prisma `Locale` enum (maps to a string). es/id fall through to Pretendard in FontResolver.
    // A blank name falls back to a localized default (QA: "공간이름이 안보인다").
    const { spaceName, locale } = resolveCoverIdentity(space.spaceInfo);
    const exportCards: ExportCard[] = toExportCards(cards);
```

In `countAnswered`, replace:

```ts
    const answered = cards.filter((c) => c.replies.length > 0);
```

through

```ts
    return { space, count: answered.length, totalInRange, clampedEnd: effectiveEnd, cards: answered };
```

with (keep the Korean comment block that sits between them, above the call):

```ts
    const { answered, exportEnd, totalInRange } = selectAnsweredCards({
      cards,
      clampedEnd,
      countReplies: (card) => card.replies.length,
    });
    return { space, count: answered.length, totalInRange, clampedEnd: exportEnd, cards: answered };
```

- [ ] **Step 6: Run the whole export suite and typecheck**

Run: `yarn jest src/card/export && npx tsc --noEmit -p tsconfig.json`
Expected: all `card/export` specs PASS (existing `card-export.service.spec.ts` unchanged and green); tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/card/export/card-export.answered.ts src/card/export/card-export.answered.spec.ts src/card/export/card-export.cards.ts src/card/export/card-export.cards.spec.ts src/card/export/card-export.cover.ts src/card/export/card-export.cover.spec.ts src/card/export/card-export.service.ts
git commit -m "refactor(card-export): extract answered-card, card mapping, and cover helpers"
```

---

## Task 2: Book export types, limits, CSV and range parsing (backend)

**Files:**
- Create: `src/admin/book-export/book-export.interface.ts`
- Create: `src/admin/book-export/book-export.limits.ts`
- Create: `src/admin/book-export/parse-csv-text.ts`, `src/admin/book-export/parse-csv-text.spec.ts`
- Create: `src/admin/book-export/parse-order-range.ts`, `src/admin/book-export/parse-order-range.spec.ts`

**Interfaces:**
- Produces (types in `book-export.interface.ts`, used by every later backend task):

```ts
export type BookOrderIssueCode =
  | 'SPACE_ID_MISSING'
  | 'SPACE_NOT_FOUND'
  | 'RANGE_INVALID'
  | 'RANGE_SIZE'
  | 'COVER_COLOR_MISSING'
  | 'INCONSISTENT_ROWS'
  | 'NO_ANSWERED_CARDS'
  | 'PAID_COUNT_MISMATCH'
  | 'UNANSWERED_DROPPED'
  | 'RANGE_CLAMPED'
  | 'DUPLICATE_SPACE'
  | 'SPACE_PENDING_DELETION';
export type BookOrderLevel = 'ok' | 'warning' | 'error';
export interface BookOrderIssue { code: BookOrderIssueCode; message: string }
export interface ParsedBookOrder {
  orderNo: string;
  orderedAt: string;
  spaceId: string;          // trimmed + uppercased; '' when blank
  rangeRaw: string;
  isConsistent: boolean;    // every row of the order agrees on space ID and range
  coverColor: string;       // '' when the option is absent
  paidInner: string;        // '' when the option is absent
  paidQuestionCount: number | null;
}
export interface BookOrderSpace { id: string; cardOrder: number; dueRemovedAt: Date | null; spaceInfo: { name: string; locale: string } | null }
export interface BookOrderCardStats { answeredCount: number; exportEnd: number | null }
export interface BookOrderValidation { /* spec §3.2 */ }
export interface BookOrderValidationResult { orders: BookOrderValidation[] }
export interface ValidateBookOrdersBody { file: File }
export interface BookExportRequestOrder { orderNo: string; spaceId: string; startOrder: number; endOrder: number; coverColor: string; paidInner: string }
export interface BookExportBooksBody { orders: BookExportRequestOrder[] }
export interface BookExportBook { /* spec §3.4 */ }
export interface BookExportRejectedOrder { orderNo: string; issues: BookOrderIssue[] }
export interface BookExportBooksResult { books: BookExportBook[]; rejected: BookExportRejectedOrder[] }
```

  - `BOOK_EXPORT_LIMITS: { maxFileBytes: 5242880; maxOrders: 500; maxBooksPerRequest: 20; minRangeSize: 30; maxRangeSize: 200 }`
  - `parseCsvText(text: string): string[][]` — RFC 4180; drops rows whose cells are all blank.
  - `parseOrderRange(raw: string): { startOrder: number; endOrder: number } | null`

- [ ] **Step 1: Write the type and limits files** (no behavior, no test)

`src/admin/book-export/book-export.interface.ts`:

```ts
export type BookOrderIssueCode =
  | 'SPACE_ID_MISSING'
  | 'SPACE_NOT_FOUND'
  | 'RANGE_INVALID'
  | 'RANGE_SIZE'
  | 'COVER_COLOR_MISSING'
  | 'INCONSISTENT_ROWS'
  | 'NO_ANSWERED_CARDS'
  | 'PAID_COUNT_MISMATCH'
  | 'UNANSWERED_DROPPED'
  | 'RANGE_CLAMPED'
  | 'DUPLICATE_SPACE'
  | 'SPACE_PENDING_DELETION';

export type BookOrderLevel = 'ok' | 'warning' | 'error';

export interface BookOrderIssue {
  code: BookOrderIssueCode;
  message: string;
}

/** One Cafe24 order after grouping its item rows. */
export interface ParsedBookOrder {
  orderNo: string;
  orderedAt: string;
  /** Trimmed and uppercased; '' when blank. */
  spaceId: string;
  rangeRaw: string;
  /** False when rows of the same order disagree on space ID or range. */
  isConsistent: boolean;
  coverColor: string;
  paidInner: string;
  paidQuestionCount: number | null;
}

export interface BookOrderSpace {
  id: string;
  cardOrder: number;
  /** Set when the space is scheduled for deletion. */
  dueRemovedAt: Date | null;
  spaceInfo: { name: string; locale: string } | null;
}

export interface BookOrderCardStats {
  answeredCount: number;
  /** Last answered card order within the clamped range; null when nothing is answered. */
  exportEnd: number | null;
}

export interface BookOrderValidation {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  rangeRaw: string;
  startOrder: number | null;
  endOrder: number | null;
  exportEnd: number | null;
  paidQuestionCount: number | null;
  answeredCount: number;
  coverColor: string;
  paidInner: string;
  spaceName: string;
  locale: string;
  level: BookOrderLevel;
  issues: BookOrderIssue[];
}

export interface BookOrderValidationResult {
  orders: BookOrderValidation[];
}

export interface ValidateBookOrdersBody {
  file: File;
}

export interface BookExportRequestOrder {
  orderNo: string;
  spaceId: string;
  startOrder: number;
  endOrder: number;
  coverColor: string;
  paidInner: string;
}

export interface BookExportBooksBody {
  orders: BookExportRequestOrder[];
}

export interface BookExportBook {
  orderNo: string;
  coverColor: string;
  paidInner: string;
  cover: {
    spaceName: string;
    startOrder: number;
    endOrder: number;
    count: number;
    generatedAt: string;
    locale: string;
  };
  cards: { order: number; question: string; date: string; answers: { nickname: string; content: string }[] }[];
}

export interface BookExportRejectedOrder {
  orderNo: string;
  issues: BookOrderIssue[];
}

export interface BookExportBooksResult {
  books: BookExportBook[];
  rejected: BookExportRejectedOrder[];
}
```

`src/admin/book-export/book-export.limits.ts`:

```ts
/** Upload and request bounds for the admin book export (spec §3.1, §3.4). */
export const BOOK_EXPORT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxOrders: 500,
  maxBooksPerRequest: 20,
  minRangeSize: 30,
  maxRangeSize: 200,
} as const;
```

- [ ] **Step 2: Write the failing parser tests**

`src/admin/book-export/parse-csv-text.spec.ts`:

```ts
import { parseCsvText } from './parse-csv-text';

describe('parseCsvText', () => {
  it('splits CRLF rows and plain fields', () => {
    expect(parseCsvText('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps commas, escaped quotes, "=" and newlines inside a quoted field', () => {
    const text = 'id,option\n1,"질문 개수 (예시 : Q1~Q100, 100개)=담아주세요 ""꼭""\n줄바꿈"\n';
    expect(parseCsvText(text)).toEqual([
      ['id', 'option'],
      ['1', '질문 개수 (예시 : Q1~Q100, 100개)=담아주세요 "꼭"\n줄바꿈'],
    ]);
  });

  it('drops blank rows, including trailing ones and comma-only rows', () => {
    expect(parseCsvText('a,b\n\n,\nc,d\n\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('parses a last row without a trailing newline', () => {
    expect(parseCsvText('a\nb')).toEqual([['a'], ['b']]);
  });
});
```

`src/admin/book-export/parse-order-range.spec.ts`:

```ts
import { parseOrderRange } from './parse-order-range';

describe('parseOrderRange', () => {
  it.each([
    ['1-100', 1, 100],
    ['1~100', 1, 100],
    ['Q1-Q100', 1, 100],
    ['q31~q60', 31, 60],
    [' 1 - 100 ', 1, 100],
    ['1–100', 1, 100],
    ['1～100', 1, 100],
  ])('parses %p', (raw, startOrder, endOrder) => {
    expect(parseOrderRange(raw)).toEqual({ startOrder, endOrder });
  });

  it.each(['', '100', '1-', 'abc', '0-50', '100-1', '1-100-200', '1.5-10'])('rejects %p', (raw) => {
    expect(parseOrderRange(raw)).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `yarn jest src/admin/book-export`
Expected: FAIL — "Cannot find module './parse-csv-text'" / "'./parse-order-range'".

- [ ] **Step 4: Implement**

`src/admin/book-export/parse-csv-text.ts`:

```ts
const QUOTE = '"';

/**
 * Parses RFC 4180 CSV text (quoted fields, "" escapes, CRLF or LF, newlines inside quotes) into
 * rows of raw cell strings. Rows whose cells are all blank are dropped. Cells are not coerced, so
 * IDs like "01234567" keep their leading zeros.
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let isQuoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isQuoted && char === QUOTE && text[i + 1] === QUOTE) {
      field += QUOTE;
      i++;
    } else if (char === QUOTE) {
      isQuoted = !isQuoted;
    } else if (isQuoted || (char !== ',' && char !== '\n' && char !== '\r')) {
      field += char;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}
```

`src/admin/book-export/parse-order-range.ts`:

```ts
const RANGE_PATTERN = /^q?(\d+)[-~–～]q?(\d+)$/i;

/**
 * Parses a customer-typed question range ("1-100", "1~100", "Q1-Q100", "1 - 100") into card
 * orders. Returns null when malformed, when the start is below 1, or when the end is before the start.
 */
export function parseOrderRange(raw: string): { startOrder: number; endOrder: number } | null {
  const match = RANGE_PATTERN.exec(raw.replace(/\s+/g, ''));
  if (!match) return null;
  const startOrder = Number(match[1]);
  const endOrder = Number(match[2]);
  if (startOrder < 1 || endOrder < startOrder) return null;
  return { startOrder, endOrder };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn jest src/admin/book-export`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/book-export
git commit -m "feat(book-export): add types, limits, CSV and range parsing"
```

---

## Task 3: Read an uploaded sheet into rows (backend)

**Files:**
- Create: `src/admin/book-export/to-cell-text.ts`
- Create: `src/admin/book-export/read-order-sheet.ts`, `src/admin/book-export/read-order-sheet.spec.ts`
- Create: `src/admin/book-export/__fixtures__/cafe24-orders.csv` (copy of `/Users/gargoyle92/Downloads/prest201_20260930_8_27e1.csv`)

**Interfaces:**
- Consumes: `parseCsvText` (Task 2).
- Produces: `readOrderSheet(params: { fileName: string; bytes: Buffer }): Promise<string[][]>` — throws `BadRequestException` for unsupported extension or non-UTF-8 CSV. `toCellText(value: ExcelJS.CellValue): string`.

- [ ] **Step 1: Add the fixture**

```bash
mkdir -p src/admin/book-export/__fixtures__
cp /Users/gargoyle92/Downloads/prest201_20260930_8_27e1.csv src/admin/book-export/__fixtures__/cafe24-orders.csv
```

(It contains only test values — `dsdfsdf`, no personal data.)

- [ ] **Step 2: Write the failing test**

`src/admin/book-export/read-order-sheet.spec.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import * as ExcelJS from 'exceljs';
import { readOrderSheet } from './read-order-sheet';

const FIXTURE = readFileSync(join(__dirname, '__fixtures__', 'cafe24-orders.csv'));

async function buildXlsx(rows: ExcelJS.CellValue[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('orders');
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('readOrderSheet', () => {
  it('reads the Cafe24 CSV export (UTF-8, CRLF) into 1 header + 4 item rows', async () => {
    const rows = await readOrderSheet({ fileName: 'prest201.csv', bytes: FIXTURE });
    expect(rows).toHaveLength(5);
    expect(rows[0][0]).toBe('발주일');
    expect(rows[0]).toHaveLength(13);
    expect(rows[1][1]).toBe('20260930-0000024');
    expect(rows[1][4]).toBe('dsdfsdf');
    expect(rows[1][7]).toBe('표지 색상=브라운');
  });

  it('strips a UTF-8 BOM so the first header still matches', async () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), FIXTURE]);
    const rows = await readOrderSheet({ fileName: 'orders.CSV', bytes });
    expect(rows[0][0]).toBe('발주일');
  });

  it('rejects a CSV that is not UTF-8 (Excel re-save as CP949)', async () => {
    const cp949 = Buffer.from([0xb9, 0xdf, 0xc1, 0xd6, 0xc0, 0xcf, 0x0d, 0x0a]);
    await expect(readOrderSheet({ fileName: 'orders.csv', bytes: cp949 })).rejects.toThrow('원본 파일');
  });

  it('rejects an unreadable xlsx with a 400 message instead of a 500', async () => {
    await expect(readOrderSheet({ fileName: 'orders.xlsx', bytes: FIXTURE })).rejects.toThrow('xlsx 파일을 읽을 수 없습니다');
  });

  it('reads the first sheet of an xlsx, turning numbers and dates into text', async () => {
    const bytes = await buildXlsx([
      ['발주일', '주문번호', '수량'],
      [new Date('2026-09-30T14:36:00Z'), '20260930-0000024', 100],
    ]);
    const rows = await readOrderSheet({ fileName: 'orders.xlsx', bytes });
    expect(rows).toEqual([
      ['발주일', '주문번호', '수량'],
      ['2026-09-30 14:36', '20260930-0000024', '100'],
    ]);
  });

  it('rejects other extensions', async () => {
    await expect(readOrderSheet({ fileName: 'orders.xls', bytes: FIXTURE })).rejects.toThrow('csv 또는 xlsx');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn jest src/admin/book-export/read-order-sheet.spec.ts`
Expected: FAIL — "Cannot find module './read-order-sheet'".

- [ ] **Step 4: Implement**

`src/admin/book-export/to-cell-text.ts`:

```ts
import * as ExcelJS from 'exceljs';

/** Flattens an exceljs cell value (rich text, formula result, hyperlink, date) to plain text. */
export function toCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 16).replace('T', ' ');
  if (typeof value !== 'object') return String(value);
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('result' in value) return toCellText(value.result as ExcelJS.CellValue);
  if ('text' in value) return String(value.text);
  return '';
}
```

`src/admin/book-export/read-order-sheet.ts`:

```ts
import * as ExcelJS from 'exceljs';
import { BadRequestException } from 'src/common/exception/error';
import { parseCsvText } from './parse-csv-text';
import { toCellText } from './to-cell-text';

const RESAVE_HINT = '카페24에서 받은 원본 파일을 그대로 올려주세요. 엑셀에서 다시 저장하면 인코딩과 범위 값이 바뀔 수 있습니다.';

/**
 * Reads an uploaded Cafe24 export into rows of raw cell text: a UTF-8 .csv, or the first sheet of
 * an .xlsx. Throws a 400 with a Korean message for other extensions and for non-UTF-8 CSVs.
 */
export async function readOrderSheet(params: { fileName: string; bytes: Buffer }): Promise<string[][]> {
  const extension = params.fileName.toLowerCase().split('.').pop();
  if (extension === 'csv') return readCsv(params.bytes);
  if (extension === 'xlsx') return readXlsx(params.bytes);
  throw BadRequestException('csv 또는 xlsx 파일만 올릴 수 있습니다.');
}

// TextDecoder strips a leading BOM itself; `fatal` turns any non-UTF-8 byte into a thrown error.
function readCsv(bytes: Buffer): string[][] {
  try {
    return parseCsvText(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw BadRequestException(`CSV가 UTF-8이 아닙니다. ${RESAVE_HINT}`);
  }
}

async function readXlsx(bytes: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes).catch(() => {
    throw BadRequestException(`xlsx 파일을 읽을 수 없습니다. ${RESAVE_HINT}`);
  });
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push(Array.from({ length: sheet.columnCount }, (_, i) => toCellText(row.getCell(i + 1).value)));
  });
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}
```

If `workbook.xlsx.load(bytes)` fails to typecheck because of the Node `Buffer` generic, pass `bytes as unknown as ExcelJS.Buffer` (as `card-template.service.ts` effectively does).

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn jest src/admin/book-export/read-order-sheet.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/admin/book-export
git commit -m "feat(book-export): read uploaded csv/xlsx into rows"
```

---

## Task 4: Group rows into Cafe24 orders (backend)

**Files:**
- Create: `src/admin/book-export/book-order-parser.ts`, `src/admin/book-export/book-order-parser.spec.ts`

**Interfaces:**
- Consumes: `ParsedBookOrder`, `BOOK_EXPORT_LIMITS` (Task 2); rows from `readOrderSheet` (Task 3).
- Produces: `parseBookOrders(rows: string[][]): ParsedBookOrder[]` — first row is the header; throws `BadRequestException` for a missing required header, zero orders, or more than 500 orders.

- [ ] **Step 1: Write the failing test**

`src/admin/book-export/book-order-parser.spec.ts`:

```ts
import { parseBookOrders } from './book-order-parser';

const HEADER = [
  '발주일',
  '주문번호',
  '품목별 주문번호',
  '수량',
  '주문서추가항목01_Mindbridge 공간 ID (공통입력사항)',
  '주문서추가항목02_인쇄 질문 범위 (공통입력사항)',
  '주문상품명',
  '상품옵션',
];

function buildRow(params: { orderNo: string; quantity?: string; spaceId?: string; range?: string; option: string }): string[] {
  return [
    '2026-09-30 14:36',
    params.orderNo,
    `${params.orderNo}-01`,
    params.quantity ?? '1',
    params.spaceId ?? 'ABCD1234',
    params.range ?? '1-100',
    '[10월] Mindbridge 책 주문',
    params.option,
  ];
}

function buildOrderRows(orderNo: string, overrides: { spaceId?: string; range?: string } = {}): string[][] {
  return [
    buildRow({ orderNo, ...overrides, option: '표지 색상=브라운' }),
    buildRow({ orderNo, ...overrides, option: '유료 내지=선택 안함' }),
    buildRow({ orderNo, ...overrides, quantity: '100', option: '질문 개수 (예시 : Q1~Q100 희망 시 100개 상품을 담아주세요)=질문 개수만큼 상품을 담아주세요.' }),
    buildRow({ orderNo, ...overrides, option: '기록 패키지 책 구매자 25% 할인 (스티커 2종/메모지 1종)=선택 안함' }),
  ];
}

describe('parseBookOrders', () => {
  it('groups item rows into one order and reads its options', () => {
    const actual = parseBookOrders([HEADER, ...buildOrderRows('20260930-0000024')]);
    expect(actual).toEqual([
      {
        orderNo: '20260930-0000024',
        orderedAt: '2026-09-30 14:36',
        spaceId: 'ABCD1234',
        rangeRaw: '1-100',
        isConsistent: true,
        coverColor: '브라운',
        paidInner: '선택 안함',
        paidQuestionCount: 100,
      },
    ]);
  });

  it('keeps first-seen order across interleaved rows', () => {
    const first = buildOrderRows('A-1');
    const second = buildOrderRows('B-2');
    const actual = parseBookOrders([HEADER, first[0], second[0], first[1], second[1]]);
    expect(actual.map((order) => order.orderNo)).toEqual(['A-1', 'B-2']);
  });

  it('trims and uppercases the space ID', () => {
    const actual = parseBookOrders([HEADER, ...buildOrderRows('A-1', { spaceId: ' abcd1234 ' })]);
    expect(actual[0].spaceId).toBe('ABCD1234');
  });

  it('flags an order whose rows disagree on space ID or range', () => {
    const rows = buildOrderRows('A-1');
    rows[1][5] = '1-120';
    const actual = parseBookOrders([HEADER, ...rows]);
    expect(actual[0].isConsistent).toBe(false);
  });

  it('leaves missing options empty and a non-numeric paid quantity null', () => {
    const rows = [buildRow({ orderNo: 'A-1', quantity: 'x', option: '질문 개수=담기' })];
    const actual = parseBookOrders([HEADER, ...rows]);
    expect(actual[0]).toMatchObject({ coverColor: '', paidInner: '', paidQuestionCount: null });
  });

  it('splits an option at the first "=" only', () => {
    const rows = [buildRow({ orderNo: 'A-1', option: '표지 색상=브라운=진한' })];
    expect(parseBookOrders([HEADER, ...rows])[0].coverColor).toBe('브라운=진한');
  });

  it('ignores rows without an order number (Excel totals or footer rows)', () => {
    const footer = ['', '', '', '4', '', '', '', ''];
    const actual = parseBookOrders([HEADER, ...buildOrderRows('A-1'), footer]);
    expect(actual).toHaveLength(1);
  });

  it('matches headers by substring so the suffix may change', () => {
    const header = [...HEADER];
    header[4] = '주문서추가항목01_Mindbridge 공간 ID';
    expect(parseBookOrders([header, ...buildOrderRows('A-1')])[0].spaceId).toBe('ABCD1234');
  });

  it('rejects a file without a required header, naming it', () => {
    const header = HEADER.filter((cell) => !cell.includes('질문 범위'));
    expect(() => parseBookOrders([header])).toThrow("'질문 범위'");
  });

  it('rejects a file with no orders', () => {
    expect(() => parseBookOrders([HEADER])).toThrow('주문이 없습니다');
  });

  it('rejects more than 500 orders', () => {
    const rows = Array.from({ length: 501 }, (_, i) => buildRow({ orderNo: `O-${i}`, option: '표지 색상=브라운' }));
    expect(() => parseBookOrders([HEADER, ...rows])).toThrow('500');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/admin/book-export/book-order-parser.spec.ts`
Expected: FAIL — "Cannot find module './book-order-parser'".

- [ ] **Step 3: Implement**

`src/admin/book-export/book-order-parser.ts`:

```ts
import { BadRequestException } from 'src/common/exception/error';
import { ParsedBookOrder } from './book-export.interface';
import { BOOK_EXPORT_LIMITS } from './book-export.limits';

type ColumnIndexes = {
  orderNo: number;
  quantity: number;
  spaceId: number;
  range: number;
  option: number;
  orderedAt: number;
};

type RequiredColumn = {
  key: Exclude<keyof ColumnIndexes, 'orderedAt'>;
  label: string;
  matches: (header: string) => boolean;
};

type OrderOption = { key: string; value: string; quantity: string };

const REQUIRED_COLUMNS: RequiredColumn[] = [
  { key: 'orderNo', label: '주문번호', matches: (header) => header === '주문번호' },
  { key: 'quantity', label: '수량', matches: (header) => header === '수량' },
  { key: 'spaceId', label: '공간 ID', matches: (header) => header.includes('공간 ID') },
  { key: 'range', label: '질문 범위', matches: (header) => header.includes('질문 범위') },
  { key: 'option', label: '상품옵션', matches: (header) => header === '상품옵션' },
];

/**
 * Turns Cafe24 export rows (first row = header) into one ParsedBookOrder per 주문번호, in
 * first-seen order. Throws a 400 when a required header is missing or the order count is 0 or
 * above the upload limit.
 */
export function parseBookOrders(rows: string[][]): ParsedBookOrder[] {
  const columns = findColumns(rows[0] ?? []);
  const groups = groupRowsByOrder({ rows: rows.slice(1), column: columns.orderNo });
  if (groups.size === 0) throw BadRequestException('파일에 주문이 없습니다.');
  if (groups.size > BOOK_EXPORT_LIMITS.maxOrders) {
    throw BadRequestException(`한 번에 최대 ${BOOK_EXPORT_LIMITS.maxOrders}건까지 올릴 수 있습니다.`);
  }
  return [...groups.entries()].map(([orderNo, orderRows]) => toParsedOrder({ orderNo, rows: orderRows, columns }));
}

function findColumns(header: string[]): ColumnIndexes {
  const trimmed = header.map((cell) => cell.trim());
  const missing = REQUIRED_COLUMNS.find((column) => trimmed.findIndex(column.matches) < 0);
  if (missing) {
    throw BadRequestException(`'${missing.label}' 컬럼이 없습니다. 카페24 발주서 파일인지 확인해 주세요.`);
  }
  const indexOf = (column: RequiredColumn): number => trimmed.findIndex(column.matches);
  const [orderNo, quantity, spaceId, range, option] = REQUIRED_COLUMNS.map(indexOf);
  return { orderNo, quantity, spaceId, range, option, orderedAt: trimmed.findIndex((cell) => cell.includes('발주일')) };
}

function groupRowsByOrder(params: { rows: string[][]; column: number }): Map<string, string[][]> {
  const groups = new Map<string, string[][]>();
  params.rows.forEach((row) => {
    const orderNo = readCell(row, params.column);
    if (!orderNo) return;
    const group = groups.get(orderNo);
    if (group) group.push(row);
    else groups.set(orderNo, [row]);
  });
  return groups;
}

function toParsedOrder(params: { orderNo: string; rows: string[][]; columns: ColumnIndexes }): ParsedBookOrder {
  const { rows, columns } = params;
  const spaceIds = new Set(rows.map((row) => readCell(row, columns.spaceId).toUpperCase()));
  const ranges = new Set(rows.map((row) => readCell(row, columns.range)));
  const options = rows.map((row) => ({ ...splitOption(readCell(row, columns.option)), quantity: readCell(row, columns.quantity) }));
  const findOption = (prefix: string): OrderOption | undefined => options.find((option) => option.key.startsWith(prefix));
  const paidQuestion = findOption('질문 개수');
  return {
    orderNo: params.orderNo,
    orderedAt: readCell(rows[0], columns.orderedAt),
    spaceId: [...spaceIds][0],
    rangeRaw: [...ranges][0],
    isConsistent: spaceIds.size === 1 && ranges.size === 1,
    coverColor: findOption('표지 색상')?.value ?? '',
    paidInner: findOption('유료 내지')?.value ?? '',
    paidQuestionCount: paidQuestion && /^\d+$/.test(paidQuestion.quantity) ? Number(paidQuestion.quantity) : null,
  };
}

function readCell(row: string[], index: number): string {
  return index < 0 ? '' : (row[index] ?? '').trim();
}

function splitOption(text: string): { key: string; value: string } {
  const index = text.indexOf('=');
  if (index < 0) return { key: text, value: '' };
  return { key: text.slice(0, index).trim(), value: text.slice(index + 1).trim() };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest src/admin/book-export/book-order-parser.spec.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/book-export/book-order-parser.ts src/admin/book-export/book-order-parser.spec.ts
git commit -m "feat(book-export): group Cafe24 rows into orders"
```

---

## Task 5: Evaluate one order against the rules (backend, pure)

**Files:**
- Create: `src/admin/book-export/evaluate-book-order.ts`, `src/admin/book-export/evaluate-book-order.spec.ts`

**Interfaces:**
- Consumes: `ParsedBookOrder`, `BookOrderSpace`, `BookOrderCardStats`, `BookOrderValidation`, `BOOK_EXPORT_LIMITS` (Task 2); `parseOrderRange` (Task 2); `resolveCoverIdentity` (Task 1).
- Produces: `evaluateBookOrder(params: { order: ParsedBookOrder; space: BookOrderSpace | null; cardStats: BookOrderCardStats | null; isDuplicateSpace: boolean }): BookOrderValidation`. `cardStats` is null when cards were not queried (space missing, range invalid, or range size out of bounds); card-based checks are skipped then.

- [ ] **Step 1: Write the failing test**

`src/admin/book-export/evaluate-book-order.spec.ts`:

```ts
import { ParsedBookOrder } from './book-export.interface';
import { evaluateBookOrder } from './evaluate-book-order';

const ORDER: ParsedBookOrder = {
  orderNo: 'A-1',
  orderedAt: '2026-09-30 14:36',
  spaceId: 'ABCD1234',
  rangeRaw: '1-100',
  isConsistent: true,
  coverColor: '브라운',
  paidInner: '선택 안함',
  paidQuestionCount: 100,
};
const SPACE = { id: 'ABCD1234', cardOrder: 150, dueRemovedAt: null, spaceInfo: { name: '우리 가족', locale: 'ko' } };
const FULL = { answeredCount: 100, exportEnd: 100 };

function codesOf(params: Partial<Parameters<typeof evaluateBookOrder>[0]>): string[] {
  const actual = evaluateBookOrder({ order: ORDER, space: SPACE, cardStats: FULL, isDuplicateSpace: false, ...params });
  return actual.issues.map((issue) => issue.code);
}

describe('evaluateBookOrder', () => {
  it('returns ok with cover identity and ranges when everything checks out', () => {
    const actual = evaluateBookOrder({ order: ORDER, space: SPACE, cardStats: FULL, isDuplicateSpace: false });
    expect(actual).toMatchObject({
      level: 'ok',
      issues: [],
      startOrder: 1,
      endOrder: 100,
      exportEnd: 100,
      answeredCount: 100,
      spaceName: '우리 가족',
      locale: 'ko',
    });
  });

  it('errors on a blank space ID', () => {
    expect(codesOf({ order: { ...ORDER, spaceId: '' }, space: null, cardStats: null })).toEqual(['SPACE_ID_MISSING']);
  });

  it('errors on an unknown space and leaves the space name empty', () => {
    const actual = evaluateBookOrder({ order: ORDER, space: null, cardStats: null, isDuplicateSpace: false });
    expect(actual.issues.map((issue) => issue.code)).toEqual(['SPACE_NOT_FOUND']);
    expect(actual.level).toBe('error');
    expect(actual.spaceName).toBe('');
  });

  it('errors on an unreadable range', () => {
    expect(codesOf({ order: { ...ORDER, rangeRaw: '처음부터' }, cardStats: null })).toContain('RANGE_INVALID');
  });

  it.each(['1-29', '1-201'])('errors when the range size is outside 30-200 (%p)', (rangeRaw) => {
    expect(codesOf({ order: { ...ORDER, rangeRaw, paidQuestionCount: null }, cardStats: null })).toEqual(['RANGE_SIZE']);
  });

  it('errors when the cover color is missing', () => {
    expect(codesOf({ order: { ...ORDER, coverColor: '' } })).toEqual(['COVER_COLOR_MISSING']);
  });

  it('errors when rows of the order disagree', () => {
    expect(codesOf({ order: { ...ORDER, isConsistent: false } })).toEqual(['INCONSISTENT_ROWS']);
  });

  it('errors when nothing in range is answered', () => {
    expect(codesOf({ cardStats: { answeredCount: 0, exportEnd: null } })).toEqual(['NO_ANSWERED_CARDS']);
  });

  it('warns when the paid question count differs from the range size', () => {
    const actual = evaluateBookOrder({
      order: { ...ORDER, paidQuestionCount: 90 },
      space: SPACE,
      cardStats: FULL,
      isDuplicateSpace: false,
    });
    expect(actual.level).toBe('warning');
    expect(actual.issues.map((issue) => issue.code)).toEqual(['PAID_COUNT_MISMATCH']);
  });

  it('warns once (clamped) when the range runs past the space, not also as dropped', () => {
    const space = { ...SPACE, cardOrder: 80 };
    expect(codesOf({ space, cardStats: { answeredCount: 80, exportEnd: 80 } })).toEqual(['RANGE_CLAMPED']);
  });

  it('warns when unanswered cards inside the space are dropped', () => {
    expect(codesOf({ cardStats: { answeredCount: 99, exportEnd: 99 } })).toEqual(['UNANSWERED_DROPPED']);
  });

  it('warns when another order in the file uses the same space', () => {
    expect(codesOf({ isDuplicateSpace: true })).toEqual(['DUPLICATE_SPACE']);
  });

  it('warns (but still allows extraction) when the space is scheduled for deletion', () => {
    const space = { ...SPACE, dueRemovedAt: new Date('2026-10-15T00:00:00Z') };
    const actual = evaluateBookOrder({ order: ORDER, space, cardStats: FULL, isDuplicateSpace: false });
    expect(actual.level).toBe('warning');
    expect(actual.issues).toEqual([{ code: 'SPACE_PENDING_DELETION', message: '삭제 예정 공간입니다. 제작 전에 고객에게 확인해 주세요.' }]);
  });

  it('rolls the level up to error when an error and a warning coexist', () => {
    const actual = evaluateBookOrder({
      order: { ...ORDER, coverColor: '' },
      space: SPACE,
      cardStats: FULL,
      isDuplicateSpace: true,
    });
    expect(actual.level).toBe('error');
  });

  it('uses the localized default name when the space name is blank', () => {
    const space = { ...SPACE, spaceInfo: { name: ' ', locale: 'en' } };
    const actual = evaluateBookOrder({ order: ORDER, space, cardStats: FULL, isDuplicateSpace: false });
    expect(actual.spaceName).toBe('My Space');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/admin/book-export/evaluate-book-order.spec.ts`
Expected: FAIL — "Cannot find module './evaluate-book-order'".

- [ ] **Step 3: Implement**

`src/admin/book-export/evaluate-book-order.ts`:

```ts
import { resolveCoverIdentity } from 'src/card/export/card-export.cover';
import {
  BookOrderCardStats,
  BookOrderIssueCode,
  BookOrderLevel,
  BookOrderSpace,
  BookOrderValidation,
  ParsedBookOrder,
} from './book-export.interface';
import { BOOK_EXPORT_LIMITS } from './book-export.limits';
import { parseOrderRange } from './parse-order-range';

type EvaluateParams = {
  order: ParsedBookOrder;
  space: BookOrderSpace | null;
  cardStats: BookOrderCardStats | null;
  isDuplicateSpace: boolean;
};

type OrderRange = { startOrder: number; endOrder: number };

const ISSUE_LEVEL: Record<BookOrderIssueCode, Exclude<BookOrderLevel, 'ok'>> = {
  SPACE_ID_MISSING: 'error',
  SPACE_NOT_FOUND: 'error',
  RANGE_INVALID: 'error',
  RANGE_SIZE: 'error',
  COVER_COLOR_MISSING: 'error',
  INCONSISTENT_ROWS: 'error',
  NO_ANSWERED_CARDS: 'error',
  PAID_COUNT_MISMATCH: 'warning',
  UNANSWERED_DROPPED: 'warning',
  RANGE_CLAMPED: 'warning',
  DUPLICATE_SPACE: 'warning',
  SPACE_PENDING_DELETION: 'warning',
};

const ISSUE_MESSAGE: Record<BookOrderIssueCode, string> = {
  SPACE_ID_MISSING: '공간 ID가 비어 있습니다.',
  SPACE_NOT_FOUND: '존재하지 않는 공간 ID입니다.',
  RANGE_INVALID: '질문 범위를 읽을 수 없습니다. 예) 1-100',
  RANGE_SIZE: `질문 범위는 ${BOOK_EXPORT_LIMITS.minRangeSize}~${BOOK_EXPORT_LIMITS.maxRangeSize}문항이어야 합니다.`,
  COVER_COLOR_MISSING: '표지 색상 옵션이 없습니다.',
  INCONSISTENT_ROWS: '같은 주문 안에서 공간 ID나 질문 범위가 다릅니다.',
  NO_ANSWERED_CARDS: '범위 안에 답변이 있는 질문이 없습니다.',
  PAID_COUNT_MISMATCH: '결제한 질문 수와 질문 범위가 다릅니다.',
  UNANSWERED_DROPPED: '답변이 없는 질문은 책에서 빠집니다.',
  RANGE_CLAMPED: '범위가 공간의 현재 질문 수를 넘어 뒤쪽이 잘립니다.',
  DUPLICATE_SPACE: '같은 공간의 다른 주문이 파일에 있습니다.',
  SPACE_PENDING_DELETION: '삭제 예정 공간입니다. 제작 전에 고객에게 확인해 주세요.',
};

/**
 * Applies the spec §3.2 rules to one parsed order. Pure: the space and answered-card stats are
 * looked up by the caller (null when absent or not queried).
 */
export function evaluateBookOrder(params: EvaluateParams): BookOrderValidation {
  const { order, space, cardStats } = params;
  const range = parseOrderRange(order.rangeRaw);
  const codes = collectIssueCodes({ ...params, range });
  const cover = resolveCoverIdentity(space?.spaceInfo ?? null);
  return {
    orderNo: order.orderNo,
    orderedAt: order.orderedAt,
    spaceId: order.spaceId,
    rangeRaw: order.rangeRaw,
    startOrder: range?.startOrder ?? null,
    endOrder: range?.endOrder ?? null,
    exportEnd: cardStats?.exportEnd ?? null,
    paidQuestionCount: order.paidQuestionCount,
    answeredCount: cardStats?.answeredCount ?? 0,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
    spaceName: space ? cover.spaceName : '',
    locale: space ? cover.locale : '',
    level: rollUpLevel(codes),
    issues: codes.map((code) => ({ code, message: ISSUE_MESSAGE[code] })),
  };
}

function collectIssueCodes(params: EvaluateParams & { range: OrderRange | null }): BookOrderIssueCode[] {
  const { order, space, cardStats, range } = params;
  const rangeSize = range ? range.endOrder - range.startOrder + 1 : 0;
  const clampedEnd = range && space ? Math.min(range.endOrder, space.cardOrder) : 0;
  const answered = cardStats?.answeredCount ?? 0;
  const hasAnswers = cardStats !== null && answered > 0;
  const checks: [boolean, BookOrderIssueCode][] = [
    [!order.isConsistent, 'INCONSISTENT_ROWS'],
    [!order.spaceId, 'SPACE_ID_MISSING'],
    [!!order.spaceId && !space, 'SPACE_NOT_FOUND'],
    [!range, 'RANGE_INVALID'],
    [!!range && (rangeSize < BOOK_EXPORT_LIMITS.minRangeSize || rangeSize > BOOK_EXPORT_LIMITS.maxRangeSize), 'RANGE_SIZE'],
    [!order.coverColor, 'COVER_COLOR_MISSING'],
    [cardStats !== null && answered === 0, 'NO_ANSWERED_CARDS'],
    [hasAnswers && !!range && !!space && range.endOrder > space.cardOrder, 'RANGE_CLAMPED'],
    [hasAnswers && !!range && answered < clampedEnd - range.startOrder + 1, 'UNANSWERED_DROPPED'],
    [!!range && order.paidQuestionCount !== null && order.paidQuestionCount !== rangeSize, 'PAID_COUNT_MISMATCH'],
    [params.isDuplicateSpace, 'DUPLICATE_SPACE'],
    [!!space?.dueRemovedAt, 'SPACE_PENDING_DELETION'],
  ];
  return checks.filter(([isFailed]) => isFailed).map(([, code]) => code);
}

function rollUpLevel(codes: BookOrderIssueCode[]): BookOrderLevel {
  const levels = codes.map((code) => ISSUE_LEVEL[code]);
  if (levels.includes('error')) return 'error';
  return levels.includes('warning') ? 'warning' : 'ok';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest src/admin/book-export/evaluate-book-order.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/book-export/evaluate-book-order.ts src/admin/book-export/evaluate-book-order.spec.ts
git commit -m "feat(book-export): evaluate an order against the extraction rules"
```

---

## Task 6: Validation service with batched lookups (backend)

**Files:**
- Create: `src/admin/book-export/book-order-validation.service.ts`, `src/admin/book-export/book-order-validation.service.spec.ts`

**Interfaces:**
- Consumes: `readOrderSheet` (Task 3), `parseBookOrders` (Task 4), `evaluateBookOrder` (Task 5), `selectAnsweredCards` (Task 1), `parseOrderRange`, `BOOK_EXPORT_LIMITS` (Task 2).
- Produces: `class BookOrderValidationService` with
  - `validateUpload(file: File): Promise<BookOrderValidationResult>`
  - `validateOrders(orders: ParsedBookOrder[]): Promise<BookOrderValidation[]>` (reused by Task 7)

- [ ] **Step 1: Write the failing test**

`src/admin/book-export/book-order-validation.service.spec.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { ParsedBookOrder } from './book-export.interface';

jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const { BookOrderValidationService } = require('./book-order-validation.service');

const ORDER: ParsedBookOrder = {
  orderNo: 'A-1',
  orderedAt: '',
  spaceId: 'ABCD1234',
  rangeRaw: '1-30',
  isConsistent: true,
  coverColor: '브라운',
  paidInner: '',
  paidQuestionCount: null,
};

// The validation query already filters to answered cards (`replies: { some: {} }`), so the mock
// returns only the answered orders.
function buildCards(params: { from: number; to: number; unanswered?: number[] }): { order: number }[] {
  return Array.from({ length: params.to - params.from + 1 }, (_, i) => ({ order: params.from + i })).filter(
    (card) => !params.unanswered?.includes(card.order),
  );
}

function buildFile(params: { name: string; bytes: Buffer }): File {
  return {
    name: params.name,
    size: params.bytes.length,
    arrayBuffer: async () => params.bytes.buffer.slice(params.bytes.byteOffset, params.bytes.byteOffset + params.bytes.length),
  } as unknown as File;
}

describe('BookOrderValidationService', () => {
  let prisma: any;
  let service: any;

  beforeEach(() => {
    prisma = {
      space: { findMany: jest.fn().mockResolvedValue([]) },
      card: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    service = new BookOrderValidationService(prisma);
  });

  it('looks up all spaces in one query and counts answered cards per order', async () => {
    prisma.space.findMany.mockResolvedValue([{ id: 'ABCD1234', cardOrder: 50, spaceInfo: { name: '우리', locale: 'ko' } }]);
    prisma.card.findMany.mockResolvedValue(buildCards({ from: 1, to: 30 }));
    const [actual] = await service.validateOrders([ORDER]);
    expect(prisma.space.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.space.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['ABCD1234'] } });
    expect(prisma.space.findMany.mock.calls[0][0].select).toMatchObject({ dueRemovedAt: true });
    expect(prisma.card.findMany.mock.calls[0][0].where).toEqual({
      spaceId: 'ABCD1234',
      order: { gte: 1, lte: 30 },
      replies: { some: {} },
    });
    expect(actual).toMatchObject({ level: 'ok', answeredCount: 30, exportEnd: 30, spaceName: '우리' });
  });

  it('selects only card orders during validation (no reply content, no _count)', async () => {
    prisma.space.findMany.mockResolvedValue([{ id: 'ABCD1234', cardOrder: 50, spaceInfo: null }]);
    prisma.card.findMany.mockResolvedValue(buildCards({ from: 1, to: 30 }));
    await service.validateOrders([ORDER]);
    expect(prisma.card.findMany.mock.calls[0][0].select).toEqual({ order: true });
  });

  it('clamps the card query to the space card count and trims trailing unanswered cards', async () => {
    prisma.space.findMany.mockResolvedValue([{ id: 'ABCD1234', cardOrder: 29, spaceInfo: null }]);
    prisma.card.findMany.mockResolvedValue(buildCards({ from: 1, to: 29, unanswered: [29] }));
    const [actual] = await service.validateOrders([ORDER]);
    expect(prisma.card.findMany.mock.calls[0][0].where.order).toEqual({ gte: 1, lte: 29 });
    expect(actual.exportEnd).toBe(28);
    expect(actual.issues.map((issue: { code: string }) => issue.code)).toEqual(['RANGE_CLAMPED', 'UNANSWERED_DROPPED']);
  });

  it('skips the card query for unknown spaces and out-of-bounds ranges', async () => {
    const orders = [ORDER, { ...ORDER, orderNo: 'A-2', spaceId: 'ZZZZ0000' }, { ...ORDER, orderNo: 'A-3', rangeRaw: '1-10' }];
    prisma.space.findMany.mockResolvedValue([{ id: 'ABCD1234', cardOrder: 50, spaceInfo: null }]);
    prisma.card.findMany.mockResolvedValue(buildCards({ from: 1, to: 30 }));
    const actual = await service.validateOrders(orders);
    expect(prisma.card.findMany).toHaveBeenCalledTimes(1);
    expect(actual.map((order: { level: string }) => order.level)).toEqual(['warning', 'error', 'error']);
  });

  it('reports NO_ANSWERED_CARDS without querying when the range starts past the last card', async () => {
    prisma.space.findMany.mockResolvedValue([{ id: 'ABCD1234', cardOrder: 0, spaceInfo: null }]);
    const [actual] = await service.validateOrders([ORDER]);
    expect(prisma.card.findMany).not.toHaveBeenCalled();
    expect(actual.issues.map((issue: { code: string }) => issue.code)).toEqual(['NO_ANSWERED_CARDS']);
  });

  it('flags every order that shares a space ID', async () => {
    prisma.space.findMany.mockResolvedValue([{ id: 'ABCD1234', cardOrder: 50, spaceInfo: null }]);
    prisma.card.findMany.mockResolvedValue(buildCards({ from: 1, to: 30 }));
    const actual = await service.validateOrders([ORDER, { ...ORDER, orderNo: 'A-2' }]);
    expect(actual.every((order: { issues: { code: string }[] }) => order.issues.some((issue) => issue.code === 'DUPLICATE_SPACE'))).toBe(true);
  });

  it('validates the Cafe24 sample upload end to end (unknown test space)', async () => {
    const bytes = readFileSync(join(__dirname, '__fixtures__', 'cafe24-orders.csv'));
    const actual = await service.validateUpload(buildFile({ name: 'prest201.csv', bytes }));
    expect(actual.orders).toHaveLength(1);
    expect(actual.orders[0]).toMatchObject({ orderNo: '20260930-0000024', spaceId: 'DSDFSDF', coverColor: '브라운', level: 'error' });
    expect(actual.orders[0].issues.map((issue: { code: string }) => issue.code)).toContain('SPACE_NOT_FOUND');
  });

  it('rejects files over 5 MB before reading them', async () => {
    const file = { name: 'big.csv', size: 5 * 1024 * 1024 + 1, arrayBuffer: jest.fn() } as unknown as File;
    await expect(service.validateUpload(file)).rejects.toThrow('5MB');
    expect((file as unknown as { arrayBuffer: jest.Mock }).arrayBuffer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/admin/book-export/book-order-validation.service.spec.ts`
Expected: FAIL — "Cannot find module './book-order-validation.service'".

- [ ] **Step 3: Implement**

`src/admin/book-export/book-order-validation.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { BadRequestException } from 'src/common/exception/error';
import { PrismaService } from 'src/prisma/prisma.service';
import { selectAnsweredCards } from 'src/card/export/card-export.answered';
import {
  BookOrderCardStats,
  BookOrderSpace,
  BookOrderValidation,
  BookOrderValidationResult,
  ParsedBookOrder,
} from './book-export.interface';
import { BOOK_EXPORT_LIMITS } from './book-export.limits';
import { parseBookOrders } from './book-order-parser';
import { evaluateBookOrder } from './evaluate-book-order';
import { parseOrderRange } from './parse-order-range';
import { readOrderSheet } from './read-order-sheet';

type CardQueryTarget = { orderNo: string; spaceId: string; startOrder: number; clampedEnd: number };

const NOTHING_ANSWERED: BookOrderCardStats = { answeredCount: 0, exportEnd: null };

/** Parses a Cafe24 order export and validates each order for book extraction (spec §3.1–3.2). */
@Injectable()
export class BookOrderValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Checks the size, reads and parses the file, then validates every order. */
  async validateUpload(file: File): Promise<BookOrderValidationResult> {
    if (file.size > BOOK_EXPORT_LIMITS.maxFileBytes) throw BadRequestException('파일은 5MB 이하만 올릴 수 있습니다.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const rows = await readOrderSheet({ fileName: file.name, bytes });
    return { orders: await this.validateOrders(parseBookOrders(rows)) };
  }

  /** Validates orders with one space query and one answered-cards-only query per checkable order; never reads reply content. */
  async validateOrders(orders: ParsedBookOrder[]): Promise<BookOrderValidation[]> {
    const spaces = await this.findSpaces(orders);
    const statsByOrder = await this.countAnsweredCards(orders.flatMap((order) => toCardQueryTarget({ order, space: spaces.get(order.spaceId) })));
    const spaceUseCounts = countSpaceUses(orders);
    return orders.map((order) =>
      evaluateBookOrder({
        order,
        space: spaces.get(order.spaceId) ?? null,
        cardStats: statsByOrder.get(order.orderNo) ?? null,
        isDuplicateSpace: (spaceUseCounts.get(order.spaceId) ?? 0) > 1,
      }),
    );
  }

  private async findSpaces(orders: ParsedBookOrder[]): Promise<Map<string, BookOrderSpace>> {
    const ids = [...new Set(orders.map((order) => order.spaceId).filter((id) => id !== ''))];
    if (ids.length === 0) return new Map();
    const spaces = await this.prisma.space.findMany({
      where: { id: { in: ids } },
      select: { id: true, cardOrder: true, dueRemovedAt: true, spaceInfo: { select: { name: true, locale: true } } },
    });
    return new Map<string, BookOrderSpace>(spaces.map((space) => [space.id, space]));
  }

  private async countAnsweredCards(targets: CardQueryTarget[]): Promise<Map<string, BookOrderCardStats>> {
    const queryable = targets.filter((target) => target.clampedEnd >= target.startOrder);
    const results = await this.prisma.$transaction(
      queryable.map((target) =>
        this.prisma.card.findMany({
          where: { spaceId: target.spaceId, order: { gte: target.startOrder, lte: target.clampedEnd }, replies: { some: {} } },
          select: { order: true },
          orderBy: { order: 'asc' },
        }),
      ),
    );
    const stats = new Map<string, BookOrderCardStats>(targets.map((target) => [target.orderNo, NOTHING_ANSWERED]));
    queryable.forEach((target, i) => stats.set(target.orderNo, toCardStats({ cards: results[i], clampedEnd: target.clampedEnd })));
    return stats;
  }
}

function toCardQueryTarget(params: { order: ParsedBookOrder; space: BookOrderSpace | undefined }): CardQueryTarget[] {
  const range = parseOrderRange(params.order.rangeRaw);
  if (!params.space || !range) return [];
  const size = range.endOrder - range.startOrder + 1;
  if (size < BOOK_EXPORT_LIMITS.minRangeSize || size > BOOK_EXPORT_LIMITS.maxRangeSize) return [];
  const clampedEnd = Math.min(range.endOrder, params.space.cardOrder);
  return [{ orderNo: params.order.orderNo, spaceId: params.space.id, startOrder: range.startOrder, clampedEnd }];
}

// Rows are already answered-only, so every card counts as answered; the shared helper still owns the end rule.
function toCardStats(params: { cards: { order: number }[]; clampedEnd: number }): BookOrderCardStats {
  const { answered, exportEnd } = selectAnsweredCards({
    cards: params.cards,
    clampedEnd: params.clampedEnd,
    countReplies: () => 1,
  });
  return { answeredCount: answered.length, exportEnd: answered.length > 0 ? exportEnd : null };
}

function countSpaceUses(orders: ParsedBookOrder[]): Map<string, number> {
  const counts = new Map<string, number>();
  orders.filter((order) => order.spaceId !== '').forEach((order) => counts.set(order.spaceId, (counts.get(order.spaceId) ?? 0) + 1));
  return counts;
}
```

Note: `toCardQueryTarget` returns an array (0 or 1 item) so `flatMap` drops unqueryable orders; those orders get `cardStats: null` and skip card-based checks, while orders with `clampedEnd < startOrder` get `NOTHING_ANSWERED` (→ `NO_ANSWERED_CARDS`).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest src/admin/book-export/book-order-validation.service.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 4b: Check the generated SQL on a dev database**

Run one validation against dev with Prisma query logging (`PRISMA_LOG_QUERIES=true yarn dev`; `prisma.service.ts:24` reads it), upload the sample CSV edited to a real space ID, and `EXPLAIN` the logged `Card` query. Expected: an `EXISTS`/semi-join on `Reply` using `Reply_cardId_fkey` and `idx_card_space_order` on `Card` — no full scan of `Reply`. If it scans, stop and report before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/admin/book-export/book-order-validation.service.ts src/admin/book-export/book-order-validation.service.spec.ts
git commit -m "feat(book-export): validate uploaded orders with batched lookups"
```

---

## Task 7: Build book JSON for up to 20 orders (backend)

**Files:**
- Create: `src/admin/book-export/book-export-books.service.ts`, `src/admin/book-export/book-export-books.service.spec.ts`

**Interfaces:**
- Consumes: `BookOrderValidationService.validateOrders` (Task 6), `selectAnsweredCards`, `toExportCards` (Task 1), `BookExportRequestOrder`, `BookExportBook`, `BookExportBooksResult`, `BOOK_EXPORT_LIMITS` (Task 2).
- Produces: `class BookExportBooksService` with `buildBooks(orders: BookExportRequestOrder[]): Promise<BookExportBooksResult>`.

- [ ] **Step 1: Write the failing test**

`src/admin/book-export/book-export-books.service.spec.ts`:

```ts
import { BookExportRequestOrder, BookOrderValidation } from './book-export.interface';

jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('./book-order-validation.service', () => ({ BookOrderValidationService: class {} }));

const { BookExportBooksService } = require('./book-export-books.service');

const REQUEST: BookExportRequestOrder = {
  orderNo: 'A-1',
  spaceId: 'abcd1234',
  startOrder: 1,
  endOrder: 30,
  coverColor: '브라운',
  paidInner: '선택 안함',
};

function buildValidation(overrides: Partial<BookOrderValidation> = {}): BookOrderValidation {
  return {
    orderNo: 'A-1',
    orderedAt: '',
    spaceId: 'ABCD1234',
    rangeRaw: '1-30',
    startOrder: 1,
    endOrder: 30,
    exportEnd: 30,
    paidQuestionCount: null,
    answeredCount: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    spaceName: '우리 가족',
    locale: 'ko',
    level: 'ok',
    issues: [],
    ...overrides,
  };
}

function buildCard(order: number, replies: { content: string; nickname: string }[]) {
  return {
    order,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    template: { name: `질문 ${order}` },
    replies: replies.map((reply) => ({ content: reply.content, profile: { nickname: reply.nickname } })),
  };
}

describe('BookExportBooksService.buildBooks', () => {
  let prisma: any;
  let validation: any;
  let service: any;

  beforeEach(() => {
    prisma = { card: { findMany: jest.fn() } };
    validation = { validateOrders: jest.fn() };
    service = new BookExportBooksService(prisma, validation);
  });

  it('re-validates the requested orders as parsed orders (normalized space ID, synthetic range)', async () => {
    validation.validateOrders.mockResolvedValue([buildValidation({ level: 'error', issues: [{ code: 'SPACE_NOT_FOUND', message: 'x' }] })]);
    await service.buildBooks([REQUEST]);
    expect(validation.validateOrders).toHaveBeenCalledWith([
      {
        orderNo: 'A-1',
        orderedAt: '',
        spaceId: 'ABCD1234',
        rangeRaw: '1-30',
        isConsistent: true,
        coverColor: '브라운',
        paidInner: '선택 안함',
        paidQuestionCount: null,
      },
    ]);
  });

  it('builds the PDF-equivalent book for an accepted order', async () => {
    validation.validateOrders.mockResolvedValue([buildValidation({ exportEnd: 2 })]);
    prisma.card.findMany.mockResolvedValue([
      buildCard(1, [{ content: '여행', nickname: '엄마' }]),
      buildCard(2, [{ content: '생일', nickname: '아빠' }]),
    ]);
    const actual = await service.buildBooks([REQUEST]);
    expect(prisma.card.findMany.mock.calls[0][0].where).toEqual({ spaceId: 'ABCD1234', order: { gte: 1, lte: 2 } });
    // Same include and order as CardExportService.countAnswered, so the book equals the PDF's cards.
    expect(prisma.card.findMany.mock.calls[0][0].include).toEqual({
      template: { select: { name: true } },
      replies: { include: { profile: true } },
    });
    expect(prisma.card.findMany.mock.calls[0][0].orderBy).toEqual({ order: 'asc' });
    expect(actual.rejected).toEqual([]);
    expect(actual.books).toEqual([
      {
        orderNo: 'A-1',
        coverColor: '브라운',
        paidInner: '선택 안함',
        cover: {
          spaceName: '우리 가족',
          startOrder: 1,
          endOrder: 2,
          count: 2,
          generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          locale: 'ko',
        },
        cards: [
          { order: 1, question: '질문 1', date: '2026-09-01', answers: [{ nickname: '엄마', content: '여행' }] },
          { order: 2, question: '질문 2', date: '2026-09-01', answers: [{ nickname: '아빠', content: '생일' }] },
        ],
      },
    ]);
  });

  it('rejects orders that fail re-validation and still builds the rest', async () => {
    validation.validateOrders.mockResolvedValue([
      buildValidation({ orderNo: 'A-1', level: 'error', issues: [{ code: 'SPACE_NOT_FOUND', message: '존재하지 않는 공간 ID입니다.' }] }),
      buildValidation({ orderNo: 'A-2', level: 'warning', exportEnd: 1 }),
    ]);
    prisma.card.findMany.mockResolvedValue([buildCard(1, [{ content: '답', nickname: '나' }])]);
    const actual = await service.buildBooks([REQUEST, { ...REQUEST, orderNo: 'A-2' }]);
    expect(actual.rejected).toEqual([{ orderNo: 'A-1', issues: [{ code: 'SPACE_NOT_FOUND', message: '존재하지 않는 공간 ID입니다.' }] }]);
    expect(actual.books.map((book: { orderNo: string }) => book.orderNo)).toEqual(['A-2']);
  });

  it.each([0, 21])('rejects a request with %p orders', async (count) => {
    const orders = Array.from({ length: count }, (_, i) => ({ ...REQUEST, orderNo: `O-${i}` }));
    await expect(service.buildBooks(orders)).rejects.toThrow('1~20');
    expect(validation.validateOrders).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/admin/book-export/book-export-books.service.spec.ts`
Expected: FAIL — "Cannot find module './book-export-books.service'".

- [ ] **Step 3: Implement**

`src/admin/book-export/book-export-books.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { BadRequestException } from 'src/common/exception/error';
import { PrismaService } from 'src/prisma/prisma.service';
import { selectAnsweredCards } from 'src/card/export/card-export.answered';
import { toExportCards } from 'src/card/export/card-export.cards';
import {
  BookExportBook,
  BookExportBooksResult,
  BookExportRequestOrder,
  BookOrderValidation,
  ParsedBookOrder,
} from './book-export.interface';
import { BOOK_EXPORT_LIMITS } from './book-export.limits';
import { BookOrderValidationService } from './book-order-validation.service';

/** Builds bindery book JSON for selected orders (spec §3.4). Client-sent values are re-validated. */
@Injectable()
export class BookExportBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: BookOrderValidationService,
  ) {}

  /** Re-validates 1–20 orders, rejects the failing ones, and builds the rest one at a time. */
  async buildBooks(orders: BookExportRequestOrder[]): Promise<BookExportBooksResult> {
    if (orders.length === 0 || orders.length > BOOK_EXPORT_LIMITS.maxBooksPerRequest) {
      throw BadRequestException(`한 번에 1~${BOOK_EXPORT_LIMITS.maxBooksPerRequest}건까지 요청할 수 있습니다.`);
    }
    const validations = await this.validation.validateOrders(orders.map(toParsedOrder));
    const rejected = validations
      .filter((validation) => validation.level === 'error')
      .map((validation) => ({ orderNo: validation.orderNo, issues: validation.issues }));
    const books: BookExportBook[] = [];
    for (const validation of validations.filter((item) => item.level !== 'error')) {
      books.push(await this.buildBook(validation));
    }
    return { books, rejected };
  }

  private async buildBook(validation: BookOrderValidation): Promise<BookExportBook> {
    if (validation.startOrder === null || validation.exportEnd === null) throw new Error(`Order ${validation.orderNo} has no export range`);
    const cards = await this.prisma.card.findMany({
      where: { spaceId: validation.spaceId, order: { gte: validation.startOrder, lte: validation.exportEnd } },
      include: { template: { select: { name: true } }, replies: { include: { profile: true } } },
      orderBy: { order: 'asc' },
    });
    const { answered, exportEnd } = selectAnsweredCards({ cards, clampedEnd: validation.exportEnd, countReplies: (card) => card.replies.length });
    return {
      orderNo: validation.orderNo,
      coverColor: validation.coverColor,
      paidInner: validation.paidInner,
      cover: {
        spaceName: validation.spaceName,
        startOrder: validation.startOrder,
        endOrder: exportEnd,
        count: answered.length,
        generatedAt: new Date().toISOString().slice(0, 10),
        locale: validation.locale,
      },
      cards: toExportCards(answered),
    };
  }
}

function toParsedOrder(order: BookExportRequestOrder): ParsedBookOrder {
  return {
    orderNo: order.orderNo,
    orderedAt: '',
    spaceId: order.spaceId.trim().toUpperCase(),
    rangeRaw: `${order.startOrder}-${order.endOrder}`,
    isConsistent: true,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
    paidQuestionCount: null,
  };
}
```

The card query and `include` are the same as `CardExportService.countAnswered`, and cards go through the same `selectAnsweredCards` + `toExportCards`, so a book equals the PDF for the same space and range. `generatedAt` uses the UTC date, as the PDF does.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest src/admin/book-export/book-export-books.service.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/book-export/book-export-books.service.ts src/admin/book-export/book-export-books.service.spec.ts
git commit -m "feat(book-export): build book JSON for selected orders"
```

---

## Task 8: Controller and module wiring (backend)

**Files:**
- Create: `src/admin/book-export/book-export.controller.ts`
- Create: `src/admin/book-export/book-export.module.ts`
- Modify: `src/admin/admin.module.ts` (import line ~24 and `imports` array line ~27)

**Interfaces:**
- Consumes: `BookOrderValidationService` (Task 6), `BookExportBooksService` (Task 7), `ValidateBookOrdersBody`, `BookExportBooksBody` (Task 2).
- Produces routes: `POST /admin/book-export/validate` (multipart `file`) → `BookOrderValidationResult`; `POST /admin/book-export/books` (JSON `{ orders }`) → `BookExportBooksResult`.

- [ ] **Step 1: Write the controller and module**

`src/admin/book-export/book-export.controller.ts`:

```ts
import { TypedBody, TypedFormData, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import {
  BookExportBooksBody,
  BookExportBooksResult,
  BookOrderValidationResult,
  ValidateBookOrdersBody,
} from './book-export.interface';
import { BookExportBooksService } from './book-export-books.service';
import { BookOrderValidationService } from './book-order-validation.service';

/** Admin book export: validate a Cafe24 order export, then fetch book JSON for selected orders. */
@Controller('admin/book-export')
@UseGuards(AdminGuard)
export class BookExportController {
  constructor(
    private readonly validation: BookOrderValidationService,
    private readonly books: BookExportBooksService,
  ) {}

  /** Parses the uploaded csv/xlsx and returns a validation result per order. */
  @TypedRoute.Post('/validate')
  async validateOrders(@TypedFormData.Body() body: ValidateBookOrdersBody): Promise<BookOrderValidationResult> {
    return this.validation.validateUpload(body.file);
  }

  /** Re-validates up to 20 orders and returns their book JSON plus the rejected ones. */
  @TypedRoute.Post('/books')
  async getBooks(@TypedBody() body: BookExportBooksBody): Promise<BookExportBooksResult> {
    return this.books.buildBooks(body.orders);
  }
}
```

`src/admin/book-export/book-export.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BookExportController } from './book-export.controller';
import { BookExportBooksService } from './book-export-books.service';
import { BookOrderValidationService } from './book-order-validation.service';

/** Stateless admin book export (spec 2026-09-30-book-export-design). */
@Module({
  providers: [BookOrderValidationService, BookExportBooksService],
  controllers: [BookExportController],
})
export class BookExportModule {}
```

`PrismaService` is `@Global` (the PDF export module relies on it the same way), so no import is needed.

In `src/admin/admin.module.ts`, add `import { BookExportModule } from './book-export/book-export.module';` after the `PdfExportModule` import, and append `BookExportModule` to the `imports` array:

```ts
  imports: [AuthModule, InteriorModule, UserModule, SpaceModule, PetModule, AppVersionModule, PdfExportModule, BookExportModule],
```

- [ ] **Step 2: Typecheck, run the module's tests, build**

Run: `npx tsc --noEmit -p tsconfig.json && yarn jest src/admin/book-export src/card/export && yarn build`
Expected: tsc exits 0; all specs PASS; `nest build` succeeds (the nestia transformer compiles `TypedFormData.Body()` for `File`).

- [ ] **Step 3: Smoke-test the routes locally**

Start the server (`yarn dev`), sign in to the admin at `http://localhost:4000`, copy the bearer token from any admin request in DevTools, then:

```bash
curl -s -X POST http://localhost:3000/admin/book-export/validate \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@src/admin/book-export/__fixtures__/cafe24-orders.csv" | head -c 600
```

Expected: `{"orders":[{"orderNo":"20260930-0000024",...,"spaceId":"DSDFSDF",...,"level":"error","issues":[{"code":"SPACE_NOT_FOUND",...`. Use the port from the server's startup log if it is not 3000.

- [ ] **Step 4: Commit**

```bash
git add src/admin/book-export/book-export.controller.ts src/admin/book-export/book-export.module.ts src/admin/admin.module.ts
git commit -m "feat(book-export): expose validate and books admin routes"
```

---

## Task 9: Frontend client, types, and zip helpers

**Files:**
- Modify: `package.json` / `pnpm-lock.yaml` (add `fflate`)
- Modify: `src/client/types.ts` (append after the PDF export types, line ~941)
- Create: `src/client/book-export.ts`
- Create: `src/components/page/book-export/services/book-export-download.ts`, `src/components/page/book-export/services/book-export-download.test.ts`
- Create: `src/components/page/book-export/services/book-zip-writer.ts`, `src/components/page/book-export/services/book-zip-writer.test.ts`

**Interfaces:**
- Consumes: backend routes from Task 8.
- Produces:
  - Types mirroring Task 2: `BookOrderIssueCode`, `BookOrderLevel`, `BookOrderIssue`, `BookOrderValidation`, `BookOrderValidationResult`, `BookExportRequestOrder`, `BookExportBook`, `BookExportRejectedOrder`, `BookExportBooksResult`.
  - `validateBookOrders(file: File): Promise<BookOrderValidationResult>`; `getBookExportBooks(orders: BookExportRequestOrder[]): Promise<BookExportBooksResult>`
  - `BOOKS_PER_REQUEST = 20`; `chunkItems<T>(items: T[], size: number): T[][]`; `isSelectableOrder(order: BookOrderValidation): boolean`; `toBookExportRequest(order: BookOrderValidation): BookExportRequestOrder`; `countOrdersByLevel(orders: BookOrderValidation[]): Record<'all' | BookOrderLevel, number>`; `buildBookZipName(now: Date): string`
  - `toZipEntryName(orderNo: string): string` — `{orderNo}.json` with anything outside `[0-9A-Za-z_-]` replaced by `_`
  - `createBookZipWriter(): Promise<{ add: (books: BookExportBook[]) => void; finish: () => Promise<Blob> }>` — streaming fflate `Zip`; books are compressed as each chunk arrives and can be dropped afterwards

- [ ] **Step 1: Add the dependency**

Run: `pnpm add fflate`
Expected: `fflate` appears in `dependencies`.

- [ ] **Step 2: Add types and the API client**

Append to `src/client/types.ts`:

```ts
export type BookOrderIssueCode =
  | 'SPACE_ID_MISSING'
  | 'SPACE_NOT_FOUND'
  | 'RANGE_INVALID'
  | 'RANGE_SIZE'
  | 'COVER_COLOR_MISSING'
  | 'INCONSISTENT_ROWS'
  | 'NO_ANSWERED_CARDS'
  | 'PAID_COUNT_MISMATCH'
  | 'UNANSWERED_DROPPED'
  | 'RANGE_CLAMPED'
  | 'DUPLICATE_SPACE'
  | 'SPACE_PENDING_DELETION';

export type BookOrderLevel = 'ok' | 'warning' | 'error';

export type BookOrderIssue = {
  code: BookOrderIssueCode;
  message: string;
};

export type BookOrderValidation = {
  orderNo: string;
  orderedAt: string;
  spaceId: string;
  rangeRaw: string;
  startOrder: number | null;
  endOrder: number | null;
  exportEnd: number | null;
  paidQuestionCount: number | null;
  answeredCount: number;
  coverColor: string;
  paidInner: string;
  spaceName: string;
  locale: string;
  level: BookOrderLevel;
  issues: BookOrderIssue[];
};

export type BookOrderValidationResult = {
  orders: BookOrderValidation[];
};

export type BookExportRequestOrder = {
  orderNo: string;
  spaceId: string;
  startOrder: number;
  endOrder: number;
  coverColor: string;
  paidInner: string;
};

export type BookExportBook = {
  orderNo: string;
  coverColor: string;
  paidInner: string;
  cover: {
    spaceName: string;
    startOrder: number;
    endOrder: number;
    count: number;
    generatedAt: string;
    locale: string;
  };
  cards: { order: number; question: string; date: string; answers: { nickname: string; content: string }[] }[];
};

export type BookExportRejectedOrder = {
  orderNo: string;
  issues: BookOrderIssue[];
};

export type BookExportBooksResult = {
  books: BookExportBook[];
  rejected: BookExportRejectedOrder[];
};
```

`src/client/book-export.ts`:

```ts
import client from './@base';
import { BookExportBooksResult, BookExportRequestOrder, BookOrderValidationResult } from './types';

export async function validateBookOrders(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await client.post<BookOrderValidationResult>('/book-export/validate', formData);

  return res.data;
}

export async function getBookExportBooks(orders: BookExportRequestOrder[]) {
  const res = await client.post<BookExportBooksResult>('/book-export/books', { orders });

  return res.data;
}
```

- [ ] **Step 3: Write the failing helper tests**

`src/components/page/book-export/services/book-export-download.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BookOrderValidation } from '../../../../client/types';
import {
  BOOKS_PER_REQUEST,
  buildBookZipName,
  chunkItems,
  countOrdersByLevel,
  isSelectableOrder,
  toBookExportRequest,
} from './book-export-download';

function buildOrder(overrides: Partial<BookOrderValidation> = {}): BookOrderValidation {
  return {
    orderNo: 'A-1',
    orderedAt: '',
    spaceId: 'ABCD1234',
    rangeRaw: '1-30',
    startOrder: 1,
    endOrder: 30,
    exportEnd: 30,
    paidQuestionCount: null,
    answeredCount: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
    spaceName: '우리',
    locale: 'ko',
    level: 'ok',
    issues: [],
    ...overrides,
  };
}

test('chunks 21 orders into 20 + 1 and keeps every item exactly once', () => {
  const items = Array.from({ length: 21 }, (_, i) => i);
  const chunks = chunkItems(items, BOOKS_PER_REQUEST);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [20, 1]);
  assert.deepEqual(chunks.flat(), items);
});

test('chunks an empty list into no requests', () => {
  assert.deepEqual(chunkItems([], BOOKS_PER_REQUEST), []);
});

test('only ok and warning orders are selectable', () => {
  assert.equal(isSelectableOrder(buildOrder({ level: 'ok' })), true);
  assert.equal(isSelectableOrder(buildOrder({ level: 'warning' })), true);
  assert.equal(isSelectableOrder(buildOrder({ level: 'error' })), false);
});

test('builds the books request from the requested (not trimmed) range', () => {
  assert.deepEqual(toBookExportRequest(buildOrder({ exportEnd: 28 })), {
    orderNo: 'A-1',
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
  });
});

test('refuses to build a request for an order without a parsed range', () => {
  assert.throws(() => toBookExportRequest(buildOrder({ startOrder: null })));
});

test('counts orders per level', () => {
  const orders = [buildOrder(), buildOrder({ level: 'warning' }), buildOrder({ level: 'error' }), buildOrder({ level: 'error' })];
  assert.deepEqual(countOrdersByLevel(orders), { all: 4, ok: 1, warning: 1, error: 2 });
});

test('names the zip with local date and time', () => {
  assert.equal(buildBookZipName(new Date(2026, 8, 30, 9, 5)), 'mindbridge-books-20260930-0905.zip');
});
```

`src/components/page/book-export/services/book-zip-writer.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { strFromU8, unzipSync } from 'fflate';

import type { BookExportBook } from '../../../../client/types';
import { createBookZipWriter, toZipEntryName } from './book-zip-writer';

const BOOK: BookExportBook = {
  orderNo: '20260930-0000024',
  coverColor: '브라운',
  paidInner: '선택 안함',
  cover: { spaceName: '우리 가족', startOrder: 1, endOrder: 1, count: 1, generatedAt: '2026-09-30', locale: 'ko' },
  cards: [{ order: 1, question: '질문', date: '2026-09-01', answers: [{ nickname: '엄마', content: '답변 "따옴표"' }] }],
};

test('writes one {orderNo}.json per book across several adds, with UTF-8 content that round-trips', async () => {
  const writer = await createBookZipWriter();
  writer.add([BOOK]);
  writer.add([{ ...BOOK, orderNo: '20260930-0000025' }]);
  const blob = await writer.finish();
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.deepEqual(Object.keys(files).sort(), ['20260930-0000024.json', '20260930-0000025.json']);
  assert.deepEqual(JSON.parse(strFromU8(files['20260930-0000024.json'])), BOOK);
});

test('produces a valid empty zip when nothing was added', async () => {
  const writer = await createBookZipWriter();
  const blob = await writer.finish();
  assert.deepEqual(unzipSync(new Uint8Array(await blob.arrayBuffer())), {});
});

test('keeps order numbers as file names but neutralizes path characters', () => {
  assert.equal(toZipEntryName('20260930-0000024'), '20260930-0000024.json');
  assert.equal(toZipEntryName('../a/b c'), '___a_b_c.json');
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot find `./book-export-download` and `./book-zip-writer`.

- [ ] **Step 5: Implement the helpers**

`src/components/page/book-export/services/book-export-download.ts`:

```ts
import dayjs from 'dayjs';

import type { BookExportRequestOrder, BookOrderLevel, BookOrderValidation } from '../../../../client/types';

export const BOOKS_PER_REQUEST = 20;

export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export function isSelectableOrder(order: BookOrderValidation): boolean {
  return order.level !== 'error';
}

// Sends the requested range; the server re-validates and applies the clamp/trim itself.
export function toBookExportRequest(order: BookOrderValidation): BookExportRequestOrder {
  if (order.startOrder === null || order.endOrder === null) {
    throw new Error(`주문 ${order.orderNo}의 질문 범위가 없습니다.`);
  }
  return {
    orderNo: order.orderNo,
    spaceId: order.spaceId,
    startOrder: order.startOrder,
    endOrder: order.endOrder,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
  };
}

export function countOrdersByLevel(orders: BookOrderValidation[]): Record<'all' | BookOrderLevel, number> {
  const counts = { all: orders.length, ok: 0, warning: 0, error: 0 };
  orders.forEach((order) => {
    counts[order.level] += 1;
  });
  return counts;
}

export function buildBookZipName(now: Date): string {
  return `mindbridge-books-${dayjs(now).format('YYYYMMDD-HHmm')}.zip`;
}
```

`src/components/page/book-export/services/book-zip-writer.ts`:

```ts
import type { BookExportBook } from '../../../../client/types';

export function toZipEntryName(orderNo: string): string {
  return `${orderNo.replace(/[^0-9A-Za-z_-]/g, '_')}.json`;
}

// Streams books into the zip as each server chunk arrives, so the page never holds every book
// object at once and compression is spread across chunks. fflate is loaded only on download.
export async function createBookZipWriter() {
  const { Zip, ZipDeflate, strToU8 } = await import('fflate');
  const parts: Uint8Array[] = [];
  let failure: Error | null = null;
  let resolveDone: (blob: Blob) => void = () => undefined;
  let rejectDone: (err: Error) => void = () => undefined;
  const done = new Promise<Blob>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      failure = err;
      rejectDone(err);
      return;
    }
    parts.push(chunk);
    if (final) resolveDone(new Blob(parts as BlobPart[], { type: 'application/zip' }));
  });
  return {
    add(books: BookExportBook[]) {
      if (failure) throw failure;
      books.forEach((book) => {
        const entry = new ZipDeflate(toZipEntryName(book.orderNo), { level: 6 });
        zip.add(entry);
        entry.push(strToU8(JSON.stringify(book, null, 2)), true);
      });
    },
    finish() {
      zip.end();
      return done;
    },
  };
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm test && npx tsc --noEmit`
Expected: all node tests PASS (existing + 10 new); tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/client/types.ts src/client/book-export.ts src/components/page/book-export/services
git commit -m "feat(book-export): add admin client, types, and zip helpers"
```

---

## Task 10: Book export side sheet on the PDF export page (frontend)

**Files:**
- Create: `src/components/page/book-export/BookExportStatusBadge.tsx`
- Create: `src/components/page/book-export/BookExportResultColumns.tsx`
- Create: `src/components/page/book-export/BookExportPanel.tsx`
- Modify: `src/components/page/pdf-export/PdfExportManager.tsx`

**Interfaces:**
- Consumes: Task 9 client, types, and helpers; `CardUploader` (`src/components/page/card/CardUploader.tsx`), `DataTable`, `AdminSideSheetContent`, `Sheet`, `Badge`, `Checkbox`, `Button`, `errorMessage` (`src/components/page/coupon/errorMessage.ts`).
- Produces: `BookExportPanel` with props `{ onBusyChange: (isBusy: boolean) => void }`.

- [ ] **Step 1: Status badge**

`src/components/page/book-export/BookExportStatusBadge.tsx`:

```tsx
import type { BookOrderLevel } from '@/client/types';
import { Badge } from '@/components/ui/badge';

const LEVEL_META: Record<BookOrderLevel, { label: string; variant: 'dotSuccess' | 'dotWarning' | 'dotDanger' }> = {
  ok: { label: '정상', variant: 'dotSuccess' },
  warning: { label: '확인 필요', variant: 'dotWarning' },
  error: { label: '추출 불가', variant: 'dotDanger' },
};

export const BOOK_ORDER_LEVEL_LABEL: Record<BookOrderLevel, string> = {
  ok: LEVEL_META.ok.label,
  warning: LEVEL_META.warning.label,
  error: LEVEL_META.error.label,
};

function BookExportStatusBadge({ level }: { level: BookOrderLevel }) {
  const meta = LEVEL_META[level];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export default BookExportStatusBadge;
```

- [ ] **Step 2: Result columns**

`src/components/page/book-export/BookExportResultColumns.tsx`:

```tsx
import type { BookOrderValidation } from '@/client/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';
import BookExportStatusBadge from './BookExportStatusBadge';
import { isSelectableOrder } from './services/book-export-download';

export interface BookExportSelectionProps {
  selected: Set<string>;
  selectableCount: number;
  onToggle: (orderNo: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}

export const createBookExportResultColumns = (selection: BookExportSelectionProps): ColumnDef<BookOrderValidation>[] => [
  {
    id: 'select',
    size: 40,
    header: () => (
      <Checkbox
        aria-label='추출 가능한 주문 전체 선택'
        checked={selection.selectableCount > 0 && selection.selected.size === selection.selectableCount}
        disabled={selection.selectableCount === 0}
        onCheckedChange={(checked) => selection.onToggleAll(checked === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`${row.original.orderNo} 선택`}
        checked={selection.selected.has(row.original.orderNo)}
        disabled={!isSelectableOrder(row.original)}
        onCheckedChange={(checked) => selection.onToggle(row.original.orderNo, checked === true)}
      />
    ),
  },
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
        <div className='truncate font-mono text-xs text-muted-foreground'>{row.original.spaceId || '(비어 있음)'}</div>
      </div>
    ),
  },
  {
    id: 'range',
    header: '범위',
    size: 130,
    cell: ({ row }) => (
      <div className='tabular-nums'>
        <div className='text-foreground'>{row.original.rangeRaw || '-'}</div>
        {row.original.startOrder !== null && row.original.exportEnd !== null ? (
          <div className='text-xs text-muted-foreground'>
            수록 {row.original.startOrder}~{row.original.exportEnd}
          </div>
        ) : null}
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
    size: 260,
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
];
```

- [ ] **Step 3: Panel (upload → results → download)**

`src/components/page/book-export/BookExportPanel.tsx`:

```tsx
import { getBookExportBooks, validateBookOrders } from '@/client/book-export';
import type {
  BookExportBooksResult,
  BookExportRejectedOrder,
  BookExportRequestOrder,
  BookOrderLevel,
  BookOrderValidation,
} from '@/client/types';
import { CardUploader } from '@/components/page/card/CardUploader';
import { errorMessage } from '@/components/page/coupon/errorMessage';
import DataTable from '@/components/shared/ui/data-table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BOOK_ORDER_LEVEL_LABEL } from './BookExportStatusBadge';
import { createBookExportResultColumns } from './BookExportResultColumns';
import {
  BOOKS_PER_REQUEST,
  buildBookZipName,
  chunkItems,
  countOrdersByLevel,
  isSelectableOrder,
  toBookExportRequest,
} from './services/book-export-download';
import { createBookZipWriter } from './services/book-zip-writer';

type LevelFilter = 'all' | BookOrderLevel;

const FILTERS: { key: LevelFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'ok', label: BOOK_ORDER_LEVEL_LABEL.ok },
  { key: 'warning', label: BOOK_ORDER_LEVEL_LABEL.warning },
  { key: 'error', label: BOOK_ORDER_LEVEL_LABEL.error },
];

type Props = {
  onBusyChange: (isBusy: boolean) => void;
};

const REVOKE_DELAY_MS = 60_000;

function saveZip(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoking right away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

// One retry per chunk: a transient failure late in a long run should not throw away finished chunks.
async function fetchBooksWithRetry(chunk: BookExportRequestOrder[]): Promise<BookExportBooksResult> {
  try {
    return await getBookExportBooks(chunk);
  } catch {
    return getBookExportBooks(chunk);
  }
}

function BookExportPanel({ onBusyChange }: Props) {
  const [orders, setOrders] = useState<BookOrderValidation[] | null>(null);
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [rejected, setRejected] = useState<BookExportRejectedOrder[]>([]);
  // Ignores a validation response that arrives after a newer upload started.
  const latestValidation = useRef(0);

  const selectable = useMemo(() => (orders ?? []).filter(isSelectableOrder), [orders]);
  const counts = useMemo(() => countOrdersByLevel(orders ?? []), [orders]);
  const visible = useMemo(
    () => (orders ?? []).filter((order) => filter === 'all' || order.level === filter),
    [orders, filter],
  );

  const validate = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const requestId = latestValidation.current + 1;
    latestValidation.current = requestId;
    setIsValidating(true);
    setRejected([]);
    try {
      const result = await validateBookOrders(file);
      if (requestId !== latestValidation.current) return;
      setOrders(result.orders);
      setFilter('all');
      setSelected(new Set(result.orders.filter(isSelectableOrder).map((order) => order.orderNo)));
    } catch (err) {
      if (requestId !== latestValidation.current) return;
      setOrders(null);
      setSelected(new Set());
      toast.error(errorMessage(err));
    }
    setIsValidating(false);
  };

  const download = async () => {
    const targets = selectable.filter((order) => selected.has(order.orderNo)).map(toBookExportRequest);
    if (targets.length === 0) return;
    onBusyChange(true);
    setProgress({ done: 0, total: targets.length });
    setRejected([]);
    try {
      const writer = await createBookZipWriter();
      const rejectedOrders: BookExportRejectedOrder[] = [];
      let bookCount = 0;
      for (const chunk of chunkItems(targets, BOOKS_PER_REQUEST)) {
        const result = await fetchBooksWithRetry(chunk);
        writer.add(result.books);
        bookCount += result.books.length;
        rejectedOrders.push(...result.rejected);
        setProgress((prev) => (prev ? { ...prev, done: prev.done + chunk.length } : prev));
      }
      const zip = await writer.finish();
      setRejected(rejectedOrders);
      if (bookCount === 0) {
        toast.warning('추출할 수 있는 주문이 없습니다.');
      } else {
        saveZip(zip, buildBookZipName(new Date()));
        toast.success(`${bookCount}건을 zip으로 내려받았습니다.`);
      }
    } catch (err) {
      toast.error(`다운로드를 중단했습니다. ${errorMessage(err)}`);
    }
    setProgress(null);
    onBusyChange(false);
  };

  const columns = createBookExportResultColumns({
    selected,
    selectableCount: selectable.length,
    onToggle: (orderNo, checked) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) next.add(orderNo);
        else next.delete(orderNo);
        return next;
      }),
    onToggleAll: (checked) => setSelected(checked ? new Set(selectable.map((order) => order.orderNo)) : new Set()),
  });

  const isDownloading = progress !== null;
  const isBusy = isValidating || isDownloading;

  return (
    <>
      <div className='space-y-4 pb-4'>
        {/* CardUploader has no disabled prop; block it while a validation or download is running. */}
        <div aria-busy={isBusy} className={isBusy ? 'pointer-events-none opacity-50' : undefined}>
          <CardUploader setFile={validate} accept='.csv,.xlsx' />
        </div>
        {isValidating ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            주문을 확인하고 있습니다.
          </p>
        ) : null}

        {orders ? (
          <>
            <div className='flex flex-wrap gap-2'>
              {FILTERS.map((item) => (
                <Button
                  key={item.key}
                  type='button'
                  size='sm'
                  variant={filter === item.key ? 'secondary' : 'ghost'}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label} <span className='tabular-nums'>{counts[item.key]}</span>
                </Button>
              ))}
            </div>
            <DataTable columns={columns} data={visible} rowKey='orderNo' />
          </>
        ) : null}

        {rejected.length > 0 ? (
          <div className='rounded-md border border-border p-3'>
            <p className='text-sm font-medium text-foreground'>다운로드 시점에 제외된 주문 {rejected.length}건</p>
            <ul className='mt-2 space-y-1'>
              {rejected.map((item) => (
                <li key={item.orderNo} className='text-xs text-muted-foreground'>
                  <span className='font-mono'>{item.orderNo}</span> {item.issues.map((issue) => issue.message).join(' ')}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {orders ? (
        <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <div className='flex items-center justify-end gap-3'>
            {isDownloading ? (
              <span className='text-sm tabular-nums text-muted-foreground'>
                {progress.done} / {progress.total}건 처리 중
              </span>
            ) : null}
            <Button type='button' onClick={download} disabled={isDownloading || selected.size === 0}>
              {isDownloading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
              선택 {selected.size}건 zip 다운로드
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default BookExportPanel;
```

Notes for the implementer:
- `CardUploader` already calls `setFile([])` when cleared; `validate` ignores that.
- Selection holds only selectable order numbers (errors are never added), so `selected.size` is the download count.
- A chunk is retried once; a second failure aborts the whole download (no partial zip), per spec §4.
- The uploader is inert while validating or downloading, and a stale validation response is ignored.

- [ ] **Step 4: Button and sheet on `PdfExportManager`**

Replace `src/components/page/pdf-export/PdfExportManager.tsx` with:

```tsx
import BookExportPanel from '@/components/page/book-export/BookExportPanel';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import PdfExportHistoryTab from './PdfExportHistoryTab';
import PdfExportPolicyTab from './PdfExportPolicyTab';

function PdfExportManager() {
  const [isBookSheetOpen, setIsBookSheetOpen] = useState(false);
  const [isBookExportBusy, setIsBookExportBusy] = useState(false);

  return (
    <>
      <Tabs defaultValue='history' className='space-y-4'>
        <div className='flex items-center justify-between gap-2'>
          <TabsList>
            <TabsTrigger value='history'>발급 이력</TabsTrigger>
            <TabsTrigger value='policy'>정책 설정</TabsTrigger>
          </TabsList>
          <Button type='button' variant='outline' onClick={() => setIsBookSheetOpen(true)}>
            <BookOpen className='h-4 w-4' />
            책 제작 데이터 추출
          </Button>
        </div>
        <TabsContent value='history'>
          <PdfExportHistoryTab />
        </TabsContent>
        <TabsContent value='policy'>
          <PdfExportPolicyTab />
        </TabsContent>
      </Tabs>

      <Sheet
        open={isBookSheetOpen}
        onOpenChange={(open) => {
          // Closing mid-download would unmount the panel and drop the zip being built.
          if (!open && isBookExportBusy) {
            toast.info('다운로드가 끝나면 닫을 수 있습니다.');
            return;
          }
          setIsBookSheetOpen(open);
        }}
      >
        <AdminSideSheetContent
          title='책 제작 데이터 추출'
          description='카페24 발주서(csv, xlsx)를 올려 주문별로 추출 가능 여부를 확인하고, 제본소에 넘길 zip을 내려받습니다.'
          size='xl'
        >
          <BookExportPanel onBusyChange={setIsBookExportBusy} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default PdfExportManager;
```

- [ ] **Step 5: Static checks**

Run: `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected: tsc exits 0; lint has no errors in the new/changed files; node tests PASS; build succeeds.

- [ ] **Step 6: Manual QA (backend from Task 8 running locally)**

1. `pnpm dev`, open `http://localhost:4000/pdf-export`, click `책 제작 데이터 추출` → a 1200px sheet opens.
2. Upload `/Users/gargoyle92/Downloads/prest201_20260930_8_27e1.csv` → one row `20260930-0000024`, space `DSDFSDF`, badge `추출 불가`, messages `존재하지 않는 공간 ID입니다.` and `결제한 질문 수와 질문 범위가 다릅니다.` (the sample's 질문 개수 row has 수량 1); checkbox disabled; download button disabled.
3. Copy the CSV, replace `dsdfsdf` with a real dev space ID that has 30+ answered cards and the range with one inside it; upload → `정상` or `확인 필요`, preselected.
4. Click `선택 1건 zip 다운로드` → progress shows, a `mindbridge-books-YYYYMMDD-HHmm.zip` downloads; unzip → `20260930-0000024.json` with `coverColor`, `paidInner`, `cover`, `cards`; compare `cards` with the in-app PDF for the same range.
5. During a download, pressing Esc or the overlay does not close the sheet and shows `다운로드가 끝나면 닫을 수 있습니다.`; the upload area is inert.
6. Upload a `.txt` file, a `.csv` renamed to `.xlsx`, and the CSV re-saved from Excel as CP949 → each shows a Korean error toast (never "Internal Server Error"); results stay empty.

- [ ] **Step 7: Commit**

```bash
git add src/components/page/book-export src/components/page/pdf-export/PdfExportManager.tsx
git commit -m "feat(book-export): add book export side sheet to the PDF export page"
```
