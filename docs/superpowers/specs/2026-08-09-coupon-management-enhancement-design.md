# Coupon Management Enhancement — Design

- **Date**: 2026-08-09
- **Status**: Approved (brainstorm)
- **Repos**: `mindqna-admin` (frontend), `mindqna-server` (backend)
- **Migration**: manual SQL, applied by the operator (not `prisma migrate`)

## 1. Problem & Goal

Coupons today are single-use only. `createCoupon` loops `count` times and inserts one `Coupon` row per iteration, each with a random 10-character `nanoid` code. `CouponMeta.couponId` is `@unique`, so exactly one person can ever redeem a given code. There is no start date — a coupon is live the moment it is created — and the admin cannot choose the code string.

Operationally this blocks the common promotion shape: **one memorable code (`SUMMER2026`) that many users redeem**, prepared in advance and opening on a set date.

The admin UI has separate problems. The `heart` column header reads **히트** (typo for 하트), the `code` header is raw lowercase English, numeric reward values are wrapped in `soft*` badges that DESIGN.md reserves for categories, and a bulk issuance of 100 codes floods the list with 100 near-identical rows across 10 pages with no way to see "how many of these 100 were used".

**Goal**: support both individual-code and shared-code promotions, let the admin schedule and name codes, and rebuild the admin list and form around the batch as the unit of work.

### In scope

- `Coupon`: `batchId`, `issueMode`, `startAt`, `maxUseCount`, `useCount`.
- `CouponMeta`: replace `couponId @unique` with `@@unique([couponId, userId])`.
- Admin API: batch-grouped list, per-batch code list, mode-aware create, locked-field update, partial delete, stop.
- App redemption path: start-date check, capacity check, race-free capacity guard.
- Transaction correctness fix on the redemption path (see §4.5).
- Admin UI: list rebuild, side panel rebuild, header typo fixes, bulk code copy.

### Out of scope (YAGNI)

- Per-user redemption limits beyond "once per user per code".
- Coupon usage analytics, charts, or revenue attribution.
- CSV export (clipboard copy covers the retrieval need).
- Dedicated app-facing error codes for "not started" / "exhausted" — existing codes are reused so no app release is required (see §4.6).
- An `isActive` flag — "stop" is expressed by setting `dueAt` to now.
- Retroactive merging of the two issue modes into a single unified promotion entity.

## 2. Decisions

These were settled during brainstorming and are load-bearing for everything below.

### 2.1 Two issue modes, not two overlapping quantity fields

Adding "max uses" alongside the existing "issue count" creates two routes to the same outcome (100 codes × 1 use vs. 1 code × 100 uses), and a custom code is incompatible with `count > 1` because `code` is unique. Rather than exposing both numbers and letting the admin combine them into nonsense, the form asks for the **mode** first and then shows only that mode's fields.

| Mode | Codes created | `maxUseCount` | Code source |
|---|---|---|---|
| `INDIVIDUAL` | `count` (1–1000) | forced to `1` | always random |
| `SHARED` | exactly 1 | admin-supplied, `0` = unlimited | admin-supplied, random if blank |

The stored model is identical for both — a mode is just a particular `(code count, maxUseCount)` shape. Only the creation form and the server-side normalization branch.

### 2.2 The batch is the unit of the list

A single issuance gets one `batchId` (UUID). The list shows one row per batch with aggregate usage, and expanding a row lazily loads its codes.

### 2.3 Post-issuance edits are restricted once someone has redeemed

With zero redemptions every field is editable. Once `usedCount > 0`:

| | Fields |
|---|---|
| Editable | `name`, `dueAt`, `maxUseCount` (increase only), `startAt` (only while still in the future) |
| Locked | `heart`, `star`, `ticketCount`, `ticketDueDayNum`, `code`, `issueMode`, code count |
| Delete | unused codes only; redeemed codes are retained for history |

Rationale: extending a running promotion is a real operational need; retroactively changing what a coupon granted means two users redeem "the same" coupon for different amounts, which makes CS impossible to answer.

### 2.4 Denormalized batch fields (approach A), not a `CouponBatch` table

`batchId` is added to `Coupon`; `name`, dates, and rewards stay duplicated on every row of the batch.

The alternative — extracting a `CouponBatch` table — is the more normalized model, but it moves the reward fields off `Coupon` and therefore requires rewriting `validateCoupon` / `useCoupon`, the live redemption path, plus a two-table data migration. The real load on this feature is redemption, not batch editing. Approach A leaves redemption nearly untouched; a batch edit becomes a single `UPDATE ... WHERE batchId = ?`, which is a write cost, not a consistency risk.

Grouping by `name + createdAt` with no stored key was rejected: issuing the same name twice would merge unrelated batches.

## 3. Data Model

### 3.1 Prisma schema

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
  maxUseCount     Int             @default(1)   // 0 = unlimited
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
  username  String
  createdAt DateTime @default(now())

  @@unique([couponId, userId])
}
```

`maxUseCount = 0` means unlimited, matching the existing `ticketDueDayNum = 0` → lifetime convention already in this schema.

`useCount` is denormalized deliberately. Deriving capacity from `COUNT(CouponMeta)` cannot be checked and incremented atomically without explicit locking; a counter column can (see §4.4).

### 3.2 Migration SQL

Run against dev first. Verify the existing unique index name before step 4 — Prisma's default is `CouponMeta_couponId_key` but confirm:

```sql
SHOW INDEX FROM `CouponMeta`;
```

```sql
-- 1) Add columns. batchId and startAt keep defaults so the currently deployed
--    backend can still INSERT during the window between SQL and deploy.
ALTER TABLE `Coupon`
  ADD COLUMN `batchId`     VARCHAR(36) NOT NULL DEFAULT '',
  ADD COLUMN `issueMode`   ENUM('INDIVIDUAL','SHARED') NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN `startAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `maxUseCount` INT NOT NULL DEFAULT 1,
  ADD COLUMN `useCount`    INT NOT NULL DEFAULT 0;

-- 2) Backfill startAt for existing rows to their creation time.
UPDATE `Coupon` SET `startAt` = `createdAt`;

-- 3) Backfill useCount from existing redemption history.
UPDATE `Coupon` c
   SET c.`useCount` = (SELECT COUNT(*) FROM `CouponMeta` m WHERE m.`couponId` = c.`id`);

-- 4) Backfill batchId by grouping historical issuances on (name, creation minute).
UPDATE `Coupon` c
  JOIN (
    SELECT `name`,
           DATE_FORMAT(`createdAt`, '%Y-%m-%d %H:%i') AS bucket,
           UUID() AS newId
      FROM `Coupon`
     GROUP BY `name`, bucket
  ) g
    ON g.`name` = c.`name`
   AND g.bucket = DATE_FORMAT(c.`createdAt`, '%Y-%m-%d %H:%i')
   SET c.`batchId` = g.newId;

CREATE INDEX `Coupon_batchId_idx` ON `Coupon`(`batchId`);

-- 5) Replace the CouponMeta unique constraint.
ALTER TABLE `CouponMeta` DROP INDEX `CouponMeta_couponId_key`;
ALTER TABLE `CouponMeta`
  ADD UNIQUE INDEX `CouponMeta_couponId_userId_key` (`couponId`, `userId`);
```

**After the backend is deployed**, drop the temporary default:

```sql
ALTER TABLE `Coupon` ALTER COLUMN `batchId` DROP DEFAULT;
```

`startAt`'s default is permanent and matches `@default(now())`.

#### Backfill preview

Run before step 4 to see how historical rows will collapse and whether any name reuse merges unrelated issuances:

```sql
SELECT `name`,
       DATE_FORMAT(`createdAt`, '%Y-%m-%d %H:%i') AS bucket,
       COUNT(*) AS codes,
       MIN(`createdAt`) AS first_at,
       MAX(`createdAt`) AS last_at
  FROM `Coupon`
 GROUP BY `name`, bucket
 ORDER BY first_at DESC;
```

A bulk loop that crossed a minute boundary splits into two batches; the same name issued twice within one minute merges. Both are display-level only and do not affect redemption.

## 4. Backend (`mindqna-server`)

### 4.1 List — batch aggregation

`GET /coupon?page=&search=&status=` returns batch rows, not code rows.

```ts
type CouponBatchItem = {
  batchId: string;
  name: string;
  issueMode: 'INDIVIDUAL' | 'SHARED';
  code: string | null;       // SHARED: the code; INDIVIDUAL: null
  codeCount: number;         // COUNT(*)
  usedCount: number;         // SUM(useCount)
  capacity: number;          // INDIVIDUAL: codeCount; SHARED: maxUseCount. 0 = unlimited
  status: 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
  startAt: string;
  dueAt: string;
  createdAt: string;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};
```

The server resolves `capacity` so the frontend never branches on mode.

`status` is computed server-side in this order — the order matters because an expired batch can also be full, and "expired" is the more accurate thing to tell an admin:

```
now > dueAt                            → EXPIRED
now < startAt                          → SCHEDULED
capacity > 0 && usedCount >= capacity  → EXHAUSTED
otherwise                              → ACTIVE
```

Implemented with `$queryRaw` — `GROUP BY batchId` with the aggregates above is beyond what Prisma's `groupBy` can return here. **All user input must be bound via the `Prisma.sql` tagged template; never string-concatenate into the query.** This is the first place in this repo where user input reaches raw SQL.

Search matches coupon name, code, or redeeming username, and returns the **entire batch** any matched code belongs to. `status` is an optional filter applied to the computed status. Because the status is derived rather than stored, the filter's `WHERE` clause must reproduce the derivation above **including its precedence order** — a filter that checks capacity before expiry would classify rows differently from the column the admin is reading. Derive it once in a shared SQL fragment used by both the projection and the filter.

Pagination stays at 10 per page, now counted in batches.

### 4.2 Code list — expansion

`GET /coupon/batch/:batchId/codes?page=` — called only when a row is expanded. One response shape serves both modes:

```ts
type CouponCodeItem = {
  codeId: number;
  code: string;
  username: string | null;   // null = not yet redeemed
  usedAt: string | null;
};
```

- `INDIVIDUAL`: one row per code; `username` is null when unused.
- `SHARED`: one row per redemption (the code repeats). Remaining capacity is conveyed by the batch header's `12 / 100`.

20 per page.

A `?all=true` variant (or an equivalent endpoint) returns every code string for the batch, capped at the 1000-code issuance limit, to back the clipboard copy action in §5.4.

### 4.3 Create

```ts
POST /coupon
{
  name: string;
  issueMode: 'INDIVIDUAL' | 'SHARED';
  startAt: string;
  dueAt: string;
  count?: number;         // INDIVIDUAL only
  code?: string;          // SHARED only; random if omitted
  maxUseCount?: number;   // SHARED only; 0 = unlimited
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
}
```

The server normalizes by mode before validating: `INDIVIDUAL` forces `maxUseCount = 1` and ignores `code`; `SHARED` forces `count = 1`. A malformed client cannot produce incoherent rows.

Validation:

| Field | Rule |
|---|---|
| `count` | integer 1–1000. **No upper bound exists today** |
| `code` | `^[A-Za-z0-9_-]{4,32}$`, normalized to uppercase, then checked for collision |
| dates | `startAt <= dueAt`; `startAt` → start of day, `dueAt` → end of day |
| `maxUseCount` | integer `>= 0` |
| rewards | reject when `heart`, `star`, and `ticketCount` are all 0 |

MySQL's default collation is case-insensitive, so `SUMMER2026` and `summer2026` already collide on the unique index and resolve to the same row at redemption. Uppercase normalization is for display consistency, not correctness.

Issuance replaces the current sequential loop: generate all codes up front, check them against existing codes in one `findMany({ where: { code: { in: [...] } } })`, regenerate only the collisions, then a single `createMany` inside a transaction. All rows land or none do. The current loop leaves a partial batch behind if it fails midway, and makes 1000 round trips for 1000 codes.

### 4.4 Update, delete, stop

Locked-field rules from §2.3 are **enforced server-side**. The UI disabling a field is guidance; the API is the boundary.

| Route | Behaviour |
|---|---|
| `PUT /coupon/batch/:batchId` | Rejects reward / code / mode changes when `usedCount > 0`. `startAt` editable only while `now < startAt`. `maxUseCount` is editable for `SHARED` batches only — it is structurally fixed at 1 for `INDIVIDUAL` — and cannot drop below the batch's current maximum `useCount`. Applies as one `UPDATE ... WHERE batchId = ?` |
| `DELETE /coupon/batch/:batchId` | Deletes only codes with `useCount = 0`; returns `{ deleted, kept }`. Redeemed codes are retained so `CouponMeta` never orphans |
| `POST /coupon/batch/:batchId/stop` | Sets `dueAt = now` across the batch, blocking further redemption immediately |

The existing `DELETE /coupon/:id` is removed; deletion is a batch operation now.

### 4.5 Redemption path

`validateCoupon` and `useCoupon` gain a start-date check and a capacity check.

Capacity cannot be checked with a `SELECT` — two concurrent redemptions would both pass and overfill the batch. The check and the increment are one statement:

```sql
UPDATE `Coupon`
   SET `useCount` = `useCount` + 1
 WHERE `id` = ? AND (`maxUseCount` = 0 OR `useCount` < `maxUseCount`)
```

**Zero affected rows means the capacity is full.** This runs first inside the transaction; grants happen only after it succeeds. `CouponMeta`'s `@@unique([couponId, userId])` catches the concurrent double-submit from a single user.

#### Transaction correctness fix

`chargeCoin` (premium.service.ts:1594) and `createPremiumTickets` (premium.service.ts:1486) each open **their own** `this.prisma.$transaction`. When called from inside `useCoupon`'s transaction they therefore run on a separate transaction, and the outer one cannot roll them back. Today, if `couponMeta.create` fails after coins were granted, the coins stay granted — and two concurrent redemptions by the same user can both pass the pre-check and both grant.

This is a pre-existing bug, but multi-use coupons widen the concurrency window that exposes it, so it is fixed here: both methods take an optional transaction-client parameter and use it instead of opening a new transaction when supplied. Only `useCoupon` passes it; the other six `chargeCoin` call sites are unchanged.

### 4.6 Error codes

Existing codes are reused so no app release is required:

- not yet started → `NotFoundException` (same treatment as expired)
- capacity exhausted → `AlreadyException`

Introducing new codes would surface as a generic error screen in the currently shipped app. Dedicated messages are a follow-up that ships with an app update.

## 5. Frontend (`mindqna-admin`)

### 5.1 Header corrections

| Current | Corrected | Reason |
|---|---|---|
| 히트 | 하트 | typo — the field is `heart` |
| code | 쿠폰 코드 | the only remaining lowercase-English header |
| 티켓 수 / 티켓 혜택 일 | 프리미엄 티켓 / 티켓 기간 | "혜택 일" does not read as a duration; render `0` as 평생 |
| 사용 | 사용자 | the cell holds a username, but the header reads like an action |

`CouponList.tsx:129` renders `<div> {row.original.username || '미사용'}</div>` with a leading space inside the element — removed.

### 5.2 List

Columns, batch-level:

| Column | Width | Content |
|---|---|---|
| expander | 40 | chevron |
| 쿠폰 | 220 | name in ink/500; below it the code (SHARED) or `코드 N개` (INDIVIDUAL) in mono caption |
| 모드 | 88 | `soft` badge — 개별 / 공용 |
| 보상 | 200 | lucide `Heart` / `Star` icon in rose / amber + neutral `tabular-nums` value; ticket line below |
| 사용 현황 | 140 | `37 / 100` in `tabular-nums` plus a 2px meter. When `capacity = 0`, renders `12 / 무제한` with no meter — there is no progress against an unbounded target |
| 기간 | 170 | `07.01 – 08.31`. Every coupon has a `dueAt`, so this is always a closed range |
| 상태 | 104 | `dot` badge |
| 발급일 | 120 | `createdAt` |
| 관리 | 80 | `TableRowActions`, sticky right |

Reward values lose their badges. DESIGN.md restricts `soft*` to categories and directs plain values to neutral text; commit `3c308f3` ("unwrap value badges") performed exactly this cleanup and missed the coupon module. Colour moves to the icon only, which is legitimate under DESIGN.md's "currency kind: heart = rose family, star = amber family" data-semantics rule.

The 2px usage meter is a new pattern not in DESIGN.md. It is justified: scanning twenty rows for progress from bare fractions is slow, and a hairline track with an ink fill introduces no new colour, radius, or elevation. It is a self-contained component so it can be dropped without touching anything else.

Status maps to existing `dot` variants: `SCHEDULED` → `dotInfo`, `ACTIVE` → `dotSuccess`, `EXHAUSTED` → `dotWarning`, `EXPIRED` → `dotNeutral`.

The `번호` (id) column is removed — an individual code's id is meaningless at batch level and admins do not act on it.

`FilterBar` gains a status `Select` (전체 / 진행중 / 예정 / 소진 / 만료) surfaced as a `FilterChips` entry when active. Search input and 추가 button are unchanged.

### 5.3 Row actions

수정 · 발급 중단 · 삭제. 발급 중단 is hidden for batches already expired. 삭제 goes through the existing `AlertDialog` and reports the `{ deleted, kept }` result — the admin must learn that redeemed codes were retained.

### 5.4 Expanded region

Uses `DataTable`'s `expandable` prop, which needs a one-line fix first: no module has ever used it, and TanStack resolves `row.getCanExpand()` from `subRows` when `getRowCanExpand` is absent, so the toggle handler is currently a no-op. `DataTable` must pass `getRowCanExpand: () => true` when `expandable` is supplied. The changed branch only activates for expandable tables, so the other 19 consumers are unaffected.

Lists codes per §4.2 with a **코드 전체 복사** button that writes every code newline-separated to the clipboard. Without it, issuing 100 individual codes leaves no way to retrieve them — the mode would be half-built.

### 5.5 Side panel

Three concrete defects in the current form: the 발급 수량 field is editable in edit mode but the backend ignores it; its helper text ("0 입력 시 시스템 정책에 따라 발급 처리됩니다") is false — `count = 0` silently creates nothing; and there is no way to confirm what is about to be issued.

Structure:

```
발급 방식        ◉ 개별 코드   ○ 공용 코드      (create only; read-only badge when editing)

기본 정보        쿠폰 이름*
                 발급 수량*                      (INDIVIDUAL)
                 쿠폰 코드 / 최대 이용 횟수* + 무제한 체크   (SHARED)

사용 기간        시작일 — 만료일
                 quick chips: 오늘부터 7일 / 30일 / 90일

보상             코인 종류 ◉하트 ○스타 + 수량
                 프리미엄 티켓 수량 + 기간(일), 0 = 평생

요약 카드        "SUMMER2026 · 공용 · 최대 100명
                  하트 500 + 프리미엄 30일
                  08.10 00:00 부터 09.30 23:59 까지"

sticky footer    [취소] [쿠폰 발급]
```

Choosing a mode leaves only that mode's fields, so "I typed a code but only got one" cannot occur.

The coin radio (하트 **or** 스타) is deliberately narrower than the API, which accepts a non-zero `heart` and `star` on the same coupon. Granting both currencies at once has no product use today and the existing form already works this way; the API stays permissive so the constraint lives in one place — the UI — and can be relaxed without a server change.

The summary card reads the entered values back as a sentence so the admin verifies without re-scanning the form.

In edit mode, locked fields are disabled and the section carries the reason: *"이미 12명이 사용한 쿠폰입니다. 보상과 코드는 변경할 수 없습니다."*

Existing `FormSection` / `FormGroup` / `AdminSideSheetContent` and the sticky footer are reused. The summary card is the only new component and is a plain hairline + `rounded.card` surface.

### 5.6 File layout

| File | Change |
|---|---|
| `src/client/coupon.ts` | types + API rewritten |
| `src/hooks/useCoupons.ts` | batch list |
| `src/hooks/useCouponBatchCodes.ts` | new — lazy expansion via `enabled` |
| `src/components/page/coupon/CouponColumns.tsx` | new — column defs extracted |
| `src/components/page/coupon/CouponStatusBadge.tsx` | new |
| `src/components/page/coupon/CouponUsageMeter.tsx` | new |
| `src/components/page/coupon/CouponCodeList.tsx` | new — expansion + copy |
| `src/components/page/coupon/CouponSummaryCard.tsx` | new |
| `src/components/page/coupon/CouponList.tsx` | slimmed to filters + table + sheets |
| `src/components/page/coupon/CouponForm.tsx` | rewritten |

Extracting column definitions follows the existing `PdfExportHistoryColumns.tsx` precedent. `CouponList.tsx` is currently 218 lines of which 87 are column definitions.

## 6. Testing

Backend uses the existing jest setup and `create-prisma-service.mock.ts` pattern already used by `product.service.spec.ts` (627 lines).

- create: `INDIVIDUAL` forces `maxUseCount = 1` and ignores `code`; `SHARED` forces `count = 1`
- create: a random code colliding with an existing one is regenerated, and `createMany` is still called once
- create: rejects `count` over the limit, all-zero rewards, and `startAt > dueAt`
- update: rejects reward and code changes when `usedCount > 0`; rejects lowering `maxUseCount` below current usage
- delete: retains redeemed codes and returns accurate `{ deleted, kept }`
- status: an expired **and** full batch resolves to `EXPIRED`
- redeem: blocked before `startAt`; zero affected rows from the guard raises; the same user cannot redeem twice

Concurrency itself cannot be proven against a mock. The conditional `UPDATE` is the guarantee, so a manual pre-deploy check on dev covers it: create a `SHARED` code with `maxUseCount = 1` and fire two simultaneous redemptions — exactly one must succeed.

Frontend has no test runner. Verification is `npx tsc --noEmit` (required — `next.config.js` sets `ignoreBuildErrors: true`) plus `npm run lint`, then manual review on the dev server.

## 7. Rollout

1. Apply migration SQL to **dev** (operator, manually). Do not drop the `batchId` default yet.
2. Deploy backend to dev; run the concurrency check from §6.
3. Deploy frontend to dev; review screens.
4. `ALTER TABLE Coupon ALTER COLUMN batchId DROP DEFAULT;`
5. Repeat 1–4 against production.

The app client is unchanged.

Commits are split per repo; the SQL ships as a file alongside the spec rather than as a `prisma migrate` artifact.

## 8. Risks

**The `CouponMeta` unique change is one-way.** Once multi-use redemptions accumulate, `couponId` can no longer be made unique again. Backend code can be rolled back; the schema cannot. Back up before applying to production.

**Raw SQL surface.** §4.1 introduces the first user-input-bearing raw query in this repo. Tagged-template binding is mandatory and should be verified in review.

**Denormalized batch fields.** A batch edit writes every row in the batch. At the 1000-code ceiling this is a single `UPDATE` over 1000 rows — acceptable, but it is the cost accepted in §2.4 and should not silently grow.
