# Admin Push Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin push schedulable, observable, and stoppable — move the send onto the batch server, replace topic broadcast with token multicast, and give `AdminPush` a state machine with a resumable cursor.

**Architecture:** `AdminPush` carries both the definition and the execution state (spec §2.2). A once-a-minute cron on `mindbridge-batch` claims one row with an optimistic `updateMany` guard, then loops batches of 500 users keyed on `User.id` until the cursor is exhausted, committing progress after every batch. All decision logic lives in three pure modules so it can be tested without Prisma or Firebase.

**Tech Stack:** NestJS 10 + Prisma (MySQL) + firebase-admin on the server, tested with jest (`*.spec.ts`). Next.js 13.4 pages router + TanStack Query v5 + shadcn/Radix on the admin, tested with Node's built-in `node:test` run through `tsx`.

**Spec:** `docs/superpowers/specs/2026-08-20-admin-push-redesign-design.md` (in the `mindqna-admin` repo). Read it before starting; this plan argues from it and does not restate its reasoning.

## Repositories

Two repos are involved. Every task names which one.

- **SERVER** — `~/Documents/backend/mindqna-server` (NestJS). Run one test file: `cd ~/Documents/backend/mindqna-server && npx jest <path>`
- **ADMIN** — `~/Documents/frontend/mindqna-admin` (Next.js). Run one test file: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test <path>` (Task 11 adds the script)

Commit in the repo the task touches. Never commit across both in one commit.

## Gates before every commit

The server's CI (`.github/workflows/ci.yml`) blocks on lint and build, not only on types and tests.
A task that passes `tsc` and `jest` can still fail the PR. Before committing:

**SERVER**
```bash
cd ~/Documents/backend/mindqna-server
npx tsc --noEmit -p tsconfig.json
npx jest                                     # once per task, not after every edit
npx eslint "{src,apps,libs,test}/**/*.ts"    # blocking in CI; prettier runs through it
yarn build
```

**ADMIN**
```bash
cd ~/Documents/frontend/mindqna-admin
npx tsc --noEmit
pnpm test
pnpm lint
```

`eslint` carries `prettier/prettier` as an error rule here, so formatting is a build failure, not a
preference. `npx eslint --fix <file>` resolves the formatting class of finding.

## Global Constraints

Exact values from the spec. Every task's requirements implicitly include this section.

- **Cron gate**: `process.env.NODE_ENV !== 'production' || process.env.NODE_APP_INSTANCE !== '0'` — identical for all twelve crons (§4.2).
- **Batch size**: 500 tokens. `sendEachForMulticast` rejects more (§1.1).
- **Grace window**: 1 hour. A `SCHEDULED` row whose `pushAt` is older goes to `FAILED` without sending (§4.3).
- **Consecutive batch failures before `FAILED`**: 3 (§4.3).
- **Batch concurrency**: env `ADMIN_PUSH_BATCH_CONCURRENCY`, default `1` (§2.7).
- **Per-batch FCM timeout**: 30000 ms. Mandatory — without it a hung call strands `isRunning` forever (§2.3).
- **Dead token codes**: exactly `messaging/registration-token-not-registered` and `messaging/invalid-argument`. All other failures increment `failedCount` but leave `fcmToken` alone (§4.3).
- **No `PushMeta`** is written by the admin push path, for either target (§2.6).
- **Field limits**: `title` ≤ 100, `message` ≤ 500, `userNames` 1..1000 entries (§4.5).
- **List page size**: 10, with `pageInfo.totalPage` (§4.7).
- **`locale`** is required for `target = 'ALL'` and stored `NULL` for `target = 'USER'` (§2.10).
- **Deletion** is allowed exactly when `sentCount === 0`, regardless of status (§2.4).
- **Link delivery**: the admin link travels as `data.deepLinkUrl` (§4.3).

## Migration prerequisite

The SQL in spec §3.2 is applied **by the operator, by hand**. Do not run `prisma migrate`. Task 5 edits `schema.prisma` to match what the SQL produces; the dev database must have §3.2 step 2 applied before any task is run against a live dev server. Tasks 2–4, 6, 7, 10 and all ADMIN tasks use fakes and need no database.

## File Structure

**SERVER**

| Path | Responsibility |
|---|---|
| `src/common/cron.const.ts` | The single gate expression all crons import |
| `src/fcm/admin-push/user-names.ts` | Comma string ↔ `string[]`, pure |
| `src/fcm/admin-push/fcm-response.ts` | Multicast response → counts + dead-token indexes, pure |
| `src/fcm/admin-push/admin-push-rules.ts` | Transitions, grace window, deletability, pure |
| `src/fcm/admin-push/admin-push-sender.ts` | The send loop. Takes prisma/messaging/clock as injected deps |
| `src/fcm/cron/fcm-admin.cron.ts` | Cron shell: gate, `isRunning`, delegate to the sender |
| `src/admin/push/push.service.ts` | CRUD and validation only. No FCM calls |
| `src/admin/push/types/push.types.ts` | Response and param types |
| `src/admin/admin.dto.ts` | `CreatePushDto` / `UpdatePushDto` |
| `src/admin/admin.controller.ts` | Push routes including the two new ones |
| `src/fcm/fcm.service.ts` | Only `sendPushToUsers` changes: 500-token chunking |
| `prisma/schema.prisma` | `AdminPush` fields, two enums, two indexes |

**ADMIN**

| Path | Responsibility |
|---|---|
| `package.json` | `tsx` devDependency and a `test` script |
| `src/client/push.ts` | HTTP surface and wire types |
| `src/hooks/usePushes.ts` | List query with conditional polling |
| `src/components/page/push/services/push-status.ts` | Status → label, badge variant, allowed actions |
| `src/components/page/push/services/push-progress.ts` | Percentage and remaining-time estimate |
| `src/components/page/push/services/push-form-payload.ts` | Form values → `CreatePushDto` |
| `src/components/page/push/PushStatusBadge.tsx` | Status badge |
| `src/components/page/push/PushProgressMeter.tsx` | Progress cell |
| `src/components/page/push/PushColumns.tsx` | Column definitions |
| `src/components/page/push/PushList.tsx` | List, filters, row actions, polling |
| `src/components/page/push/PushSummaryRail.tsx` | Compose-time summary / post-send result |
| `src/components/page/push/PushForm.tsx` | Side sheet form |
| `src/pages/marketing/push/new.tsx`, `src/pages/push/new.tsx` | Deleted |

---

### Task 1: Shared cron gate constant (SERVER)

The gate expression has been written wrong twice — a `NODE_NEV` typo and a `'staging'` regression. One constant removes the opportunity. **This task deliberately does not touch `fcm-admin.cron.ts`**: flipping that gate before the new sender exists would enable the current broken sender on the batch server. Task 9 switches it.

**Files:**
- Create: `src/common/cron.const.ts`
- Create: `src/common/cron.const.spec.ts`
- Modify: the eleven crons listed in Step 3

**Interfaces:**
- Consumes: nothing
- Produces: `CRON_DISABLED: boolean` from `src/common/cron.const.ts`

- [ ] **Step 1: Write the failing test**

Create `src/common/cron.const.spec.ts`:

```ts
describe('CRON_DISABLED', () => {
  const original = { env: process.env.NODE_ENV, inst: process.env.NODE_APP_INSTANCE };

  afterEach(() => {
    process.env.NODE_ENV = original.env;
    process.env.NODE_APP_INSTANCE = original.inst;
    jest.resetModules();
  });

  function load(nodeEnv: string | undefined, instance: string | undefined) {
    process.env.NODE_ENV = nodeEnv as string;
    process.env.NODE_APP_INSTANCE = instance as string;
    jest.resetModules();
    return (require('./cron.const') as { CRON_DISABLED: boolean }).CRON_DISABLED;
  }

  it('is enabled only on production instance 0', () => {
    expect(load('production', '0')).toBe(false);
  });

  it('is disabled on any non-production NODE_ENV, including staging', () => {
    expect(load('staging', '0')).toBe(true);
    expect(load('development', '0')).toBe(true);
    expect(load(undefined, '0')).toBe(true);
  });

  it('is disabled on cluster instances other than 0', () => {
    expect(load('production', '1')).toBe(true);
    expect(load('production', undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/common/cron.const.spec.ts`
Expected: FAIL — `Cannot find module './cron.const'`

- [ ] **Step 3: Write minimal implementation**

Create `src/common/cron.const.ts`:

```ts
/**
 * The gate every @Cron in this repo shares.
 *
 * This expression has been wrong twice in production: `NODE_NEV` (e3fcc99, always
 * undefined so the cron never ran) and `'staging'` (0fd252d, which bound the admin
 * push send to a process that is not the batch server). Import this rather than
 * retyping the comparison.
 */
export const CRON_DISABLED =
  process.env.NODE_ENV !== 'production' || process.env.NODE_APP_INSTANCE !== '0';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/common/cron.const.spec.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Replace the inline expression in the eleven other crons**

In each file below, add `import { CRON_DISABLED } from 'src/common/cron.const';` and replace the `disabled:` value with `CRON_DISABLED`. Do not change anything else — every one of these already reads `NODE_ENV !== 'production' || NODE_APP_INSTANCE !== '0'`, so this is behaviour-preserving.

```
src/card/cron/card-create.cron.ts:22
src/core/cron/user-engage.cron.ts:26
src/auth/cron/auth-profile-remove.cron.ts:13
src/auth/cron/auth-user-remove.cron.ts:13
src/schedules/cron/schedules-create.cron.ts:17
src/pet/cron/pet-snack.cron.ts:20
src/space/cron/space-remove.cron.ts:12
src/premium/cron/premium-ticket.cron.ts:34, :70, :107, :224, :282
```

Example, `src/card/cron/card-create.cron.ts`:

```ts
import { CRON_DISABLED } from 'src/common/cron.const';
// ...
  @Cron(CronExpression.EVERY_10_MINUTES, { disabled: CRON_DISABLED })
```

Note `pet-snack.cron.ts:19` also branches on `NODE_ENV` for its *schedule*, not its gate. Leave that line alone.

- [ ] **Step 6: Verify nothing else still spells the gate inline**

Run:
```bash
cd ~/Documents/backend/mindqna-server
grep -rn "NODE_APP_INSTANCE" src | grep -v cron.const
```
Expected: exactly one line — `src/fcm/cron/fcm-admin.cron.ts`, which Task 9 handles.

- [ ] **Step 7: Build**

Run: `cd ~/Documents/backend/mindqna-server && npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/common/cron.const.ts src/common/cron.const.spec.ts src/card src/core src/auth src/schedules src/pet src/space src/premium
git commit -m "refactor(cron): share one gate constant across the crons

The disabled expression has been mistyped once (NODE_NEV) and regressed once
('staging'). Eleven crons now import it instead of retyping it. fcm-admin is
left on its own expression until its sender is rewritten."
```

---

### Task 2: `user-names` pure module (SERVER)

`userNames` is stored comma-joined and travels over the wire as an array. One module owns the round trip so the parsing rule is not reinvented in the service and the sender.

**Files:**
- Create: `src/fcm/admin-push/user-names.ts`
- Create: `src/fcm/admin-push/user-names.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `parseUserNames(raw: string | null | undefined): string[]`
  - `serializeUserNames(names: string[]): string | null`

- [ ] **Step 1: Write the failing test**

Create `src/fcm/admin-push/user-names.spec.ts`:

```ts
import { parseUserNames, serializeUserNames } from './user-names';

describe('parseUserNames', () => {
  it('splits on commas and trims', () => {
    expect(parseUserNames('alice, bob ,carol')).toEqual(['alice', 'bob', 'carol']);
  });

  it('drops empty segments left by trailing or doubled commas', () => {
    expect(parseUserNames('alice,,bob,')).toEqual(['alice', 'bob']);
  });

  it('de-duplicates, because sending the same person twice is never intended', () => {
    expect(parseUserNames('alice,bob,alice')).toEqual(['alice', 'bob']);
  });

  it('returns an empty array for null, undefined and blank', () => {
    expect(parseUserNames(null)).toEqual([]);
    expect(parseUserNames(undefined)).toEqual([]);
    expect(parseUserNames('   ')).toEqual([]);
  });
});

describe('serializeUserNames', () => {
  it('joins with a comma and no spaces', () => {
    expect(serializeUserNames(['alice', 'bob'])).toBe('alice,bob');
  });

  it('returns null for an empty list so the column stays NULL for ALL targets', () => {
    expect(serializeUserNames([])).toBeNull();
  });

  it('round-trips', () => {
    const names = ['alice', 'bob', 'carol'];
    expect(parseUserNames(serializeUserNames(names))).toEqual(names);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/user-names.spec.ts`
Expected: FAIL — `Cannot find module './user-names'`

- [ ] **Step 3: Write minimal implementation**

Create `src/fcm/admin-push/user-names.ts`:

```ts
/**
 * AdminPush.userNames is a comma-joined TEXT column; the API takes and returns an
 * array. Both directions live here so the trimming and de-duplication rules cannot
 * drift between the admin service and the sender.
 */
export function parseUserNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const parsed = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return [...new Set(parsed)];
}

export function serializeUserNames(names: string[]): string | null {
  const unique = [...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))];
  return unique.length > 0 ? unique.join(',') : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/user-names.spec.ts`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/fcm/admin-push/user-names.ts src/fcm/admin-push/user-names.spec.ts
git commit -m "feat(push): add userNames parse/serialize round trip"
```

---

### Task 3: `fcm-response` pure module (SERVER)

No caller anywhere in the repo reads a `sendEachForMulticast` response today, which is why dead tokens accumulate forever. This module turns a response into the three facts the sender needs.

**Files:**
- Create: `src/fcm/admin-push/fcm-response.ts`
- Create: `src/fcm/admin-push/fcm-response.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type MulticastLike = { responses: Array<{ success: boolean; error?: { code?: string } }> }`
  - `type MulticastSummary = { successCount: number; failureCount: number; deadTokenIndexes: number[] }`
  - `summariseMulticast(res: MulticastLike): MulticastSummary`
  - `DEAD_TOKEN_CODES: readonly string[]`

- [ ] **Step 1: Write the failing test**

Create `src/fcm/admin-push/fcm-response.spec.ts`:

```ts
import { summariseMulticast } from './fcm-response';

describe('summariseMulticast', () => {
  it('counts successes and failures', () => {
    const res = { responses: [{ success: true }, { success: false, error: { code: 'messaging/internal-error' } }] };
    expect(summariseMulticast(res)).toEqual({ successCount: 1, failureCount: 1, deadTokenIndexes: [] });
  });

  it('flags unregistered tokens by index', () => {
    const res = {
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: true },
        { success: false, error: { code: 'messaging/invalid-argument' } },
      ],
    };
    expect(summariseMulticast(res)).toEqual({ successCount: 2, failureCount: 2, deadTokenIndexes: [1, 3] });
  });

  it('leaves transient failures alone — a quota error must not delete a good token', () => {
    const res = {
      responses: [
        { success: false, error: { code: 'messaging/server-unavailable' } },
        { success: false, error: { code: 'messaging/quota-exceeded' } },
        { success: false, error: {} },
        { success: false },
      ],
    };
    expect(summariseMulticast(res)).toEqual({ successCount: 0, failureCount: 4, deadTokenIndexes: [] });
  });

  it('handles an empty response', () => {
    expect(summariseMulticast({ responses: [] })).toEqual({
      successCount: 0,
      failureCount: 0,
      deadTokenIndexes: [],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/fcm-response.spec.ts`
Expected: FAIL — `Cannot find module './fcm-response'`

- [ ] **Step 3: Write minimal implementation**

Create `src/fcm/admin-push/fcm-response.ts`:

```ts
/**
 * Only these two codes mean the token is gone for good. Everything else — quota,
 * server-unavailable, internal-error — is transient, and nulling a token on one of
 * those would silently unsubscribe a healthy device.
 */
export const DEAD_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
] as const;

export type MulticastLike = {
  responses: Array<{ success: boolean; error?: { code?: string } }>;
};

export type MulticastSummary = {
  successCount: number;
  failureCount: number;
  /** Positions in the request's token array, so the caller can map back to users. */
  deadTokenIndexes: number[];
};

export function summariseMulticast(res: MulticastLike): MulticastSummary {
  let successCount = 0;
  let failureCount = 0;
  const deadTokenIndexes: number[] = [];

  res.responses.forEach((r, index) => {
    if (r.success) {
      successCount += 1;
      return;
    }
    failureCount += 1;
    const code = r.error?.code;
    if (code && (DEAD_TOKEN_CODES as readonly string[]).includes(code)) {
      deadTokenIndexes.push(index);
    }
  });

  return { successCount, failureCount, deadTokenIndexes };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/fcm-response.spec.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/fcm/admin-push/fcm-response.ts src/fcm/admin-push/fcm-response.spec.ts
git commit -m "feat(push): summarise multicast responses and flag dead tokens"
```

---

### Task 4: `admin-push-rules` pure module (SERVER)

Every "may I do this" question in one place, so the service and the admin UI cannot disagree about what a state permits.

**Files:**
- Create: `src/fcm/admin-push/admin-push-rules.ts`
- Create: `src/fcm/admin-push/admin-push-rules.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type AdminPushStatusName = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED' | 'ABORTED'`
  - `GRACE_WINDOW_MS: number`
  - `MAX_CONSECUTIVE_FAILURES: number`
  - `canEdit(status)`, `canCancel(status)`, `canAbort(status)`: `(status: AdminPushStatusName) => boolean`
  - `canDelete(sentCount: number): boolean`
  - `isWithinGraceWindow(pushAt: Date, now: Date): boolean`
  - `hasExhaustedRetries(consecutiveFailures: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/fcm/admin-push/admin-push-rules.spec.ts`:

```ts
import {
  canAbort,
  canCancel,
  canDelete,
  canEdit,
  hasExhaustedRetries,
  isWithinGraceWindow,
} from './admin-push-rules';

describe('permissions by status', () => {
  it('allows edit and cancel only while SCHEDULED', () => {
    expect(canEdit('SCHEDULED')).toBe(true);
    expect(canCancel('SCHEDULED')).toBe(true);
    for (const s of ['SENDING', 'SENT', 'FAILED', 'CANCELED', 'ABORTED'] as const) {
      expect(canEdit(s)).toBe(false);
      expect(canCancel(s)).toBe(false);
    }
  });

  it('allows abort only while SENDING', () => {
    expect(canAbort('SENDING')).toBe(true);
    for (const s of ['SCHEDULED', 'SENT', 'FAILED', 'CANCELED', 'ABORTED'] as const) {
      expect(canAbort(s)).toBe(false);
    }
  });
});

describe('canDelete', () => {
  it('turns on delivery, not on status — one delivered message makes it a record', () => {
    expect(canDelete(0)).toBe(true);
    expect(canDelete(1)).toBe(false);
    expect(canDelete(30_000)).toBe(false);
  });
});

describe('isWithinGraceWindow', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');

  it('accepts a pushAt inside the last hour', () => {
    expect(isWithinGraceWindow(new Date('2026-08-20T11:30:00.000Z'), now)).toBe(true);
    expect(isWithinGraceWindow(new Date('2026-08-20T11:00:00.001Z'), now)).toBe(true);
  });

  it('rejects a pushAt older than an hour, so a batch server that was down does not replay yesterday', () => {
    expect(isWithinGraceWindow(new Date('2026-08-20T10:59:59.000Z'), now)).toBe(false);
    expect(isWithinGraceWindow(new Date('2026-08-19T12:00:00.000Z'), now)).toBe(false);
  });

  it('accepts a pushAt exactly now', () => {
    expect(isWithinGraceWindow(now, now)).toBe(true);
  });
});

describe('hasExhaustedRetries', () => {
  it('gives up at three consecutive batch failures', () => {
    expect(hasExhaustedRetries(0)).toBe(false);
    expect(hasExhaustedRetries(2)).toBe(false);
    expect(hasExhaustedRetries(3)).toBe(true);
    expect(hasExhaustedRetries(4)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/admin-push-rules.spec.ts`
Expected: FAIL — `Cannot find module './admin-push-rules'`

- [ ] **Step 3: Write minimal implementation**

Create `src/fcm/admin-push/admin-push-rules.ts`:

```ts
export type AdminPushStatusName = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED' | 'ABORTED';

/** A send whose scheduled time has passed by more than this is stale, not late. */
export const GRACE_WINDOW_MS = 60 * 60 * 1000;

export const MAX_CONSECUTIVE_FAILURES = 3;

export function canEdit(status: AdminPushStatusName): boolean {
  return status === 'SCHEDULED';
}

export function canCancel(status: AdminPushStatusName): boolean {
  return status === 'SCHEDULED';
}

export function canAbort(status: AdminPushStatusName): boolean {
  return status === 'SENDING';
}

/**
 * Deliberately keyed on delivery rather than status: a FAILED row may already have
 * reached tens of thousands of devices, and that record must survive.
 */
export function canDelete(sentCount: number): boolean {
  return sentCount === 0;
}

export function isWithinGraceWindow(pushAt: Date, now: Date): boolean {
  return now.getTime() - pushAt.getTime() <= GRACE_WINDOW_MS;
}

export function hasExhaustedRetries(consecutiveFailures: number): boolean {
  return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/admin-push-rules.spec.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/fcm/admin-push/admin-push-rules.ts src/fcm/admin-push/admin-push-rules.spec.ts
git commit -m "feat(push): centralise admin push state rules"
```

---

### Task 5: Prisma schema (SERVER)

Bring `schema.prisma` in line with what the operator's SQL produces. **Do not run `prisma migrate`** — this repo's schema changes are hand-applied SQL and the migration folder holds one squashed baseline.

**Files:**
- Modify: `prisma/schema.prisma` (`model AdminPush` at :835, `model User` at :10)

**Interfaces:**
- Consumes: nothing
- Produces: Prisma client types `AdminPush`, `AdminPushTarget`, `AdminPushStatus`

- [ ] **Step 1: Confirm the dev database already has the SQL applied**

**This repo's default `.env` points at the PRODUCTION database.** `.env.development` is the only file
with the dev URL. Every Prisma command that touches a datasource must therefore carry the dev URL
explicitly:

```bash
cd ~/Documents/backend/mindqna-server
DEV_URL=$(grep -m1 '^DATABASE_URL=' .env.development | cut -d= -f2- | tr -d '"')
```

Never run `prisma db push`, `prisma migrate dev`, or `prisma migrate deploy` in this repo at all.
Schema changes are hand-applied SQL by the operator; those commands would write to whichever
database the URL resolves to.

The state below was verified before this task was dispatched, so it should already hold:

- `AdminPush.status` exists as `enum('SCHEDULED','SENDING','SENT','FAILED','CANCELED','ABORTED')`
- `User_locale_id_idx` exists on `(locale, id)`
- `isActive`, `isSuccess` and `sentAt` have already been dropped from `AdminPush` on dev

Confirm it yourself before editing the schema; if any of the three is wrong, stop and report.

- [ ] **Step 2: Replace the `AdminPush` model**

In `prisma/schema.prisma`, replace the whole `model AdminPush { ... }` block with:

```prisma
enum AdminPushTarget {
  ALL
  USER
}

enum AdminPushStatus {
  SCHEDULED
  SENDING
  SENT
  FAILED
  CANCELED
  ABORTED
}

model AdminPush {
  id        Int      @id @default(autoincrement())

  // Definition — mutable only while SCHEDULED
  title     String
  message   String   @db.VarChar(500)
  link      String?  @db.VarChar(1024)
  imgUrl    String?  @db.VarChar(1024)
  locale    Locale?
  target    AdminPushTarget
  userNames String?  @db.Text
  pushAt    DateTime

  // Execution — written by the sender only
  status              AdminPushStatus @default(SCHEDULED)
  cursorUserId        String?
  targetCount         Int?
  sentCount           Int             @default(0)
  failedCount         Int             @default(0)
  consecutiveFailures Int             @default(0)
  startedAt           DateTime?
  finishedAt          DateTime?
  lastError           String?         @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status, pushAt])
}
```

- [ ] **Step 3: Add the User index**

In `model User`, add as the last line before the closing brace:

```prisma
  @@index([locale, id])
```

- [ ] **Step 4: Validate and generate**

Run:
```bash
cd ~/Documents/backend/mindqna-server
npx prisma validate
npx prisma generate
```
Expected: `The schema at prisma/schema.prisma is valid` then `Generated Prisma Client`

- [ ] **Step 5: Confirm the schema matches the database, scoped to what this task changed**

A blanket `migrate diff --exit-code` cannot pass here: the dev database carries roughly seventy
differences from `main`'s schema, because other feature branches' tables and indexes are applied to
it. Check only what this task touches:

```bash
DATABASE_URL="$DEV_URL" npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma 2>&1 \
  | grep -A30 'Changed the `AdminPush` table'
```

Expected: **no `AdminPush` section at all** in the output. Its presence means the schema block and
the database still disagree about that table. Unrelated tables in the output are pre-existing dev
drift and are not this task's problem.

Then confirm the model compiles against the real client:

```bash
DATABASE_URL="$DEV_URL" npx prisma validate
```

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add prisma/schema.prisma
git commit -m "feat(push): model AdminPush execution state

Mirrors the hand-applied SQL in the admin repo's spec §3.2. The legacy isActive,
isSuccess and sentAt columns are left out of the model: they carry defaults or
are nullable, so a database that still has them accepts inserts that omit them,
and Prisma ignores columns it does not declare."
```

---

### Task 6: The send loop (SERVER)

The heart of the change. Written against injected dependencies so the tests need neither Prisma nor Firebase.

**Files:**
- Create: `src/fcm/admin-push/admin-push-sender.ts`
- Create: `src/fcm/admin-push/admin-push-sender.spec.ts`

**Interfaces:**
- Consumes: `parseUserNames` (Task 2); `summariseMulticast` (Task 3); `canAbort`, `hasExhaustedRetries`, `isWithinGraceWindow` (Task 4)
- Produces:
  - `BATCH_SIZE = 500`, `FCM_BATCH_TIMEOUT_MS = 30_000`
  - `type SenderDeps` (shape below)
  - `runAdminPushTick(deps: SenderDeps): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/fcm/admin-push/admin-push-sender.spec.ts`:

```ts
import { runAdminPushTick, SenderDeps } from './admin-push-sender';

type Row = Record<string, any>;

/**
 * A hand-rolled double rather than a mocking library: the loop's contract is which
 * rows it reads and which fields it writes, and asserting on recorded calls states
 * that contract more plainly than matcher chains.
 */
function makeDeps(opts: { rows: Row[]; users: Row[][]; send?: () => Promise<any> }) {
  const rows = opts.rows;
  const userBatches = [...opts.users];
  const updates: Row[] = [];
  const userUpdates: Row[] = [];
  const sends: Row[] = [];
  const pushMetaWrites: Row[] = [];

  const deps: SenderDeps = {
    now: () => new Date('2026-08-20T12:00:00.000Z'),
    prisma: {
      adminPush: {
        findFirst: async ({ where }: any) => {
          const status = where.status;
          return rows.find((r) => r.status === status) ?? null;
        },
        updateMany: async ({ where, data }: any) => {
          const row = rows.find((r) => r.id === where.id && r.status === where.status);
          if (!row) return { count: 0 };
          Object.assign(row, data);
          updates.push({ kind: 'claim', ...data });
          return { count: 1 };
        },
        update: async ({ where, data }: any) => {
          const row = rows.find((r) => r.id === where.id);
          for (const [k, v] of Object.entries<any>(data)) {
            row[k] = v && typeof v === 'object' && 'increment' in v ? (row[k] ?? 0) + v.increment : v;
          }
          updates.push({ kind: 'progress', ...data });
          return row;
        },
        findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      },
      user: {
        count: async () => 1000,
        findMany: async () => userBatches.shift() ?? [],
        updateMany: async (args: any) => {
          userUpdates.push(args);
          return { count: (args.where.id.in as string[]).length };
        },
      },
      pushMeta: {
        createMany: async (args: any) => {
          pushMetaWrites.push(args);
          return { count: 0 };
        },
      },
    } as any,
    messaging: () =>
      ({
        sendEachForMulticast: async (msg: any) => {
          sends.push(msg);
          return opts.send
            ? opts.send()
            : { responses: msg.tokens.map(() => ({ success: true })) };
        },
      } as any),
  };

  return { deps, rows, updates, userUpdates, sends, pushMetaWrites };
}

function scheduledRow(over: Row = {}): Row {
  return {
    id: 1,
    title: 'hello',
    message: 'body',
    link: null,
    imgUrl: null,
    locale: 'ko',
    target: 'ALL',
    userNames: null,
    pushAt: new Date('2026-08-20T11:59:00.000Z'),
    status: 'SCHEDULED',
    cursorUserId: null,
    sentCount: 0,
    failedCount: 0,
    consecutiveFailures: 0,
    ...over,
  };
}

describe('runAdminPushTick', () => {
  it('walks batches, advances the cursor by last user id, and finishes as SENT', async () => {
    const h = makeDeps({
      rows: [scheduledRow()],
      users: [
        [{ id: 'u1', fcmToken: 't1' }, { id: 'u2', fcmToken: 't2' }],
        [{ id: 'u3', fcmToken: 't3' }],
        [],
      ],
    });

    await runAdminPushTick(h.deps);

    expect(h.rows[0].status).toBe('SENT');
    expect(h.rows[0].cursorUserId).toBe('u3');
    expect(h.rows[0].sentCount).toBe(3);
    expect(h.rows[0].failedCount).toBe(0);
    expect(h.rows[0].finishedAt).toBeInstanceOf(Date);
    expect(h.sends.map((s) => s.tokens)).toEqual([['t1', 't2'], ['t3']]);
  });

  it('never writes PushMeta, for either target', async () => {
    const h = makeDeps({
      rows: [scheduledRow({ target: 'USER', locale: null, userNames: 'alice,bob' })],
      users: [[{ id: 'u1', fcmToken: 't1' }], []],
    });

    await runAdminPushTick(h.deps);

    expect(h.pushMetaWrites).toEqual([]);
  });

  it('stops before the next batch once the row has been aborted', async () => {
    const h = makeDeps({
      rows: [scheduledRow()],
      users: [[{ id: 'u1', fcmToken: 't1' }], [{ id: 'u2', fcmToken: 't2' }], []],
    });
    let reads = 0;
    // Flip to ABORTED after the first batch, the way the admin API would.
    h.deps.prisma.adminPush.findUnique = (async () => {
      reads += 1;
      const status = reads > 1 ? 'ABORTED' : 'SENDING';
      h.rows[0].status = status;
      return { status };
    }) as any;

    await runAdminPushTick(h.deps);

    expect(h.sends).toHaveLength(1);
    expect(h.rows[0].status).toBe('ABORTED');
  });

  it('nulls only dead tokens and counts the rest as failures', async () => {
    const h = makeDeps({
      rows: [scheduledRow()],
      users: [
        [
          { id: 'u1', fcmToken: 't1' },
          { id: 'u2', fcmToken: 't2' },
          { id: 'u3', fcmToken: 't3' },
        ],
        [],
      ],
      send: async () => ({
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
          { success: false, error: { code: 'messaging/server-unavailable' } },
        ],
      }),
    });

    await runAdminPushTick(h.deps);

    expect(h.userUpdates).toHaveLength(1);
    expect(h.userUpdates[0].where.id.in).toEqual(['u2']);
    expect(h.userUpdates[0].data).toEqual({ fcmToken: null });
    expect(h.rows[0].sentCount).toBe(1);
    expect(h.rows[0].failedCount).toBe(2);
  });

  it('fails the row after three consecutive batch exceptions, leaving the cursor put', async () => {
    const h = makeDeps({
      rows: [scheduledRow({ cursorUserId: 'u0' })],
      users: [
        [{ id: 'u1', fcmToken: 't1' }],
        [{ id: 'u1', fcmToken: 't1' }],
        [{ id: 'u1', fcmToken: 't1' }],
      ],
      send: async () => {
        throw new Error('FCM exploded');
      },
    });

    await runAdminPushTick(h.deps);

    expect(h.rows[0].status).toBe('FAILED');
    expect(h.rows[0].cursorUserId).toBe('u0');
    expect(h.rows[0].lastError).toContain('FCM exploded');
  });

  it('fails a row whose pushAt is older than the grace window without sending', async () => {
    const h = makeDeps({
      rows: [scheduledRow({ pushAt: new Date('2026-08-20T10:00:00.000Z') })],
      users: [[{ id: 'u1', fcmToken: 't1' }]],
    });

    await runAdminPushTick(h.deps);

    expect(h.sends).toEqual([]);
    expect(h.rows[0].status).toBe('FAILED');
    expect(h.rows[0].lastError).toMatch(/grace window/i);
  });

  it('does nothing when the claim is lost to another worker', async () => {
    const h = makeDeps({ rows: [scheduledRow()], users: [[{ id: 'u1', fcmToken: 't1' }]] });
    h.deps.prisma.adminPush.updateMany = (async () => ({ count: 0 })) as any;

    await runAdminPushTick(h.deps);

    expect(h.sends).toEqual([]);
  });

  it('does nothing when there is no row to send', async () => {
    const h = makeDeps({ rows: [], users: [] });
    await runAdminPushTick(h.deps);
    expect(h.sends).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/admin-push-sender.spec.ts`
Expected: FAIL — `Cannot find module './admin-push-sender'`

- [ ] **Step 3: Write minimal implementation**

Create `src/fcm/admin-push/admin-push-sender.ts`:

```ts
import { Logger } from '@nestjs/common';
import { hasExhaustedRetries, isWithinGraceWindow } from './admin-push-rules';
import { summariseMulticast } from './fcm-response';
import { parseUserNames } from './user-names';

export const BATCH_SIZE = 500;
export const FCM_BATCH_TIMEOUT_MS = 30_000;

type AdminPushRow = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  imgUrl: string | null;
  locale: string | null;
  target: 'ALL' | 'USER';
  userNames: string | null;
  pushAt: Date;
  status: string;
  cursorUserId: string | null;
  consecutiveFailures: number;
};

export type SenderDeps = {
  now: () => Date;
  prisma: {
    adminPush: {
      findFirst(args: any): Promise<AdminPushRow | null>;
      findUnique(args: any): Promise<{ status: string } | null>;
      updateMany(args: any): Promise<{ count: number }>;
      update(args: any): Promise<unknown>;
    };
    user: {
      findMany(args: any): Promise<Array<{ id: string; fcmToken: string | null }>>;
      updateMany(args: any): Promise<{ count: number }>;
      count(args: any): Promise<number>;
    };
  };
  messaging: () => {
    sendEachForMulticast(message: any): Promise<{
      responses: Array<{ success: boolean; error?: { code?: string } }>;
    }>;
  };
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`FCM batch timed out after ${ms}ms`)), ms).unref?.(),
    ),
  ]);
}

/** One cron tick. Claims at most one push and sends it to completion. */
export async function runAdminPushTick(deps: SenderDeps): Promise<void> {
  const now = deps.now();

  // Resume before starting anything new, so a send interrupted by a deploy finishes first.
  let row = await deps.prisma.adminPush.findFirst({ where: { status: 'SENDING' } });

  if (!row) {
    row = await deps.prisma.adminPush.findFirst({
      where: { status: 'SCHEDULED', pushAt: { lte: now } },
      orderBy: { pushAt: 'asc' },
    });
    if (!row) return;

    if (!isWithinGraceWindow(row.pushAt, now)) {
      await deps.prisma.adminPush.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          finishedAt: now,
          lastError: `pushAt ${row.pushAt.toISOString()} is outside the grace window; not sending`,
        },
      });
      return;
    }

    const targetCount = await countTarget(deps, row);
    const claim = await deps.prisma.adminPush.updateMany({
      where: { id: row.id, status: 'SCHEDULED' },
      data: { status: 'SENDING', startedAt: now, targetCount, consecutiveFailures: 0 },
    });
    // Another worker got there first. Nothing to do; it owns the row now.
    if (claim.count === 0) return;
  }

  await drain(deps, row);
}

/**
 * Approximate for broadcasts on purpose: an exact figure needs `fcmToken IS NOT NULL`,
 * which no index narrows, and this only drives a progress bar. PushService.getTargetCount
 * counts the same way, so the compose-time estimate and this figure agree.
 */
async function countTarget(deps: SenderDeps, row: AdminPushRow): Promise<number> {
  if (row.target === 'USER') return parseUserNames(row.userNames).length;
  return deps.prisma.user.count({ where: { locale: row.locale } });
}

async function drain(deps: SenderDeps, row: AdminPushRow): Promise<void> {
  let cursor = row.cursorUserId;
  let consecutiveFailures = row.consecutiveFailures;
  const names = row.target === 'USER' ? parseUserNames(row.userNames) : [];

  for (;;) {
    if (await isAborted(deps, row.id)) return;

    const users = await deps.prisma.user.findMany({
      where: {
        ...(row.target === 'ALL' ? { locale: row.locale } : { username: { in: names } }),
        id: { gt: cursor ?? '' },
        fcmToken: { not: null },
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: { id: true, fcmToken: true },
    });

    if (users.length === 0) {
      await deps.prisma.adminPush.update({
        where: { id: row.id },
        data: { status: 'SENT', finishedAt: deps.now(), consecutiveFailures: 0 },
      });
      return;
    }

    try {
      const res = await withTimeout(
        deps.messaging().sendEachForMulticast({
          tokens: users.map((u) => u.fcmToken as string),
          notification: {
            title: row.title,
            body: row.message,
            imageUrl: row.imgUrl ?? undefined,
          },
          ...(row.link ? { data: { deepLinkUrl: row.link } } : {}),
        }),
        FCM_BATCH_TIMEOUT_MS,
      );

      const { successCount, failureCount, deadTokenIndexes } = summariseMulticast(res);

      if (deadTokenIndexes.length > 0) {
        await deps.prisma.user.updateMany({
          where: { id: { in: deadTokenIndexes.map((i) => users[i].id) } },
          data: { fcmToken: null },
        });
      }

      cursor = users[users.length - 1].id;
      consecutiveFailures = 0;
      await deps.prisma.adminPush.update({
        where: { id: row.id },
        data: {
          cursorUserId: cursor,
          sentCount: { increment: successCount },
          failedCount: { increment: failureCount },
          consecutiveFailures: 0,
        },
      });
    } catch (error) {
      // The cursor stays put, so the next attempt retries this same batch.
      consecutiveFailures += 1;
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`admin push ${row.id} batch failed (${consecutiveFailures})`, message);

      if (hasExhaustedRetries(consecutiveFailures)) {
        await deps.prisma.adminPush.update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            finishedAt: deps.now(),
            consecutiveFailures,
            lastError: message,
          },
        });
        return;
      }

      await deps.prisma.adminPush.update({
        where: { id: row.id },
        data: { consecutiveFailures, lastError: message },
      });
    }
  }
}

/** Re-read before every batch: an abort must take effect within one batch, not at the end. */
async function isAborted(deps: SenderDeps, id: number): Promise<boolean> {
  const current = await deps.prisma.adminPush.findUnique({
    where: { id },
    select: { status: true },
  });
  return current?.status === 'ABORTED';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/admin-push/admin-push-sender.spec.ts`
Expected: PASS, 8 tests


- [ ] **Step 5: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/fcm/admin-push/admin-push-sender.ts src/fcm/admin-push/admin-push-sender.spec.ts
git commit -m "feat(push): add the resumable admin push send loop

Keyed cursor on User.id rather than skip/take, progress committed per batch, no
transaction around FCM calls, abort honoured between batches, dead tokens
cleared from the response, and a per-batch timeout so a hung call cannot strand
the runner."
```

---

### Task 7: Admin push service — CRUD and validation (SERVER)

Strip sending out of the service entirely and add the validation that stops today's silent zero-match success.

**Files:**
- Modify: `src/admin/push/push.service.ts` (full rewrite)
- Modify: `src/admin/push/types/push.types.ts`
- Modify: `src/admin/admin.dto.ts:109-123`
- Create: `src/admin/push/push.service.spec.ts`

**Interfaces:**
- Consumes: `parseUserNames`, `serializeUserNames` (Task 2); `canAbort`, `canCancel`, `canDelete`, `canEdit` (Task 4)
- Produces: `PushService` with `getPushes`, `getPush`, `createPush`, `updatePush`, `cancelPush`, `abortPush`, `removePush`; `AdminPushItem` in `push.types.ts`

- [ ] **Step 1: Rewrite the DTOs**

In `src/admin/admin.dto.ts`, replace the `CreatePushDto` and `UpdatePushDto` interfaces at :109-123 with:

```ts
export interface CreatePushDto {
  title: string;
  message: string;
  target: 'ALL' | 'USER';
  /** true → the server stamps pushAt; keeps client clock skew out of the data. */
  sendNow: boolean;
  /** Required when sendNow is false. ISO 8601. Must be in the future. */
  pushAt?: string;
  /** Required for target ALL; stored NULL for USER, which ignores locale. */
  locale?: Locale;
  /** Required for target USER. 1..1000 entries. */
  userNames?: string[];
  link?: string;
  imgUrl?: string;
}

export type UpdatePushDto = CreatePushDto;
```

- [ ] **Step 2: Write the failing test**

Create `src/admin/push/push.service.spec.ts`:

```ts
jest.mock(
  'src/prisma/prisma.service',
  () => ({ PrismaService: class PrismaService {} }),
  { virtual: true },
);

const { PushService } = require('./push.service') as { PushService: new (prisma: any) => any };

function makePrisma(over: any = {}) {
  return {
    adminPush: {
      findMany: async () => [],
      findUnique: async () => null,
      count: async () => 0,
      create: async ({ data }: any) => ({ id: 1, ...data }),
      update: async ({ data }: any) => ({ id: 1, ...data }),
      updateMany: async () => ({ count: 1 }),
      delete: async () => undefined,
      ...over.adminPush,
    },
    user: {
      findMany: async () => [],
      ...over.user,
    },
  };
}

const base = {
  title: 't',
  message: 'm',
  target: 'ALL' as const,
  sendNow: true,
  locale: 'ko' as any,
};

describe('createPush validation', () => {
  it('rejects a past pushAt when not sending now', async () => {
    const svc = new PushService(makePrisma());
    await expect(
      svc.createPush({ ...base, sendNow: false, pushAt: '2020-01-01T00:00:00.000Z' }),
    ).rejects.toThrow(/future/i);
  });

  it('rejects target ALL without a locale', async () => {
    const svc = new PushService(makePrisma());
    await expect(svc.createPush({ ...base, locale: undefined })).rejects.toThrow(/locale/i);
  });

  it('rejects target USER without userNames', async () => {
    const svc = new PushService(makePrisma());
    await expect(
      svc.createPush({ ...base, target: 'USER', locale: undefined, userNames: [] }),
    ).rejects.toThrow(/userNames/i);
  });

  it('names the usernames that do not exist instead of silently sending to nobody', async () => {
    const prisma = makePrisma({ user: { findMany: async () => [{ username: 'alice' }] } });
    const svc = new PushService(prisma);
    await expect(
      svc.createPush({ ...base, target: 'USER', locale: undefined, userNames: ['alice', 'ghost'] }),
    ).rejects.toMatchObject({ unknownUserNames: ['ghost'] });
  });

  it('stores userNames comma-joined and locale null for a USER target', async () => {
    const prisma = makePrisma({
      user: { findMany: async () => [{ username: 'alice' }, { username: 'bob' }] },
    });
    let written: any;
    prisma.adminPush.create = async ({ data }: any) => ((written = data), { id: 1, ...data });
    const svc = new PushService(prisma);

    await svc.createPush({ ...base, target: 'USER', locale: undefined, userNames: ['alice', 'bob'] });

    expect(written.userNames).toBe('alice,bob');
    expect(written.locale).toBeNull();
    expect(written.status).toBe('SCHEDULED');
  });
});

describe('state guards', () => {
  it('refuses to edit a row that is no longer SCHEDULED', async () => {
    const prisma = makePrisma({
      adminPush: { findUnique: async () => ({ id: 1, status: 'SENDING', sentCount: 5 }) },
    });
    const svc = new PushService(prisma);
    await expect(svc.updatePush({ id: 1, ...base })).rejects.toThrow(/SCHEDULED/i);
  });

  it('refuses to abort a row that is not SENDING', async () => {
    const prisma = makePrisma({
      adminPush: { findUnique: async () => ({ id: 1, status: 'SCHEDULED', sentCount: 0 }) },
    });
    const svc = new PushService(prisma);
    await expect(svc.abortPush(1)).rejects.toThrow(/SENDING/i);
  });

  it('refuses to delete a row that reached anyone', async () => {
    const prisma = makePrisma({
      adminPush: { findUnique: async () => ({ id: 1, status: 'FAILED', sentCount: 30_000 }) },
    });
    const svc = new PushService(prisma);
    await expect(svc.removePush(1)).rejects.toThrow(/delivered/i);
  });

  it('allows deleting a FAILED row that reached nobody', async () => {
    let deleted = false;
    const prisma = makePrisma({
      adminPush: {
        findUnique: async () => ({ id: 1, status: 'FAILED', sentCount: 0 }),
        delete: async () => ((deleted = true), undefined),
      },
    });
    const svc = new PushService(prisma);
    await svc.removePush(1);
    expect(deleted).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/admin/push/push.service.spec.ts`
Expected: FAIL — `svc.abortPush is not a function` and validation assertions

- [ ] **Step 4: Rewrite the service**

Replace `src/admin/push/push.service.ts` entirely:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPush, Locale } from '@prisma/client';
import { canAbort, canCancel, canDelete, canEdit } from 'src/fcm/admin-push/admin-push-rules';
import { parseUserNames, serializeUserNames } from 'src/fcm/admin-push/user-names';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePushDto } from '../admin.dto';
import { AdminPushItem, GetPushesResponse, UpdatePushParams } from './types/push.types';

const PAGE_SIZE = 10;
const MAX_USER_NAMES = 1000;
const MAX_TITLE = 100;
const MAX_MESSAGE = 500;

/**
 * CRUD and validation only. Sending happens on the batch server; this service runs in
 * mindbridge-prod, which has ENABLE_CRON=false and cannot hold a multi-minute send open
 * inside an HTTP request.
 */
@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {}

  async getPushes(page: number, locale?: Locale[], status?: string[]): Promise<GetPushesResponse> {
    const where = {
      ...(locale?.length ? { locale: { in: locale } } : {}),
      ...(status?.length ? { status: { in: status as any } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.adminPush.findMany({
        where,
        orderBy: { pushAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.adminPush.count({ where }),
    ]);

    const totalPage = Math.ceil(total / PAGE_SIZE);
    return {
      items: items.map(toItem),
      pageInfo: { totalPage, hasNext: page < totalPage, endCursor: undefined },
    };
  }

  async getPush(id: number): Promise<AdminPushItem> {
    return toItem(await this.mustFind(id));
  }

  /**
   * Approximate on purpose — see the sender's countTarget. The admin needs this before a
   * push exists, to tell the operator that a ko broadcast is a 15-to-44-minute job.
   */
  async getTargetCount(locale: Locale): Promise<{ count: number; isApproximate: true }> {
    const count = await this.prisma.user.count({ where: { locale } });
    return { count, isApproximate: true };
  }

  async createPush(dto: CreatePushDto): Promise<AdminPushItem> {
    const data = await this.buildData(dto);
    return toItem(await this.prisma.adminPush.create({ data }));
  }

  async updatePush(params: UpdatePushParams): Promise<AdminPushItem> {
    const { id, ...dto } = params;
    const existing = await this.mustFind(id);
    if (!canEdit(existing.status as any)) {
      throw new ConflictException(`Only a SCHEDULED push can be edited (this one is ${existing.status}).`);
    }
    const data = await this.buildData(dto);
    // Guard against the sender claiming the row between the read and the write.
    const { count } = await this.prisma.adminPush.updateMany({
      where: { id, status: 'SCHEDULED' },
      data,
    });
    if (count === 0) {
      throw new ConflictException('The push started sending while it was being edited.');
    }
    return toItem(await this.mustFind(id));
  }

  async cancelPush(id: number): Promise<void> {
    const existing = await this.mustFind(id);
    if (!canCancel(existing.status as any)) {
      throw new ConflictException(`Only a SCHEDULED push can be cancelled (this one is ${existing.status}).`);
    }
    const { count } = await this.prisma.adminPush.updateMany({
      where: { id, status: 'SCHEDULED' },
      data: { status: 'CANCELED', finishedAt: new Date() },
    });
    if (count === 0) throw new ConflictException('The push started sending before it could be cancelled.');
  }

  async abortPush(id: number): Promise<void> {
    const existing = await this.mustFind(id);
    if (!canAbort(existing.status as any)) {
      throw new ConflictException(`Only a SENDING push can be aborted (this one is ${existing.status}).`);
    }
    // The sender re-reads status before each batch, so it stops within one batch.
    await this.prisma.adminPush.updateMany({
      where: { id, status: 'SENDING' },
      data: { status: 'ABORTED', finishedAt: new Date() },
    });
  }

  async removePush(id: number): Promise<void> {
    const existing = await this.mustFind(id);
    if (!canDelete(existing.sentCount)) {
      throw new ConflictException(
        `This push was delivered to ${existing.sentCount} devices and cannot be deleted.`,
      );
    }
    await this.prisma.adminPush.delete({ where: { id } });
  }

  private async mustFind(id: number): Promise<AdminPush> {
    const row = await this.prisma.adminPush.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Push ${id} does not exist.`);
    return row;
  }

  private async buildData(dto: CreatePushDto) {
    const { title, message, target, sendNow, pushAt, locale, userNames, link, imgUrl } = dto;

    if (!title || title.length > MAX_TITLE) throw new BadRequestException(`title must be 1..${MAX_TITLE} chars.`);
    if (!message || message.length > MAX_MESSAGE) {
      throw new BadRequestException(`message must be 1..${MAX_MESSAGE} chars.`);
    }

    const when = sendNow ? new Date() : new Date(pushAt ?? '');
    if (Number.isNaN(when.getTime())) throw new BadRequestException('pushAt is not a valid ISO 8601 date.');
    if (!sendNow && when.getTime() <= Date.now()) {
      throw new BadRequestException('pushAt must be in the future.');
    }

    if (target === 'ALL') {
      if (!locale) throw new BadRequestException('locale is required when target is ALL.');
      return {
        title, message, link: link ?? null, imgUrl: imgUrl ?? null,
        locale, target: 'ALL' as const, userNames: null,
        pushAt: when, status: 'SCHEDULED' as const,
        cursorUserId: null, targetCount: null, sentCount: 0, failedCount: 0,
        consecutiveFailures: 0, startedAt: null, finishedAt: null, lastError: null,
      };
    }

    const names = parseUserNames((userNames ?? []).join(','));
    if (names.length === 0) throw new BadRequestException('userNames is required when target is USER.');
    if (names.length > MAX_USER_NAMES) {
      throw new BadRequestException(`userNames may not exceed ${MAX_USER_NAMES} entries.`);
    }

    const found = await this.prisma.user.findMany({
      where: { username: { in: names } },
      select: { username: true },
    });
    const known = new Set(found.map((u) => u.username));
    const unknownUserNames = names.filter((name) => !known.has(name));
    if (unknownUserNames.length > 0) {
      // Naming them is the point: today a zero-row match returns success.
      throw new BadRequestException({ code: 'PUSH_UNKNOWN_USERNAMES', unknownUserNames });
    }

    return {
      title, message, link: link ?? null, imgUrl: imgUrl ?? null,
      // A per-user send ignores locale, so storing one would be a lie in the data.
      locale: null, target: 'USER' as const, userNames: serializeUserNames(names),
      pushAt: when, status: 'SCHEDULED' as const,
      cursorUserId: null, targetCount: names.length, sentCount: 0, failedCount: 0,
      consecutiveFailures: 0, startedAt: null, finishedAt: null, lastError: null,
    };
  }
}

function toItem(row: AdminPush): AdminPushItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    link: row.link,
    imgUrl: row.imgUrl,
    target: row.target,
    locale: row.locale,
    userNames: row.target === 'USER' ? parseUserNames(row.userNames) : null,
    pushAt: row.pushAt.toISOString(),
    status: row.status,
    targetCount: row.targetCount,
    targetCountIsApproximate: row.target === 'ALL',
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 5: Update the types file**

Replace `src/admin/push/types/push.types.ts`:

```ts
import { AdminPushStatus, AdminPushTarget, Locale } from '@prisma/client';
import { PageInfo } from '../../types/common.types';
import { CreatePushDto } from '../../admin.dto';

export type AdminPushItem = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  imgUrl: string | null;
  target: AdminPushTarget;
  locale: Locale | null;
  userNames: string[] | null;
  pushAt: string;
  status: AdminPushStatus;
  targetCount: number | null;
  targetCountIsApproximate: boolean;
  sentCount: number;
  failedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetPushesResponse = {
  items: AdminPushItem[];
  pageInfo: PageInfo;
};

export type UpdatePushParams = CreatePushDto & { id: number };
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/admin/push src/fcm/admin-push`
Expected: PASS, all suites

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/admin/push src/admin/admin.dto.ts
git commit -m "feat(push): validate and guard admin push CRUD

createPush never persisted userNames or target, so per-user scheduling was
unreachable; the immediate path resolved typed names against User.id and
reported success on zero matches. Names are now checked at save time and
returned by name when unknown. Sending leaves this service entirely."
```

---

### Task 8: Controller routes (SERVER)

**Files:**
- Modify: `src/admin/admin.controller.ts:394-427`

**Interfaces:**
- Consumes: `PushService` (Task 7)
- Produces: `GET/POST /admin/push`, `GET/PUT/DELETE /admin/push/:id`, `POST /admin/push/:id/cancel`, `POST /admin/push/:id/abort`

- [ ] **Step 1: Replace the push routes**

In `src/admin/admin.controller.ts`, replace the four existing push routes at :394-427 with:

```ts
  @TypedRoute.Get('/push')
  async getPushes(
    @TypedQuery() query: { page: number; locale?: Locale[]; status?: string[] },
  ) {
    const { page, locale, status } = query;
    return (await this.pushService.getPushes(page, locale, status)) as any;
  }

  // Declared before '/push/:id' so nest does not read "target-count" as an id.
  @TypedRoute.Get('/push/target-count')
  async getPushTargetCount(@TypedQuery() query: { locale: Locale }) {
    return (await this.pushService.getTargetCount(query.locale)) as any;
  }

  @TypedRoute.Get('/push/:id')
  async getPush(@TypedParam('id') id: number) {
    return (await this.pushService.getPush(id)) as any;
  }

  @TypedRoute.Post('/push')
  async createPush(@TypedBody() dto: CreatePushDto) {
    return (await this.pushService.createPush(dto)) as any;
  }

  @TypedRoute.Put('/push/:id')
  async updatePush(@TypedParam('id') id: number, @TypedBody() dto: UpdatePushDto) {
    return (await this.pushService.updatePush({ id, ...dto })) as any;
  }

  @TypedRoute.Post('/push/:id/cancel')
  async cancelPush(@TypedParam('id') id: number) {
    await this.pushService.cancelPush(id);
    return { message: 'Push cancelled.' };
  }

  @TypedRoute.Post('/push/:id/abort')
  async abortPush(@TypedParam('id') id: number) {
    await this.pushService.abortPush(id);
    return { message: 'Push aborted.' };
  }

  @TypedRoute.Delete('/push/:id')
  async removePush(@TypedParam('id') id: number) {
    await this.pushService.removePush(id);
    return { message: 'Push notification removed successfully.' };
  }
```

The `as any` on returning routes matches the surrounding file: nestia's typed stringify serialises these optional-heavy shapes to `{}` otherwise, as `getBanners` already notes.

- [ ] **Step 2: Build**

Run: `cd ~/Documents/backend/mindqna-server && npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Start the dev server and exercise the routes**

Run: `cd ~/Documents/backend/mindqna-server && npm run dev`

Then, against the dev server with an admin session:

```bash
# Unknown username must come back named, not as a silent success
curl -sS -X POST localhost:3000/admin/push -H 'content-type: application/json' \
  -d '{"title":"t","message":"m","target":"USER","sendNow":true,"userNames":["definitely-not-a-user"]}' | jq
# expect: 400 with code PUSH_UNKNOWN_USERNAMES and unknownUserNames: ["definitely-not-a-user"]

# Past pushAt must be rejected
curl -sS -X POST localhost:3000/admin/push -H 'content-type: application/json' \
  -d '{"title":"t","message":"m","target":"ALL","locale":"ko","sendNow":false,"pushAt":"2020-01-01T00:00:00.000Z"}' | jq
# expect: 400 mentioning the future

curl -sS 'localhost:3000/admin/push?page=1' | jq '.items[0]'
# expect: the §4.7 shape, including status and sentCount

curl -sS 'localhost:3000/admin/push/target-count?locale=ko' | jq
# expect: { "count": <~443000 on production-shaped data>, "isApproximate": true }
# and NOT a 400 from :id parsing "target-count" as a number
```

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/admin/admin.controller.ts
git commit -m "feat(push): add push detail, cancel and abort routes"
```

---

### Task 9: Rewrite the cron and switch its gate (SERVER)

The behaviour change lands here. Everything the cron needs now exists.

**Files:**
- Modify: `src/fcm/cron/fcm-admin.cron.ts` (full rewrite)
- Modify: `src/fcm/fcm.module.ts` if the provider list changes

**Interfaces:**
- Consumes: `CRON_DISABLED` (Task 1); `runAdminPushTick`, `SenderDeps` (Task 6)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Replace the cron file**

Replace `src/fcm/cron/fcm-admin.cron.ts` entirely:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { messaging } from 'firebase-admin';
import { ExecutionCalculator } from 'src/common/decorators/execution-calculator.decorator';
import { CRON_DISABLED } from 'src/common/cron.const';
import { runAdminPushTick, SenderDeps } from 'src/fcm/admin-push/admin-push-sender';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FcmAdminCron {
  /**
   * A send runs to completion in one invocation — the cursor already gives
   * resumability, so a per-tick budget would only add claim churn. This flag is what
   * stops the next tick from starting a second runner over the same row.
   */
  private isRunning = false;

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: CRON_DISABLED })
  @ExecutionCalculator()
  async sendAdminPush() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await runAdminPushTick(this.deps());
    } catch (error) {
      Logger.error('admin push tick failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  private deps(): SenderDeps {
    return {
      now: () => new Date(),
      prisma: this.prisma as unknown as SenderDeps['prisma'],
      messaging: () => messaging() as unknown as ReturnType<SenderDeps['messaging']>,
    };
  }
}
```

The topic path, the `$transaction` wrapper, the `isProduction = NODE_ENV === 'staging'` checks, the `userName` filter and all `PushMeta` writes are deleted with this file.

- [ ] **Step 2: Verify the deleted behaviours are really gone**

Run:
```bash
cd ~/Documents/backend/mindqna-server
grep -rn "prod-\${locale}\|dev-\${locale}\|'staging'\|userName:" src/fcm
grep -rn "NODE_APP_INSTANCE" src | grep -v cron.const
```
Expected: no output from the first command; no output from the second (Task 1 left `fcm-admin.cron.ts` as the last holdout and this task cleared it).

- [ ] **Step 3: Build and run the full server suite**

Run:
```bash
cd ~/Documents/backend/mindqna-server
npx tsc --noEmit -p tsconfig.json
npx jest
```
Expected: build clean; all suites pass

- [ ] **Step 4: End-to-end on dev**

With the dev server running and `NODE_ENV=production NODE_APP_INSTANCE=0` set for a local batch process (or by temporarily inverting `CRON_DISABLED` in a scratch build — do not commit that), create a per-user push to your own username with `sendNow: true` and confirm within two minutes:

```sql
SELECT id, status, targetCount, sentCount, failedCount, startedAt, finishedAt, lastError
  FROM AdminPush ORDER BY id DESC LIMIT 1;
```
Expected: `status = 'SENT'`, `sentCount = 1`, and the notification arrives on the device.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/fcm/cron/fcm-admin.cron.ts src/fcm/fcm.module.ts
git commit -m "fix(push): run the admin push cron on the batch server

The gate read NODE_ENV !== 'staging' while the other eleven crons read
'production', so the send ran only in mindbridge-stg — a process whose env
points at the production database and Firebase project. It now shares
CRON_DISABLED with the rest and runs where the other crons run.

Topic broadcast, the transaction wrapping the FCM calls, the userName filter
that would have thrown, and the PushMeta write amplification all go with it."
```

---

### Task 10: Chunk `sendPushToUsers` (SERVER)

`sendEachForMulticast` caps at 500 tokens. The admin path no longer calls this method, but `space-member.service.ts:269` does, so the cap still needs handling.

**Files:**
- Modify: `src/fcm/fcm.service.ts:121-146`
- Create: `src/fcm/fcm-chunk.ts`
- Create: `src/fcm/fcm-chunk.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `chunk<T>(items: T[], size: number): T[][]`

- [ ] **Step 1: Write the failing test**

Create `src/fcm/fcm-chunk.spec.ts`:

```ts
import { chunk } from './fcm-chunk';

describe('chunk', () => {
  it('splits into runs of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns a single run when the input fits', () => {
    expect(chunk([1, 2], 500)).toEqual([[1, 2]]);
  });

  it('returns nothing for an empty input', () => {
    expect(chunk([], 500)).toEqual([]);
  });

  it('handles exactly one full run', () => {
    const items = Array.from({ length: 500 }, (_, i) => i);
    expect(chunk(items, 500)).toHaveLength(1);
  });

  it('splits 501 into two, which is the case that fails today', () => {
    const items = Array.from({ length: 501 }, (_, i) => i);
    const runs = chunk(items, 500);
    expect(runs).toHaveLength(2);
    expect(runs[1]).toEqual([500]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/fcm-chunk.spec.ts`
Expected: FAIL — `Cannot find module './fcm-chunk'`

- [ ] **Step 3: Write minimal implementation**

Create `src/fcm/fcm-chunk.ts`:

```ts
/** sendEachForMulticast rejects more than 500 tokens in one call. */
export const FCM_MULTICAST_LIMIT = 500;

export function chunk<T>(items: T[], size: number): T[][] {
  const runs: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    runs.push(items.slice(i, i + size));
  }
  return runs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/backend/mindqna-server && npx jest src/fcm/fcm-chunk.spec.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Apply it in `sendPushToUsers`**

In `src/fcm/fcm.service.ts`, add `import { chunk, FCM_MULTICAST_LIMIT } from './fcm-chunk';` and replace the tail of `sendPushToUsers` (the `if (tokens.length > 0) await messaging().sendEachForMulticast({...})` block) with:

```ts
    for (const run of chunk(tokens, FCM_MULTICAST_LIMIT)) {
      await messaging().sendEachForMulticast({
        tokens: run,
        notification: { body: title },
        ...(action
          ? { data: { spaceId: action.spaceId, deepLinkUrl: `mindqna://${action.path}` } }
          : {}),
      });
    }
```

Leave the rest of the method — including its `PushMeta` write — alone. That write serves the in-app path, which is out of scope.

- [ ] **Step 6: Build and run the suite**

Run:
```bash
cd ~/Documents/backend/mindqna-server
npx tsc --noEmit -p tsconfig.json
npx jest src/fcm
```
Expected: build clean; all fcm suites pass

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/backend/mindqna-server
git add src/fcm/fcm-chunk.ts src/fcm/fcm-chunk.spec.ts src/fcm/fcm.service.ts
git commit -m "fix(fcm): chunk sendPushToUsers at the 500-token multicast limit"
```

---

### Task 11: Wire up the admin test runner (ADMIN)

This repo has five `.test.ts` files written against `node:test` and no way to run them: there is no runner dependency and no `test` script. `node --experimental-strip-types --test` fails on extensionless ESM imports; `tsx` resolves them.

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm test` and `pnpm test <path>`

- [ ] **Step 1: Confirm the tests currently cannot run**

Run: `cd ~/Documents/frontend/mindqna-admin && node --experimental-strip-types --test src/components/page/space/services/space-coin-cache.test.ts`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for the extensionless import

- [ ] **Step 2: Add the runner**

Run: `cd ~/Documents/frontend/mindqna-admin && pnpm add -D tsx`

- [ ] **Step 3: Add the script**

In `package.json`, add to `scripts`:

```json
    "test": "tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 4: Run the existing suite**

Run: `cd ~/Documents/frontend/mindqna-admin && pnpm test`
Expected: PASS — the five existing test files all run

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add package.json pnpm-lock.yaml
git commit -m "chore(test): make the existing node:test files runnable

Five .test.ts files were committed against node:test with no runner dependency
and no script, so none of them has ever been executed. node's own --test cannot
resolve their extensionless imports; tsx can."
```

---

### Task 12: Push API client (ADMIN)

**Files:**
- Modify: `src/client/push.ts` (full rewrite)

**Interfaces:**
- Consumes: the server routes from Task 8
- Produces: `AdminPushItem`, `AdminPushStatus`, `AdminPushTarget`, `CreatePushParams`, `UpdatePushParams`, `PushUnknownUserNamesError`, and `getPushes`, `getPush`, `getPushTargetCount`, `createPush`, `updatePush`, `cancelPush`, `abortPush`, `removePush`

- [ ] **Step 1: Rewrite the client**

Replace `src/client/push.ts`:

```ts
import client from './@base';
import { Locale, QueryResultWithPagination } from './types';

export type AdminPushStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED' | 'ABORTED';
export type AdminPushTarget = 'ALL' | 'USER';

export type AdminPushItem = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  imgUrl: string | null;
  target: AdminPushTarget;
  locale: Locale | null;
  userNames: string[] | null;
  pushAt: string;
  status: AdminPushStatus;
  targetCount: number | null;
  /** True for broadcasts: an exact count would need an unindexed scan. */
  targetCountIsApproximate: boolean;
  sentCount: number;
  failedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePushParams = {
  title: string;
  message: string;
  target: AdminPushTarget;
  sendNow: boolean;
  pushAt?: string;
  locale?: Locale;
  userNames?: string[];
  link?: string;
  imgUrl?: string;
};

export type UpdatePushParams = CreatePushParams & { id: number };

/** The server names the usernames it could not find; the form shows them inline. */
export class PushUnknownUserNamesError extends Error {
  constructor(readonly unknownUserNames: string[]) {
    super(`Unknown usernames: ${unknownUserNames.join(', ')}`);
    this.name = 'PushUnknownUserNamesError';
  }
}

function rethrow(error: unknown): never {
  const data = (error as { response?: { data?: { code?: string; unknownUserNames?: string[] } } })?.response?.data;
  if (data?.code === 'PUSH_UNKNOWN_USERNAMES' && data.unknownUserNames) {
    throw new PushUnknownUserNamesError(data.unknownUserNames);
  }
  throw error;
}

export async function getPushes(page: number, locale?: string[], status?: string[]) {
  const res = await client.get<QueryResultWithPagination<AdminPushItem>>('/push', {
    params: { page, locale, status },
  });
  return res.data;
}

export async function getPush(id: number) {
  const res = await client.get<AdminPushItem>(`/push/${id}`);
  return res.data;
}

/** Feeds the compose-time estimate; the admin has no other way to know the size. */
export async function getPushTargetCount(locale: Locale) {
  const res = await client.get<{ count: number; isApproximate: boolean }>('/push/target-count', {
    params: { locale },
  });
  return res.data;
}

export async function createPush(params: CreatePushParams) {
  try {
    const res = await client.post<AdminPushItem>('/push', params);
    return res.data;
  } catch (error) {
    rethrow(error);
  }
}

export async function updatePush({ id, ...body }: UpdatePushParams) {
  try {
    const res = await client.put<AdminPushItem>(`/push/${id}`, body);
    return res.data;
  } catch (error) {
    rethrow(error);
  }
}

export async function cancelPush(id: number) {
  await client.post(`/push/${id}/cancel`);
}

export async function abortPush(id: number) {
  await client.post(`/push/${id}/abort`);
}

export async function removePush(id: number) {
  await client.delete(`/push/${id}`);
}
```

The `console.log('body', body)` at the old :13 is gone, `userNames` is an array in both directions, and the type carries the fields the old `AdminPush` omitted.

- [ ] **Step 2: Typecheck**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: errors only in `PushForm.tsx` and `PushList.tsx`, which Tasks 17 and 18 rewrite. Note them and continue.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/client/push.ts
git commit -m "feat(push): match the client to the new push API

Drops a production console.log, makes userNames an array on both sides rather
than an array here and a string on the server, and surfaces the named unknown
usernames the server now returns."
```

---

### Task 13: `push-status` service (ADMIN)

**Files:**
- Create: `src/components/page/push/services/push-status.ts`
- Create: `src/components/page/push/services/push-status.test.ts`

**Interfaces:**
- Consumes: `AdminPushStatus` (Task 12)
- Produces:
  - `type PushAction = 'view' | 'edit' | 'cancel' | 'abort' | 'duplicate' | 'delete'`
  - `PUSH_STATUS_META: Record<AdminPushStatus, { label: string; variant: string }>`
  - `allowedActions(status: AdminPushStatus, sentCount: number): PushAction[]`

- [ ] **Step 1: Write the failing test**

Create `src/components/page/push/services/push-status.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { PUSH_STATUS_META, allowedActions } from './push-status';

test('every status has a Korean label and a dot badge variant', () => {
  const statuses = ['SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELED', 'ABORTED'] as const;
  for (const status of statuses) {
    const meta = PUSH_STATUS_META[status];
    assert.ok(meta.label.length > 0, `${status} has no label`);
    // DESIGN.md: status uses dot variants, soft is reserved for categories.
    assert.ok(meta.variant.startsWith('dot'), `${status} uses ${meta.variant}`);
  }
});

test('a scheduled push can be edited, cancelled and deleted', () => {
  assert.deepEqual(allowedActions('SCHEDULED', 0), ['edit', 'cancel', 'delete']);
});

test('a sending push can only be viewed or aborted', () => {
  assert.deepEqual(allowedActions('SENDING', 12_340), ['view', 'abort']);
});

test('a completed push that reached someone cannot be deleted', () => {
  assert.deepEqual(allowedActions('SENT', 300_000), ['view']);
});

test('a completed push that reached nobody can be deleted', () => {
  assert.deepEqual(allowedActions('SENT', 0), ['view', 'delete']);
});

test('a failed push offers duplication, and deletion only if it reached nobody', () => {
  assert.deepEqual(allowedActions('FAILED', 0), ['view', 'duplicate', 'delete']);
  assert.deepEqual(allowedActions('FAILED', 30_000), ['view', 'duplicate']);
});

test('a cancelled push offers duplication', () => {
  assert.deepEqual(allowedActions('CANCELED', 0), ['view', 'duplicate', 'delete']);
});

test('an aborted push keeps its record when it reached someone', () => {
  assert.deepEqual(allowedActions('ABORTED', 12_340), ['view']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test src/components/page/push/services/push-status.test.ts`
Expected: FAIL — cannot resolve `./push-status`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/page/push/services/push-status.ts`:

```ts
import type { AdminPushStatus } from '@/client/push';

export type PushAction = 'view' | 'edit' | 'cancel' | 'abort' | 'duplicate' | 'delete';

/**
 * Dot variants throughout: DESIGN.md reserves soft variants for categories and
 * gives status a coloured dot beside neutral text.
 */
export const PUSH_STATUS_META: Record<AdminPushStatus, { label: string; variant: string }> = {
  SCHEDULED: { label: '예약됨', variant: 'dotInfo' },
  SENDING: { label: '발송 중', variant: 'dotWarning' },
  SENT: { label: '발송 완료', variant: 'dotSuccess' },
  FAILED: { label: '실패', variant: 'dotDanger' },
  CANCELED: { label: '취소됨', variant: 'dotNeutral' },
  ABORTED: { label: '중단됨', variant: 'dotNeutral' },
};

/**
 * Deletion turns on delivery rather than status: one delivered message makes the row a
 * record, and a row that reached nobody is just a mistake worth clearing.
 */
export function allowedActions(status: AdminPushStatus, sentCount: number): PushAction[] {
  const deletable: PushAction[] = sentCount === 0 ? ['delete'] : [];

  switch (status) {
    case 'SCHEDULED':
      return ['edit', 'cancel', ...deletable];
    case 'SENDING':
      return ['view', 'abort'];
    case 'SENT':
    case 'ABORTED':
      return ['view', ...deletable];
    case 'FAILED':
    case 'CANCELED':
      return ['view', 'duplicate', ...deletable];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test src/components/page/push/services/push-status.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/components/page/push/services/push-status.ts src/components/page/push/services/push-status.test.ts
git commit -m "feat(push): derive labels and row actions from status"
```

---

### Task 14: `push-progress` service (ADMIN)

**Files:**
- Create: `src/components/page/push/services/push-progress.ts`
- Create: `src/components/page/push/services/push-progress.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `computeProgress(input: { sentCount: number; failedCount: number; targetCount: number | null }): { ratio: number | null; percent: number | null }`
  - `estimateRemainingMs(input: { processed: number; targetCount: number | null; startedAt: string | null; now: Date }): number | null`
  - `estimateDurationMs(targetCount: number): { minMs: number; maxMs: number }`

- [ ] **Step 1: Write the failing test**

Create `src/components/page/push/services/push-progress.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { computeProgress, estimateDurationMs, estimateRemainingMs } from './push-progress';

test('progress counts both delivered and failed as processed', () => {
  assert.deepEqual(computeProgress({ sentCount: 30, failedCount: 10, targetCount: 200 }), {
    ratio: 0.2,
    percent: 20,
  });
});

test('progress is unknown when the target is unknown', () => {
  assert.deepEqual(computeProgress({ sentCount: 30, failedCount: 0, targetCount: null }), {
    ratio: null,
    percent: null,
  });
});

test('progress never exceeds 100 percent, since the broadcast target is approximate', () => {
  assert.deepEqual(computeProgress({ sentCount: 250, failedCount: 0, targetCount: 200 }), {
    ratio: 1,
    percent: 100,
  });
});

test('progress is zero, not NaN, when the target is zero', () => {
  assert.deepEqual(computeProgress({ sentCount: 0, failedCount: 0, targetCount: 0 }), {
    ratio: 0,
    percent: 0,
  });
});

test('remaining time extrapolates from the observed rate', () => {
  // 100 processed in 60s -> 900 left -> 540s
  const remaining = estimateRemainingMs({
    processed: 100,
    targetCount: 1000,
    startedAt: '2026-08-20T12:00:00.000Z',
    now: new Date('2026-08-20T12:01:00.000Z'),
  });
  assert.equal(remaining, 540_000);
});

test('remaining time is unknown before anything has been processed', () => {
  assert.equal(
    estimateRemainingMs({
      processed: 0,
      targetCount: 1000,
      startedAt: '2026-08-20T12:00:00.000Z',
      now: new Date('2026-08-20T12:00:30.000Z'),
    }),
    null,
  );
});

test('remaining time is unknown without a start time or a target', () => {
  const now = new Date('2026-08-20T12:01:00.000Z');
  assert.equal(estimateRemainingMs({ processed: 10, targetCount: 100, startedAt: null, now }), null);
  assert.equal(
    estimateRemainingMs({ processed: 10, targetCount: null, startedAt: '2026-08-20T12:00:00.000Z', now }),
    null,
  );
});

test('the pre-send estimate brackets the real ko broadcast at 15 to 44 minutes', () => {
  // 442,953 token holders measured 2026-08-20 -> 886 batches at 1-3s each.
  const { minMs, maxMs } = estimateDurationMs(442_953);
  assert.equal(Math.round(minMs / 60_000), 15);
  assert.equal(Math.round(maxMs / 60_000), 44);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test src/components/page/push/services/push-progress.test.ts`
Expected: FAIL — cannot resolve `./push-progress`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/page/push/services/push-progress.ts`:

```ts
const BATCH_SIZE = 500;
/** Observed range for one 500-token multicast; see spec §2.7. */
const MS_PER_BATCH_MIN = 1_000;
const MS_PER_BATCH_MAX = 3_000;

export function computeProgress(input: {
  sentCount: number;
  failedCount: number;
  targetCount: number | null;
}): { ratio: number | null; percent: number | null } {
  const { sentCount, failedCount, targetCount } = input;
  if (targetCount === null) return { ratio: null, percent: null };
  if (targetCount === 0) return { ratio: 0, percent: 0 };

  // A broadcast target is approximate, so processed can overshoot it. Clamp.
  const ratio = Math.min(1, (sentCount + failedCount) / targetCount);
  return { ratio, percent: Math.round(ratio * 100) };
}

export function estimateRemainingMs(input: {
  processed: number;
  targetCount: number | null;
  startedAt: string | null;
  now: Date;
}): number | null {
  const { processed, targetCount, startedAt, now } = input;
  if (!startedAt || targetCount === null || processed <= 0) return null;

  const elapsed = now.getTime() - new Date(startedAt).getTime();
  if (elapsed <= 0) return null;

  const remaining = Math.max(0, targetCount - processed);
  return Math.round((elapsed / processed) * remaining);
}

/**
 * Shown before the send is created. A broadcast is tens of minutes, and an operator who
 * does not know that reads the wait as a failure.
 */
export function estimateDurationMs(targetCount: number): { minMs: number; maxMs: number } {
  const batches = Math.ceil(targetCount / BATCH_SIZE);
  return { minMs: batches * MS_PER_BATCH_MIN, maxMs: batches * MS_PER_BATCH_MAX };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test src/components/page/push/services/push-progress.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/components/page/push/services/push-progress.ts src/components/page/push/services/push-progress.test.ts
git commit -m "feat(push): compute send progress and duration estimates"
```

---

### Task 15: `push-form-payload` service (ADMIN)

**Files:**
- Create: `src/components/page/push/services/push-form-payload.ts`
- Create: `src/components/page/push/services/push-form-payload.test.ts`

**Interfaces:**
- Consumes: `CreatePushParams` (Task 12)
- Produces:
  - `type PushFormValues = { sendMode: 'now' | 'schedule'; pushAt: string; target: 'ALL' | 'USER'; locale: string; userNames: string; title: string; message: string; link: string; imgUrl: string }`
  - `parseUserNamesInput(raw: string): string[]`
  - `toCreatePushParams(values: PushFormValues): CreatePushParams`

- [ ] **Step 1: Write the failing test**

Create `src/components/page/push/services/push-form-payload.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseUserNamesInput, toCreatePushParams } from './push-form-payload';

const base = {
  sendMode: 'now' as const,
  pushAt: '',
  target: 'ALL' as const,
  locale: 'ko',
  userNames: '',
  title: '공지',
  message: '내용',
  link: '',
  imgUrl: '',
};

test('an immediate broadcast sends sendNow and omits pushAt', () => {
  const dto = toCreatePushParams(base);
  assert.equal(dto.sendNow, true);
  assert.equal(dto.pushAt, undefined);
  assert.equal(dto.locale, 'ko');
  assert.equal(dto.userNames, undefined);
});

test('a scheduled broadcast sends an ISO pushAt', () => {
  const dto = toCreatePushParams({ ...base, sendMode: 'schedule', pushAt: '2026-08-25T10:00' });
  assert.equal(dto.sendNow, false);
  assert.equal(dto.pushAt, new Date('2026-08-25T10:00').toISOString());
});

test('a per-user send drops locale, because the server ignores it', () => {
  const dto = toCreatePushParams({ ...base, target: 'USER', userNames: 'alice, bob' });
  assert.equal(dto.locale, undefined);
  assert.deepEqual(dto.userNames, ['alice', 'bob']);
});

test('empty optional strings become undefined rather than empty strings', () => {
  const dto = toCreatePushParams({ ...base, link: '  ', imgUrl: '' });
  assert.equal(dto.link, undefined);
  assert.equal(dto.imgUrl, undefined);
});

test('link and imgUrl are trimmed and passed through when present', () => {
  const dto = toCreatePushParams({ ...base, link: ' https://a.example ', imgUrl: 'https://b.example' });
  assert.equal(dto.link, 'https://a.example');
  assert.equal(dto.imgUrl, 'https://b.example');
});

test('parseUserNamesInput trims, drops blanks and de-duplicates', () => {
  assert.deepEqual(parseUserNamesInput('alice, bob ,,alice,'), ['alice', 'bob']);
  assert.deepEqual(parseUserNamesInput('   '), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test src/components/page/push/services/push-form-payload.test.ts`
Expected: FAIL — cannot resolve `./push-form-payload`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/page/push/services/push-form-payload.ts`:

```ts
import type { CreatePushParams, Locale } from '@/client/push';

export type PushFormValues = {
  sendMode: 'now' | 'schedule';
  /** datetime-local value, e.g. 2026-08-25T10:00. Empty when sendMode is 'now'. */
  pushAt: string;
  target: 'ALL' | 'USER';
  locale: string;
  userNames: string;
  title: string;
  message: string;
  link: string;
  imgUrl: string;
};

/** Mirrors the server's parseUserNames so the "N명 인식됨" counter matches what is stored. */
export function parseUserNamesInput(raw: string): string[] {
  const parsed = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return [...new Set(parsed)];
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toCreatePushParams(values: PushFormValues): CreatePushParams {
  const isNow = values.sendMode === 'now';
  const isBroadcast = values.target === 'ALL';

  return {
    title: values.title.trim(),
    message: values.message.trim(),
    target: values.target,
    sendNow: isNow,
    // The server stamps the time when sendNow is true, so the client clock never enters the data.
    pushAt: isNow ? undefined : new Date(values.pushAt).toISOString(),
    // A per-user send ignores locale; sending one would put a value in the column that means nothing.
    locale: isBroadcast ? (values.locale as Locale) : undefined,
    userNames: isBroadcast ? undefined : parseUserNamesInput(values.userNames),
    link: optional(values.link),
    imgUrl: optional(values.imgUrl),
  };
}
```

If `Locale` is not exported from `@/client/push`, import it from `@/client/types` instead — that is where the other client modules take it from.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsx --test src/components/page/push/services/push-form-payload.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/components/page/push/services/push-form-payload.ts src/components/page/push/services/push-form-payload.test.ts
git commit -m "feat(push): map form values onto the create-push payload"
```

---

### Task 16: Status badge and progress meter (ADMIN)

**Files:**
- Create: `src/components/page/push/PushStatusBadge.tsx`
- Create: `src/components/page/push/PushProgressMeter.tsx`

**Interfaces:**
- Consumes: `PUSH_STATUS_META` (Task 13); `computeProgress` (Task 14); `AdminPushStatus` (Task 12)
- Produces: `<PushStatusBadge status failedCount />`, `<PushProgressMeter sentCount failedCount targetCount isApproximate />`

- [ ] **Step 1: Write the badge**

Create `src/components/page/push/PushStatusBadge.tsx`:

```tsx
import type { AdminPushStatus } from '@/client/push';
import { Badge } from '@/components/ui/badge';
import { PUSH_STATUS_META } from './services/push-status';

type Props = {
  status: AdminPushStatus;
  failedCount: number;
};

function PushStatusBadge({ status, failedCount }: Props) {
  const meta = PUSH_STATUS_META[status];

  return (
    <div className='space-y-0.5'>
      <Badge variant={meta.variant as never}>{meta.label}</Badge>
      {/* Text, not colour alone: DESIGN.md forbids signalling by colour. */}
      {failedCount > 0 && (
        <div className='text-xs text-slate-600 tabular-nums'>실패 {failedCount.toLocaleString()}건</div>
      )}
    </div>
  );
}

export default PushStatusBadge;
```

- [ ] **Step 2: Write the meter**

Create `src/components/page/push/PushProgressMeter.tsx`:

```tsx
import { computeProgress } from './services/push-progress';

type Props = {
  sentCount: number;
  failedCount: number;
  targetCount: number | null;
  isApproximate: boolean;
};

function PushProgressMeter({ sentCount, failedCount, targetCount, isApproximate }: Props) {
  const { ratio, percent } = computeProgress({ sentCount, failedCount, targetCount });

  return (
    <div className='space-y-1'>
      <div className='tabular-nums text-slate-900'>
        {sentCount.toLocaleString()}
        <span className='text-slate-500'>
          {' / '}
          {targetCount === null ? '—' : `${isApproximate ? '약 ' : ''}${targetCount.toLocaleString()}`}
          {percent !== null && ` · ${percent}%`}
        </span>
      </div>
      {ratio !== null && (
        // Bounded width, matching CouponUsageMeter: a full-cell bar reads as an input underline.
        <div
          className='h-1 w-20 overflow-hidden rounded-full bg-border'
          role='progressbar'
          aria-label={`발송 ${sentCount} / ${targetCount ?? 0}`}
          aria-valuenow={sentCount}
          aria-valuemin={0}
          aria-valuemax={targetCount ?? 0}
        >
          <div className='h-full bg-slate-900' style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default PushProgressMeter;
```

- [ ] **Step 3: Typecheck**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: no new errors from these two files

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/components/page/push/PushStatusBadge.tsx src/components/page/push/PushProgressMeter.tsx
git commit -m "feat(push): add the status badge and progress meter"
```

---

### Task 17: Rebuild the list (ADMIN)

**Files:**
- Create: `src/components/page/push/PushColumns.tsx`
- Modify: `src/components/page/push/PushList.tsx` (full rewrite)
- Modify: `src/hooks/usePushes.ts`

**Interfaces:**
- Consumes: `getPushes`, `cancelPush`, `abortPush`, `removePush`, `AdminPushItem` (Task 12); `allowedActions` (Task 13); Tasks 16's two components
- Produces: `createPushColumns(actions: PushRowActions): ColumnDef<AdminPushItem>[]`; `usePushes({ page, locale, status })` returning `{ items, totalPage, isLoading, refetch }`

- [ ] **Step 1: Add conditional polling to the hook**

Replace `src/hooks/usePushes.ts`:

```ts
import { getPushes } from '@/client/push';
import { useQuery } from '@tanstack/react-query';

type Props = {
  page: number;
  locale?: string[];
  status?: string[];
};

const SENDING_POLL_MS = 5_000;

function usePushes({ page, locale, status }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pushes', page, locale, status],
    queryFn: () => getPushes(page, locale, status),
    // Polling is switched on by a condition, never left on by default — the same
    // reason cf6f664 stopped the coupon aggregate refetching on window focus.
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.status === 'SENDING') ? SENDING_POLL_MS : false,
  });

  return {
    items: data?.items ?? [],
    totalPage: data?.pageInfo.totalPage ?? 1,
    isLoading,
    refetch,
  };
}

export default usePushes;
```

- [ ] **Step 2: Write the columns**

Create `src/components/page/push/PushColumns.tsx`:

```tsx
import type { AdminPushItem } from '@/client/push';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import PushProgressMeter from './PushProgressMeter';
import PushStatusBadge from './PushStatusBadge';
import { allowedActions } from './services/push-status';

export interface PushRowActions {
  onView: (row: AdminPushItem) => void;
  onEdit: (row: AdminPushItem) => void;
  onCancel: (row: AdminPushItem) => void;
  onAbort: (row: AdminPushItem) => void;
  onDuplicate: (row: AdminPushItem) => void;
  onDelete: (row: AdminPushItem) => void;
}

/**
 * An absolute timestamp alone makes the reader subtract today's date to learn what it
 * means. Pairing it with the status lets the row explain itself, as CouponColumns does.
 */
function relativeTime(iso: string, now = dayjs()): string {
  const at = dayjs(iso);
  const minutes = at.diff(now, 'minute');
  if (minutes > 0) {
    if (minutes < 60) return `${minutes}분 후`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)}시간 후`;
    return `${Math.round(minutes / (60 * 24))}일 후`;
  }
  const past = -minutes;
  if (past < 1) return '방금';
  if (past < 60) return `${past}분 전`;
  if (past < 60 * 24) return `${Math.round(past / 60)}시간 전`;
  return `${Math.round(past / (60 * 24))}일 전`;
}

export const createPushColumns = (actions: PushRowActions): ColumnDef<AdminPushItem>[] => [
  { accessorKey: 'id', header: '번호', size: 64 },
  {
    id: 'target',
    header: '대상',
    cell: ({ row }) => {
      const item = row.original;
      return item.target === 'ALL'
        ? `전체 · ${item.locale ?? '—'}`
        : `개인 · ${(item.userNames ?? []).length}명`;
    },
  },
  {
    accessorKey: 'title',
    header: '제목',
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate text-slate-900'>{row.original.title}</div>
        <div className='truncate text-xs text-slate-600'>{row.original.message}</div>
      </div>
    ),
  },
  {
    accessorKey: 'pushAt',
    header: '발송 시각',
    cell: ({ row }) => (
      <div className='tabular-nums'>
        <div>{dayjs(row.original.pushAt).format('YYYY.MM.DD HH:mm')}</div>
        <div className='text-xs text-slate-600'>{relativeTime(row.original.pushAt)}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => (
      <PushStatusBadge status={row.original.status} failedCount={row.original.failedCount} />
    ),
  },
  {
    id: 'progress',
    header: '진행',
    cell: ({ row }) => (
      <PushProgressMeter
        sentCount={row.original.sentCount}
        failedCount={row.original.failedCount}
        targetCount={row.original.targetCount}
        isApproximate={row.original.targetCountIsApproximate}
      />
    ),
  },
  {
    id: 'actions',
    header: '',
    size: 48,
    meta: { useTruncateTooltip: false },
    cell: ({ row }) => {
      const item = row.original;
      const labels: Record<string, string> = {
        view: '상세 보기',
        edit: '수정',
        cancel: '예약 취소',
        abort: '발송 중단',
        duplicate: '복제하여 새로 등록',
        delete: '삭제',
      };
      const handlers: Record<string, () => void> = {
        view: () => actions.onView(item),
        edit: () => actions.onEdit(item),
        cancel: () => actions.onCancel(item),
        abort: () => actions.onAbort(item),
        duplicate: () => actions.onDuplicate(item),
        delete: () => actions.onDelete(item),
      };
      return (
        <TableRowActions
          items={allowedActions(item.status, item.sentCount).map((action) => ({
            label: labels[action],
            onSelect: handlers[action],
            destructive: action === 'delete' || action === 'abort',
          }))}
        />
      );
    },
  },
];
```

Open `src/components/shared/ui/table-row-actions.tsx` first and match its actual prop names — if it takes something other than `items`/`label`/`onSelect`/`destructive`, adapt this call site rather than changing the shared component.

- [ ] **Step 3: Rewrite the list**

Replace `src/components/page/push/PushList.tsx`:

```tsx
import { abortPush, AdminPushItem, cancelPush, removePush } from '@/client/push';
import ConfirmDialog from '@/components/shared/ui/confirm-dialog';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import usePushes from '@/hooks/usePushes';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import PushForm from './PushForm';
import { createPushColumns } from './PushColumns';
import { PUSH_STATUS_META } from './services/push-status';

type Pending = { kind: 'cancel' | 'abort' | 'delete'; row: AdminPushItem } | null;

function PushList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[]; status?: string[] }>({});
  const [sheet, setSheet] = useState<{ mode: 'create' | 'edit' | 'view'; row?: AdminPushItem } | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const { items, totalPage, isLoading } = usePushes({ page, locale: filter.locale, status: filter.status });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pushes'] });

  const confirmCopy: Record<'cancel' | 'abort' | 'delete', (row: AdminPushItem) => { title: string; body: string }> = {
    cancel: (row) => ({ title: '예약을 취소할까요?', body: `"${row.title}" 은 발송되지 않습니다.` }),
    abort: (row) => ({
      title: '발송을 중단할까요?',
      // Abort is not undo, and the operator must know that before pressing it.
      body: `"${row.title}" 의 남은 발송을 멈춥니다. 이미 발송된 ${row.sentCount.toLocaleString()}명에게는 취소되지 않습니다.`,
    }),
    delete: (row) => ({ title: '삭제할까요?', body: `"${row.title}" 을 목록에서 지웁니다.` }),
  };

  const run = async () => {
    if (!pending) return;
    const { kind, row } = pending;
    try {
      if (kind === 'cancel') await cancelPush(row.id);
      if (kind === 'abort') await abortPush(row.id);
      if (kind === 'delete') await removePush(row.id);
      toast.success('처리되었습니다');
      await invalidate();
    } catch {
      toast.error('처리하지 못했습니다');
    } finally {
      setPending(null);
    }
  };

  const columns = createPushColumns({
    onView: (row) => setSheet({ mode: 'view', row }),
    onEdit: (row) => setSheet({ mode: 'edit', row }),
    onDuplicate: (row) => setSheet({ mode: 'create', row }),
    onCancel: (row) => setPending({ kind: 'cancel', row }),
    onAbort: (row) => setPending({ kind: 'abort', row }),
    onDelete: (row) => setPending({ kind: 'delete', row }),
  });

  return (
    <>
      <FilterBar>
        <Select
          value={filter.locale?.[0] ?? ''}
          onValueChange={(v) => setFilter((p) => ({ ...p, locale: v ? [v] : undefined }))}
        >
          <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='언어' />
          </SelectTrigger>
          <SelectContent>
            {['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'].map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.status?.[0] ?? ''}
          onValueChange={(v) => setFilter((p) => ({ ...p, status: v ? [v] : undefined }))}
        >
          <SelectTrigger className={`w-[140px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='상태' />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PUSH_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='flex-1' />
        <Button className={FILTER_CONTROL_CLASS} onClick={() => setSheet({ mode: 'create' })}>
          푸시 등록
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={{ total: totalPage * 10, page, pageSize: 10, onChange: setPage }}
      />

      {sheet && (
        <PushForm
          mode={sheet.mode}
          initial={sheet.row}
          onClose={() => setSheet(null)}
          onSaved={async () => {
            setSheet(null);
            await invalidate();
          }}
        />
      )}

      {pending && (
        <ConfirmDialog
          open
          title={confirmCopy[pending.kind](pending.row).title}
          description={confirmCopy[pending.kind](pending.row).body}
          onConfirm={run}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

export default PushList;
```

Match `ConfirmDialog`'s real prop names by reading how `CouponList.tsx` uses it; adapt this call site if they differ.

- [ ] **Step 4: Typecheck**

Run: `cd ~/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: the only remaining errors are the missing `PushForm` props, which Task 18 supplies

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/components/page/push/PushColumns.tsx src/components/page/push/PushList.tsx src/hooks/usePushes.ts
git commit -m "feat(push): rebuild the push list around the send lifecycle

The list showed neither pushAt nor any result and offered no actions, while the
delete endpoint had no call site at all. It now carries send time, status,
progress and per-status row actions, and polls only while something is sending."
```

---

### Task 18: Rebuild the form as a side sheet (ADMIN)

**Files:**
- Modify: `src/components/page/push/PushForm.tsx` (full rewrite)
- Create: `src/components/page/push/PushSummaryRail.tsx`
- Delete: `src/pages/marketing/push/new.tsx`, `src/pages/push/new.tsx`

**Interfaces:**
- Consumes: `createPush`, `updatePush`, `getPushTargetCount`, `PushUnknownUserNamesError`, `AdminPushItem` (Task 12); `toCreatePushParams`, `parseUserNamesInput` (Task 15); `estimateDurationMs`, `estimateRemainingMs` (Task 14)
- Produces: `<PushForm mode initial onClose onSaved />`

- [ ] **Step 1: Write the summary rail**

Create `src/components/page/push/PushSummaryRail.tsx`:

```tsx
import type { AdminPushItem } from '@/client/push';
import dayjs from 'dayjs';
import { estimateDurationMs } from './services/push-progress';

type ComposeProps = {
  mode: 'compose';
  target: 'ALL' | 'USER';
  locale: string;
  recipientCount: number;
  when: string;
};

type ResultProps = { mode: 'result'; row: AdminPushItem };

function minutes(ms: number) {
  return Math.max(1, Math.round(ms / 60_000));
}

function PushSummaryRail(props: ComposeProps | ResultProps) {
  if (props.mode === 'result') {
    const { row } = props;
    return (
      <dl className='space-y-3 text-sm'>
        <Row label='대상' value={row.target === 'ALL' ? `전체 · ${row.locale ?? '—'}` : `개인 ${(row.userNames ?? []).length}명`} />
        <Row label='도달' value={row.sentCount.toLocaleString()} />
        <Row label='실패' value={row.failedCount.toLocaleString()} />
        <Row label='시작' value={row.startedAt ? dayjs(row.startedAt).format('MM.DD HH:mm') : '—'} />
        <Row label='종료' value={row.finishedAt ? dayjs(row.finishedAt).format('MM.DD HH:mm') : '—'} />
        {row.lastError && (
          <div className='rounded-md border border-border p-2 text-xs text-slate-600'>{row.lastError}</div>
        )}
      </dl>
    );
  }

  const { target, locale, recipientCount, when } = props;
  const estimate = estimateDurationMs(recipientCount);
  const who = target === 'ALL' ? `${locale} 사용자` : `지정한 ${recipientCount}명`;

  return (
    <div className='space-y-3 text-sm'>
      <p className='text-slate-900'>
        {who}에게 {when}에 발송합니다.
      </p>
      {/* Tens of minutes is the fact an operator most needs before pressing save. */}
      <p className='text-xs text-slate-600'>
        예상 소요 {minutes(estimate.minMs)}~{minutes(estimate.maxMs)}분
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-baseline justify-between gap-2'>
      <dt className='text-slate-600'>{label}</dt>
      <dd className='tabular-nums text-slate-900'>{value}</dd>
    </div>
  );
}

export default PushSummaryRail;
```

- [ ] **Step 2: Rewrite the form**

Replace `src/components/page/push/PushForm.tsx`. Build it on the same side-sheet primitive `CouponForm.tsx` uses — open that file first and mirror its sheet wrapper, its `grid-cols-[140px_minmax(0,1fr)]` definition rows and its `grid-cols-[minmax(0,1fr)_220px]` body/rail split rather than inventing a layout.

```tsx
import {
  createPush,
  getPushTargetCount,
  PushUnknownUserNamesError,
  updatePush,
  type AdminPushItem,
} from '@/client/push';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import PushSummaryRail from './PushSummaryRail';
import { parseUserNamesInput, toCreatePushParams, type PushFormValues } from './services/push-form-payload';

type Props = {
  mode: 'create' | 'edit' | 'view';
  /** Present for edit, view, and duplicate-as-new. */
  initial?: AdminPushItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};


function toValues(initial?: AdminPushItem): PushFormValues {
  return {
    sendMode: 'now',
    pushAt: '',
    target: initial?.target ?? 'ALL',
    locale: initial?.locale ?? 'ko',
    userNames: (initial?.userNames ?? []).join(','),
    title: initial?.title ?? '',
    message: initial?.message ?? '',
    link: initial?.link ?? '',
    imgUrl: initial?.imgUrl ?? '',
  };
}

function PushForm({ mode, initial, onClose, onSaved }: Props) {
  const [values, setValues] = useState<PushFormValues>(() => toValues(initial));
  const [unknown, setUnknown] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PushFormValues>(key: K, value: PushFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const recipients = useMemo(() => parseUserNamesInput(values.userNames), [values.userNames]);
  const isReadOnly = mode === 'view';

  // Hardcoding a broadcast size guarantees it drifts; ask the server, which counts the
  // same way the sender does. Only meaningful for ALL, so it is disabled otherwise.
  const { data: targetCount } = useQuery({
    queryKey: ['push-target-count', values.locale],
    queryFn: () => getPushTargetCount(values.locale as never),
    enabled: values.target === 'ALL' && !!values.locale,
    staleTime: 5 * 60_000,
  });

  const submit = async () => {
    if (values.sendMode === 'schedule' && new Date(values.pushAt).getTime() <= Date.now()) {
      toast.error('발송 시각은 현재보다 미래여야 합니다');
      return;
    }
    setSaving(true);
    setUnknown([]);
    try {
      const payload = toCreatePushParams(values);
      if (mode === 'edit' && initial) await updatePush({ id: initial.id, ...payload });
      else await createPush(payload);
      toast.success(mode === 'edit' ? '수정되었습니다' : '등록되었습니다');
      await onSaved();
    } catch (error) {
      if (error instanceof PushUnknownUserNamesError) {
        setUnknown(error.unknownUserNames);
        toast.error('존재하지 않는 사용자가 있습니다');
      } else {
        toast.error('저장하지 못했습니다');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isReadOnly && initial) {
    return (
      <Sheet onClose={onClose} title='발송 상세'>
        <div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px] overflow-hidden'>
          <div className='overflow-auto'>
            <DefRow label='제목'>{initial.title}</DefRow>
            <DefRow label='내용'>{initial.message}</DefRow>
            <DefRow label='링크'>{initial.link ?? '—'}</DefRow>
            <DefRow label='이미지'>{initial.imgUrl ?? '—'}</DefRow>
            <DefRow label='발송 시각'>{dayjs(initial.pushAt).format('YYYY.MM.DD HH:mm')}</DefRow>
          </div>
          <aside className='border-l border-border p-4'>
            <PushSummaryRail mode='result' row={initial} />
          </aside>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} title={mode === 'edit' ? '푸시 수정' : '푸시 등록'}>
      <div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px] overflow-hidden'>
        <div className='overflow-auto'>
          <DefRow label='발송 시점*'>
            <RadioGroup
              value={values.sendMode}
              onValueChange={(v) => set('sendMode', v as PushFormValues['sendMode'])}
              className='flex gap-4'
            >
              <Choice id='send-now' value='now' label='즉시 발송' />
              <Choice id='send-schedule' value='schedule' label='예약' />
            </RadioGroup>
            {values.sendMode === 'schedule' ? (
              <Input
                type='datetime-local'
                className='mt-2'
                value={values.pushAt}
                onChange={(e) => set('pushAt', e.target.value)}
              />
            ) : (
              <p className='mt-1 text-xs text-slate-600'>즉시 발송은 최대 1분 내에 시작됩니다</p>
            )}
          </DefRow>

          <DefRow label='발송 대상*'>
            <RadioGroup
              value={values.target}
              onValueChange={(v) => set('target', v as PushFormValues['target'])}
              className='flex gap-4'
            >
              <Choice id='target-all' value='ALL' label='전체' />
              <Choice id='target-user' value='USER' label='개인' />
            </RadioGroup>
          </DefRow>

          {/* Exclusive on purpose: a per-user send ignores locale, so showing it would lie. */}
          {values.target === 'ALL' ? (
            <DefRow label='언어*'>
              <RadioGroup
                value={values.locale}
                onValueChange={(v) => set('locale', v)}
                className='flex flex-wrap gap-4'
              >
                {['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'].map((l) => (
                  <Choice key={l} id={`locale-${l}`} value={l} label={l} />
                ))}
              </RadioGroup>
            </DefRow>
          ) : (
            <DefRow label='사용자*'>
              <Textarea
                placeholder='username 을 콤마로 구분해 입력하세요'
                value={values.userNames}
                onChange={(e) => set('userNames', e.target.value)}
              />
              <p className='mt-1 text-xs text-slate-600'>{recipients.length}명 인식됨</p>
              {unknown.length > 0 && (
                <p className='mt-1 text-xs text-red-600'>존재하지 않는 사용자: {unknown.join(', ')}</p>
              )}
            </DefRow>
          )}

          <DefRow label='제목*'>
            <Input value={values.title} onChange={(e) => set('title', e.target.value)} maxLength={100} />
          </DefRow>
          <DefRow label='내용*'>
            <Textarea value={values.message} onChange={(e) => set('message', e.target.value)} maxLength={500} />
          </DefRow>
          <DefRow label='링크'>
            <Input
              placeholder='탭했을 때 이동할 URL'
              value={values.link}
              onChange={(e) => set('link', e.target.value)}
            />
          </DefRow>
          <DefRow label='이미지 URL'>
            <Input
              placeholder='알림에 표시할 이미지 URL'
              value={values.imgUrl}
              onChange={(e) => set('imgUrl', e.target.value)}
            />
          </DefRow>
        </div>

        <aside className='border-l border-border p-4'>
          <PushSummaryRail
            mode='compose'
            target={values.target}
            locale={values.locale}
            recipientCount={values.target === 'ALL' ? targetCount?.count ?? 0 : recipients.length}
            when={values.sendMode === 'now' ? '지금' : dayjs(values.pushAt).format('YYYY.MM.DD HH:mm')}
          />
        </aside>
      </div>

      <footer className='flex justify-end gap-2 border-t border-border p-4'>
        <Button variant='outline' onClick={onClose}>
          취소
        </Button>
        <Button onClick={submit} disabled={saving}>
          저장
        </Button>
      </footer>
    </Sheet>
  );
}

function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='grid grid-cols-[140px_minmax(0,1fr)] items-start gap-4 border-b border-border px-4 py-2.5 last:border-b-0'>
      <Label className='pt-2 text-slate-600'>{label}</Label>
      <div className='min-w-0'>{children}</div>
    </div>
  );
}

function Choice({ id, value, label }: { id: string; value: string; label: string }) {
  return (
    <div className='flex items-center gap-2'>
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

export default React.memo(PushForm);
```

`Sheet` is a placeholder for whatever `CouponForm.tsx` uses for its side sheet — read that file and use the same component and the same `lg` (720px) width token rather than adding a new one.

- [ ] **Step 3: Delete the registration pages**

Run:
```bash
cd ~/Documents/frontend/mindqna-admin
git rm src/pages/marketing/push/new.tsx src/pages/push/new.tsx
grep -rn "marketing/push/new\|'/push/new'" src
```
Expected after the grep: no references. If the sidebar, route labels or the command palette link to `/marketing/push/new`, repoint them at `/marketing/push/list`.

- [ ] **Step 4: Typecheck, lint and build**

Run:
```bash
cd ~/Documents/frontend/mindqna-admin
npx tsc --noEmit
pnpm lint
pnpm build
```
Expected: no errors

- [ ] **Step 5: Run the full admin test suite**

Run: `cd ~/Documents/frontend/mindqna-admin && pnpm test`
Expected: PASS — the three new suites plus the five pre-existing files

- [ ] **Step 6: Exercise the UI against the dev server**

Run `pnpm dev`, open `/marketing/push/list` and confirm:
- 푸시 등록 opens the sheet; 전체 shows 언어 and hides 사용자; 개인 does the reverse
- a nonexistent username is rejected and named inline
- a scheduled push appears as 예약됨 with its send time and relative phrase
- 예약 취소 asks for confirmation naming the push, then the row reads 취소됨
- a sending push polls without a page reload, and 발송 중단 warns that delivered messages are not recalled
- a row with `sentCount > 0` offers no 삭제

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/frontend/mindqna-admin
git add src/components/page/push
git commit -m "feat(push): rebuild the push form as a side sheet

The form hardcoded pushAt to now and isActive to true, so nothing could ever be
scheduled or deactivated, and its edit path was unreachable because no page
passed an id. It now controls send time, keeps language and recipients mutually
exclusive, names unknown usernames inline, and states the expected duration
before the send is created."
```

---

## Post-implementation

Neither repo is deployed by this plan. Follow spec §7 in order — SQL before the server deploy, and note that the server deploy is the moment sending moves off `mindbridge-stg`. Spec §8 tracks the three unreviewed `AdminPush` rows that must be looked at before the production SQL runs, and the legacy column drop in §3.3.
