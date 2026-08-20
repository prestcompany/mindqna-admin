# Admin Push Redesign — Design

- **Date**: 2026-08-20
- **Status**: Approved (brainstorm)
- **Repos**: `mindqna-admin` (frontend), `mindqna-server` (backend)
- **Migration**: manual SQL, applied by the operator (not `prisma migrate`). The statements live in §3.2 of this document; no `.sql` file is produced.

## 1. Problem & Goal

Admin push is the one broadcast channel the product has, and it has never worked reliably. The in-app event pushes (card, diary, schedule, pet) go through `FcmService.sendPushToProfiles` from ~40 call sites and are fine. Everything below concerns the separate admin path only.

### 1.1 What is broken

**The cron is bound to the wrong process.** `fcm-admin.cron.ts:16` gates on `NODE_ENV !== 'staging'`. Every one of the other eleven crons in the repo gates on `NODE_ENV !== 'production'`. Production crons run in `mindbridge-batch` (`NODE_ENV=production`, `ENABLE_CRON=true`); `app.module.ts:61` omits `ScheduleModule` entirely when `ENABLE_CRON === 'false'`, so `mindbridge-prod` has no crons at all. The admin push cron therefore runs only in `mindbridge-stg`.

That process is not a staging server in any meaningful sense: `.env.staging` and `.env.production` carry the **same `DATABASE_URL` and the same `FIREBASE_PROJECT_ID`** (verified by hashing the values). `isProduction = NODE_ENV === 'staging'` at `:72` and `:120` evaluates true there, so the send targets every real user of the locale and publishes to the `prod-{locale}` topic. In effect `mindbridge-stg` is a second production process whose sole job is admin push, and it is the only place the feature exists.

The gate has been wrong more often than right:

| Date | Commit | Gate | Ran? |
|---|---|---|---|
| 2024-05-29 | `81913f8` | `// @Cron(...)` commented out | no |
| 2024-08-08 | `e3fcc99` | `NODE_NEV !== 'production'` — typo, always undefined | no |
| 2024-09-13 | `adec690` | `NODE_APP_INSTANCE !== '0'` only | yes, every env |
| 2024-11-11 | `46f1b3d` | `NODE_ENV !== 'production'` | yes |
| 2024-11-11 | `0fd252d` | `NODE_ENV !== 'staging'` | no — the only PM2 app was `NODE_ENV=production` |
| 2025-12-10 | `b80ec66` | unchanged | `mindbridge-stg` created; runs there only |
| 2026-02-13 | `396a116` | unchanged | crons moved to `mindbridge-batch`; still excluded |

`46f1b3d` set the correct gate and `0fd252d` reverted it the same day, in a commit titled "어드민 푸시발송 최적화". The feature has worked as designed for roughly two months of its two-year life.

**Per-user scheduled sends cannot work.** Three independent defects stack:

- `push.service.ts:40` persists `{ title, message, pushAt, locale, isActive, link, imgUrl }` — neither `userNames` nor `target`. `AdminPush` has a `userNames` column that is never written and no `target` column at all. The cron's `if (push.userNames)` branch is therefore unreachable; every stored push takes the broadcast path.
- If it were reachable it would throw. `fcm-admin.cron.ts:132` filters on `userName`, but the Prisma field is `username` (`schema.prisma:13`, `@unique`). This is the only place in the server that spells it with a capital N. It type-checks only because the transaction client is declared `tx: any`. At runtime Prisma raises `Unknown argument 'userName'`, and because the whole tick is wrapped in `$transaction` (`:22`) every other push in that tick rolls back with it.
- The immediate path resolves a different identifier again. `push.service.ts:44-50` splits `userNames` and passes the pieces as `userIds` to `FcmService.sendPushToUsers`, which queries `where: { id: { in: userIds } }` — `User.id` is a uuid. The admin form labels the field 사용자 ID and its placeholder says 유저 코드. Four names for one thing. A zero-row match returns successfully and the admin shows a success toast.

**Scheduling does not exist.** `PushForm.tsx:59` hardcodes `pushAt: new Date().toISOString()` and `:60` hardcodes `isActive: true`. There is no date input and no active toggle anywhere in the UI.

**Delivery outcomes are discarded.** No caller anywhere inspects the `sendEachForMulticast` response, so `UNREGISTERED` and `INVALID_ARGUMENT` tokens are never cleared and the token column rots indefinitely. `sendPushAll` writes `sentAt` but never `isSuccess`, while `sendPushUsers` writes both, so the success flag means nothing. `messaging().send({ topic })` at `:102` is not checked either — `sentAt` is stamped unconditionally.

**The link never arrives.** Both `sendPushAll` and `sendPushUsers` destructure `link` and never use it. The admin's 링크 URL field is stored and dropped.

**Chunking is inconsistent.** The cron batches at 500, but `FcmService.sendPushToUsers` sends every token in one call; `sendEachForMulticast` caps at 500 and fails wholesale beyond it.

**The table cannot hold the data.** `userNames` is `VARCHAR(191)`, which is ten to twenty usernames. `link` and `imgUrl` are `VARCHAR(191)`, shorter than a UTM-tagged marketing URL or a signed S3 URL.

**No tests.** `src/fcm/` and `src/admin/push/` contain zero spec files.

**The admin cannot manage what it creates.** The list shows number, locale, title, message, and an `isActive` badge — no `pushAt`, no `sentAt`, no result, no row actions. `removePush` in `client/push.ts:27` has no call site. `updatePush` is called from `PushForm.tsx:64` but no page ever passes the `id` prop, so it is unreachable too. `client/push.ts:13` ships a `console.log` to production, `client/push.ts:55` types `userNames` as `string[]` against a server DTO of `string`, and the `AdminPush` type omits `sentAt`, `imgUrl`, and `userNames`.

### 1.2 Goal

Make admin push a feature an operator can trust: schedule it, watch it, stop it, and read what happened afterwards. Move the send onto the batch server with the other eleven crons, replace topic broadcast with token multicast so delivery is observable, and rebuild the admin around the send's lifecycle.

### In scope

- Cron gate corrected to `production`; the send runs on `mindbridge-batch`.
- Topic broadcast removed; all admin sends are token multicast.
- `AdminPush` gains an explicit state machine and resumable send progress.
- Scheduled and immediate sends; edit and cancel before send; abort during send.
- Per-user targeting by `username`, validated at save time.
- FCM response handling: success/failure counts and dead-token cleanup.
- 500-token chunking in `FcmService.sendPushToUsers`, which keeps a caller in `space-member.service.ts:269` after the admin path stops using it.
- Column widening; `User(locale, id)` index for the batch query.
- Admin list, side sheet, row actions, conditional polling.
- Tests for the send loop and the CRUD validation, following each repo's existing convention.
- A shared cron-gate constant, so the gate cannot drift a fourth time.

### Out of scope (YAGNI)

- **Marketing push consent.** The schema has no user-level opt-out. `PushBlockMeta` is per-profile and scoped to in-space social notifications; `PushPolicyMeta` is card-remind bookkeeping. Adding consent is deferred, but the target query is shaped so a single filter can be inserted later.
- **Re-sending a completed push.** Handled by "duplicate as new" in the row actions rather than by splitting definition from execution into two tables.
- **A/B or segment targeting.** Locale and explicit username lists only.
- **Dropping the legacy columns.** `isActive`, `isSuccess`, and `sentAt` stop being read but stay in the table for one production cycle (§3.3).

## 2. Decisions

### 2.1 Token multicast everywhere; the topic path is deleted

Topic send is one API call and scales without effort, but it reports nothing: no delivery counts, no invalid-token feedback, no way to exclude anyone, and the subscription itself happens in the app where the server cannot verify it. Nothing in the server ever calls `subscribeToTopic`, so the whole mechanism rests on an app-side assumption that has never been checked from this side.

Token multicast costs wall-clock time and buys observability, dead-token cleanup, and a place to hang a consent filter later. Both admin paths — broadcast and per-user — become the same code.

### 2.2 Progress lives on `AdminPush` (approach A), not in a separate job table

A separate `AdminPushJob` would allow several executions per definition and partial retries. Neither is a current requirement: one definition is one send. Keeping progress on the row means the list renders status and progress without a join, and the state field alone decides what the operator may do. When re-sending becomes a real requirement, splitting A into two tables is a mechanical change.

### 2.3 The send runs to completion in one invocation, checkpointed per batch

Resumability comes from the cursor, which is committed after every batch. A per-tick time budget adds nothing on top of that and costs a claim query every minute. So the cron claims once and loops until done, guarded by an in-process `isRunning` flag; later ticks no-op. A crash or a deploy loses at most the batch in flight, and the next boot picks the row up because it is still `SENDING`.

This makes a per-batch FCM timeout mandatory. Without one, a single hung call strands `isRunning` and stops every future send.

**A failed batch ends the tick rather than retrying in place.** The success path runs to completion, but the failure path yields: the sender persists the incremented failure counter and `lastError`, leaves the row `SENDING` with the cursor unmoved, and returns. The next tick resumes from the DB cursor a minute later.

The first draft retried three times inside the loop, which made the three-strike rule useless — the attempts burned back-to-back in about fifteen milliseconds, so a two-second FCM outage would mark a half-delivered broadcast `FAILED`, and `FAILED` never resumes. Spacing is what turns a repeat count into a transient-fault filter, and the cron's own cadence supplies it for free: three ticks is roughly three minutes of tolerance, with no sleep inside the loop and no extra state. The cost is that a genuinely dead send takes three minutes to reach `FAILED` instead of milliseconds, which is the right trade for a channel that reaches hundreds of thousands of people.

### 2.4 Deletion is gated on `sentCount === 0`, not on status

A push that reached even one device is a delivery record and must not be erasable. A push that reached nobody is a mistake and should be cleanable regardless of how it ended. Writing the rule against status misses the case that matters: a `FAILED` row that had already delivered to 30,000 people.

### 2.5 `sendNow` is a flag, not a timestamp the client computes

The current form writes `pushAt: new Date()`. Sending an explicit `sendNow: true` and letting the server stamp the time keeps client clock skew out of the data and lets the "`pushAt` must be in the future" rule apply without a special case.

Immediate sends still wait for the next tick — up to 60 seconds. The API server runs with `ENABLE_CRON=false` and must not perform a send inside an HTTP request; a broadcast takes tens of minutes (§2.7). The admin presents this as 예약됨 · 곧 발송.

### 2.6 Admin pushes write no `PushMeta` at all

Broadcast previously inserted one `PushMeta` row per user per send — hundreds of thousands of rows each time — and the app cannot read them: `me.service.getPushMetas` filters `spaceId: space.id` while admin rows carry `spaceId = null`. The rows were pure write amplification.

Per-user sends are dropped too, for consistency: the same rows are equally unreadable in the app. The cost is that `UserPushesTab` in the admin (which queries `where: { user: { username } }` with no space filter, so it *would* have shown them) no longer lists admin sends. Answering "what announcement did this user get" moves to the push list, where a per-user send names its recipients in `userNames`.

### 2.7 A broadcast takes tens of minutes, and the UI says so

`sendEachForMulticast` dispatches per-token requests multiplexed over HTTP/2 — roughly 1–3 s per 500-token batch. At one batch at a time that is 7,500–22,500 users per minute.

Measured 2026-08-20, users holding an FCM token by locale: **ko 442,953**, en 48,583, ja 24,333, es 5,856, zhTw 1,968, id 844, zh 474 — 525,011 in total. The largest broadcast is therefore **886 batches, 15–44 minutes**. Concurrency is an env-var knob defaulting to 1; raising it to 3–5 brings a ko broadcast to roughly 5–15 minutes at proportionally higher FCM and DB load.

Only one push is processed at a time. A second push scheduled for the same minute waits for the first to finish. Serial is the safe default, but an operator who does not know this will read the wait as a failure, so the form's summary rail states the estimate before the send is created.

### 2.8 Membership is not a snapshot

The cursor walks `User.id`. A user who signs up mid-send receives the push if their id sorts after the cursor and misses it otherwise; the same applies to a locale change mid-send. Materialising an exact recipient list would mean a few hundred thousand rows of temporary state per send. The non-determinism is accepted and documented.

### 2.9 `targetCount` is approximate for broadcasts

An exact count needs `fcmToken IS NOT NULL`, which no index narrows. Counting on `locale` alone is indexed and cheap, and drives a progress bar that does not need to be exact. The API returns `targetCountIsApproximate` and the UI renders 약 442,953명. Per-user sends report an exact count.

The admin cannot derive this number itself, and hardcoding a figure in the frontend guarantees it drifts as the user base grows. `GET /admin/push/target-count?locale=` returns the same approximate count the sender records, so the compose-time estimate and the progress bar are computed from one source.

### 2.10 Per-user sends ignore `locale`

The cron currently ANDs `locale` with the username list, so naming a user whose locale differs silently drops them. Naming someone is an explicit instruction. `locale` becomes nullable and per-user rows store `NULL`; the form hides the language selector when 개인 is chosen.

## 3. Data Model

### 3.1 Prisma schema

```prisma
enum AdminPushTarget { ALL USER }
enum AdminPushStatus { SCHEDULED SENDING SENT FAILED CANCELED ABORTED }

model AdminPush {
  id           Int             @id @default(autoincrement())

  // Definition — mutable only while SCHEDULED
  title        String
  message      String          @db.VarChar(500)
  link         String?         @db.VarChar(1024)
  imgUrl       String?         @db.VarChar(1024)
  locale       Locale?                            // NULL for target = USER
  target       AdminPushTarget
  userNames    String?         @db.Text           // comma-separated; NULL for target = ALL
  pushAt       DateTime

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

  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([status, pushAt])
}
```

State machine:

```
SCHEDULED ──(pushAt reached, sender claims)──> SENDING ──(cursor exhausted)──> SENT
    │                                             │
    │                                             ├──(3 consecutive batch failures)──> FAILED
    │                                             ├──(grace window exceeded)─────────> FAILED
    └──(admin cancels)──> CANCELED                └──(admin aborts)─────────────────> ABORTED
```

Edit and cancel are allowed only in `SCHEDULED`. Abort is allowed only in `SENDING`. Delete is allowed whenever `sentCount === 0`.

`User` also gains an index:

```prisma
model User {
  // ...
  @@index([locale, id])
}
```

### 3.2 Migration SQL

Run **step 1 first and read the output** before running step 2.

#### Step 1 — read-only survey

```sql
-- (a) Rows that would resurrect and broadcast on the first tick after deploy.
SELECT COUNT(*) AS resurrect_risk
  FROM `AdminPush`
 WHERE `isActive` = 1 AND `sentAt` IS NULL AND `pushAt` <= NOW(3);

-- (b) Where the backfill will send each row.
SELECT CASE
         WHEN `sentAt` IS NOT NULL                  THEN 'sent            -> SENT'
         WHEN `isActive` = 1 AND `pushAt` >  NOW(3) THEN 'future_active   -> SCHEDULED'
         WHEN `isActive` = 1 AND `pushAt` <= NOW(3) THEN 'past_unsent     -> CANCELED'
         ELSE                                            'inactive_unsent -> CANCELED'
       END AS bucket,
       COUNT(*) AS cnt
  FROM `AdminPush`
 GROUP BY bucket;

-- (c) Eyeball the most recent rows.
SELECT `id`,`title`,`locale`,`pushAt`,`isActive`,`isSuccess`,`sentAt`,`userNames`
  FROM `AdminPush` ORDER BY `id` DESC LIMIT 20;

-- (d) Send volume. batches = with_token / 500.
SELECT `locale`, COUNT(*) AS users, SUM(`fcmToken` IS NOT NULL) AS with_token
  FROM `User` GROUP BY `locale`;

-- (e) Skip the User index statement below if (locale, id) already exists.
SHOW INDEX FROM `User`;

-- (f) Below 8.0, drop the ALGORITHM/LOCK clause from the User index statement.
SELECT VERSION();
```

If (a) is non-zero, review those rows before continuing. The admin form hardcoded `isActive = true` between 2024-09 and 2024-11, so unsent rows from that period are expected.

**Measured 2026-08-20: (a) returned 3.** Those three rows have not been inspected individually yet. The backfill routes them to `CANCELED`, which is correct if their `pushAt` falls in the 2024-09 to 2024-11 window — the form hardcoded `isActive = true` then and the sender was gated off, so registrations accumulated unsent. A materially more recent `pushAt` would instead mean an operator tried to send something that never went out, in which case the content should be re-registered rather than buried. Resolve this before running step 2 in production.

#### Step 2 — apply

```sql
-- 2-1. New columns. status defaults to CANCELED on purpose: with SCHEDULED,
-- every existing row would read as "scheduled" in the window before the backfill.
ALTER TABLE `AdminPush`
  ADD COLUMN `target`  ENUM('ALL','USER') NOT NULL DEFAULT 'ALL' AFTER `locale`,
  ADD COLUMN `status`  ENUM('SCHEDULED','SENDING','SENT','FAILED','CANCELED','ABORTED')
             NOT NULL DEFAULT 'CANCELED' AFTER `pushAt`,
  ADD COLUMN `cursorUserId`        VARCHAR(191) NULL,
  ADD COLUMN `targetCount`         INTEGER NULL,
  ADD COLUMN `sentCount`           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `failedCount`         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `startedAt`           DATETIME(3) NULL,
  ADD COLUMN `finishedAt`          DATETIME(3) NULL,
  ADD COLUMN `lastError`           TEXT NULL;

-- 2-2. Widths. 191 chars of userNames is ten to twenty usernames; 191 chars of
-- link or imgUrl truncates UTM-tagged and signed URLs. locale becomes nullable
-- because it is meaningless for a per-user send.
ALTER TABLE `AdminPush`
  MODIFY COLUMN `message`   VARCHAR(500)  NOT NULL,
  MODIFY COLUMN `link`      VARCHAR(1024) NULL,
  MODIFY COLUMN `imgUrl`    VARCHAR(1024) NULL,
  MODIFY COLUMN `userNames` TEXT          NULL,
  MODIFY COLUMN `locale`    ENUM('ko','en','zh','zhTw','ja','es','id') NULL;

-- 2-3. Backfill. WHERE id > 0 satisfies safe-update mode; it means every row.
UPDATE `AdminPush`
   SET `target` = CASE WHEN `userNames` IS NULL OR `userNames` = '' THEN 'ALL' ELSE 'USER' END
 WHERE `id` > 0;

-- SCHEDULED is granted only to future pushAt. Without that clause the first
-- cron tick after deploy broadcasts every historical unsent row.
UPDATE `AdminPush`
   SET `status` = CASE
         WHEN `sentAt` IS NOT NULL                  THEN 'SENT'
         WHEN `isActive` = 1 AND `pushAt` > NOW(3)  THEN 'SCHEDULED'
         ELSE                                            'CANCELED'
       END,
       `finishedAt` = `sentAt`
 WHERE `id` > 0;

-- 2-4. Indexes.
ALTER TABLE `AdminPush`
  ADD INDEX `AdminPush_status_pushAt_idx` (`status`, `pushAt`);

-- Serves WHERE locale = ? AND id > ? ORDER BY id LIMIT 500. This is the only
-- slow statement here; schedule it for a quiet window.
ALTER TABLE `User`
  ADD INDEX `User_locale_id_idx` (`locale`, `id`), ALGORITHM=INPLACE, LOCK=NONE;

-- 2-5. Restore the default now that the backfill is done.
ALTER TABLE `AdminPush` ALTER COLUMN `status` SET DEFAULT 'SCHEDULED';
```

#### Step 2 verification

```sql
SELECT `status`, COUNT(*) FROM `AdminPush` GROUP BY `status`;
SELECT `target`, COUNT(*) FROM `AdminPush` GROUP BY `target`;

-- Must be zero. A SCHEDULED row with a past pushAt means the backfill went wrong.
SELECT COUNT(*) AS must_be_zero
  FROM `AdminPush` WHERE `status` = 'SCHEDULED' AND `pushAt` <= NOW(3);

-- key should read AdminPush_status_pushAt_idx.
EXPLAIN SELECT * FROM `AdminPush`
 WHERE `status` = 'SCHEDULED' AND `pushAt` <= NOW(3)
 ORDER BY `pushAt` LIMIT 1;

-- key should read User_locale_id_idx.
EXPLAIN SELECT `id`, `fcmToken` FROM `User`
 WHERE `locale` = 'ko' AND `id` > '' AND `fcmToken` IS NOT NULL
 ORDER BY `id` LIMIT 500;

SHOW CREATE TABLE `AdminPush`;
```

### 3.3 Step 3 — legacy columns, optional

`isActive`, `isSuccess` and `sentAt` are left out of the Prisma model entirely (§3.1). Each either
carries a default or is nullable, so a database that still has them accepts inserts that omit them,
and Prisma ignores columns it does not declare. Dropping them is therefore tidying, not a
prerequisite — the code runs correctly either way.

Run it only after the new code has completed a production cycle. Column drops are irreversible.

```sql
ALTER TABLE `AdminPush`
  DROP COLUMN `isActive`,
  DROP COLUMN `isSuccess`,
  DROP COLUMN `sentAt`;
```

## 4. Backend (`mindqna-server`)

### 4.1 File layout

```
src/common/cron.const.ts              new — shared gate constant
src/fcm/cron/fcm-admin.cron.ts        rewritten — claim and delegate
src/fcm/admin-push/
  admin-push-rules.ts                 new, pure — transitions, grace window, deletability
  fcm-response.ts                     new, pure — multicast response -> counts + dead tokens
  user-names.ts                       new, pure — comma string <-> string[]
  admin-push-sender.ts                new, I/O — the send loop
src/admin/push/push.service.ts        rewritten — CRUD and validation only
src/admin/admin.dto.ts                CreatePushDto / UpdatePushDto revised
```

`FcmService.createPush` and `FcmService.sendPushToProfiles` are near-duplicates today; the former only differs by swallowing errors. They are left alone — the in-app path is out of scope — but `FcmService.sendPushToUsers` loses its admin caller and its missing 500-token chunking is fixed in place, since `space-member.service.ts:269` still uses it.

### 4.2 The cron gate

```ts
// src/common/cron.const.ts
export const CRON_DISABLED =
  process.env.NODE_ENV !== 'production' || process.env.NODE_APP_INSTANCE !== '0';
```

All twelve crons import this. The condition has been written wrong twice (`NODE_NEV`, then `'staging'`); one constant removes the opportunity.

### 4.3 The send loop

One tick:

```
1. if (isRunning) return
2. row = findFirst({ status: SENDING })                      // resume first
        ?? findFirst({ status: SCHEDULED, pushAt: { lte: now, gte: now - 1h } },
                     { orderBy: { pushAt: 'asc' } })
   Two queries rather than one OR: MySQL will not use (status, pushAt)
   across an OR of two different status values.
3. if (row.status === SCHEDULED):
     { count } = updateMany({ where: { id, status: SCHEDULED },
                              data: { status: SENDING, startedAt: now, targetCount } })
     if (count === 0) return                                  // lost the race
4. loop until the cursor is exhausted
5. status = SENT, finishedAt = now
```

Rows whose `pushAt` is older than the one-hour grace window are moved to `FAILED` with an explanatory `lastError` rather than sent. A batch server that was down for a day must not wake up and broadcast yesterday's announcements.

`$transaction` is gone. Wrapping FCM calls and a full-table walk in a Prisma interactive transaction hits the 5-second default timeout, and rolling back the record of messages that were already delivered makes the state worse, not better. Each batch commits on its own.

One batch:

```ts
// Re-read status first: an abort issued mid-send must take effect within one batch.
if (await isAborted(id)) return;

const users = await prisma.user.findMany({
  where: {
    ...(target === 'ALL' ? { locale } : { username: { in: names } }),
    id: { gt: cursorUserId ?? '' },
    fcmToken: { not: null },
  },
  orderBy: { id: 'asc' },
  take: 500,
  select: { id: true, fcmToken: true },
});
if (users.length === 0) return DONE;

const res = await withTimeout(
  messaging().sendEachForMulticast({
    tokens: users.map((u) => u.fcmToken as string),
    notification: { title, body: message, imageUrl: imgUrl ?? undefined },
    ...(link && { data: { deepLinkUrl: link } }),
  }),
  FCM_BATCH_TIMEOUT_MS,
);

const { successCount, failureCount, deadTokenIndexes } = summarise(res);   // fcm-response.ts
await prisma.user.updateMany({
  where: { id: { in: deadTokenIndexes.map((i) => users[i].id) } },
  data: { fcmToken: null },
});
await prisma.adminPush.update({
  where: { id },
  data: {
    cursorUserId: users[users.length - 1].id,
    sentCount: { increment: successCount },
    failedCount: { increment: failureCount },
    consecutiveFailures: 0,
  },
});
```

The keyed cursor replaces `skip += users.length`, whose cost grows quadratically across hundreds of thousands of rows, and it doubles as the resume point.

Dead tokens are exactly `messaging/registration-token-not-registered` and `messaging/invalid-argument`. Other failure codes are counted but leave the token alone.

`data.deepLinkUrl` carries the admin's link. In-app pushes put a `mindqna://` scheme in this key; admin links are ordinary URLs and the app handles both.

No `PushMeta` is written for either target (§2.6).

If a batch throws for any reason other than per-token failure, the cursor does not move and `consecutiveFailures` increments. At three the row becomes `FAILED` with `lastError`, so a broken send stops rather than spinning silently.

Batch concurrency is `ADMIN_PUSH_BATCH_CONCURRENCY`, default `1`.

### 4.4 Endpoints

| Method | Path | Allowed states |
|---|---|---|
| `GET` | `/admin/push` | list: `page`, `locale?`, `status?` |
| `GET` | `/admin/push/:id` | detail (new) |
| `POST` | `/admin/push` | — |
| `PUT` | `/admin/push/:id` | `SCHEDULED` |
| `POST` | `/admin/push/:id/cancel` | `SCHEDULED` -> `CANCELED` |
| `POST` | `/admin/push/:id/abort` | `SENDING` -> `ABORTED` (new) |
| `DELETE` | `/admin/push/:id` | `sentCount === 0` |
| `GET` | `/admin/push/target-count` | `locale` query; approximate recipient count for the compose-time estimate (new) |

Cancel and abort are state transitions that leave a record; delete removes the row. They are separate operations because they answer different questions.

The admin API never calls FCM. `mindbridge-prod` has no crons and cannot run a multi-minute send inside a request.

### 4.5 Request DTO

```ts
interface CreatePushDto {
  title: string;              // <= 100
  message: string;            // <= 500
  target: 'ALL' | 'USER';
  sendNow: boolean;           // true -> server stamps pushAt = now
  pushAt?: string;            // required when sendNow is false, ISO 8601
  locale?: Locale;            // required for ALL, stored NULL for USER
  userNames?: string[];       // required for USER, 1..1000
  link?: string;
  imgUrl?: string;
}
```

`userNames` travels as an array and is stored as a comma-joined string, which also settles the current type disagreement between `client/push.ts` (`string[]`) and the server DTO (`string`).

### 4.6 Validation

Applied identically to `POST` and `PUT`:

| Condition | Response |
|---|---|
| `sendNow === false` and `pushAt` is in the past | `400` |
| `target === 'ALL'` and no `locale` | `400` |
| `target === 'USER'` and `userNames` empty | `400` |
| `target === 'USER'` and some names do not exist | `400 PUSH_UNKNOWN_USERNAMES` with `unknownUserNames: string[]` |
| edit or cancel of a row that is no longer `SCHEDULED` | `409` |
| abort of a row that is not `SENDING` | `409` |
| delete of a row with `sentCount > 0` | `409` |

Existence checking usernames at save time is what removes today's silent zero-match success.

### 4.7 Response

```ts
type AdminPushItem = {
  id: number;
  title: string; message: string; link: string | null; imgUrl: string | null;
  target: 'ALL' | 'USER';
  locale: Locale | null;
  userNames: string[] | null;
  pushAt: string;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED' | 'ABORTED';
  targetCount: number | null;
  targetCountIsApproximate: boolean;
  sentCount: number; failedCount: number;
  startedAt: string | null; finishedAt: string | null;
  lastError: string | null;
  createdAt: string; updatedAt: string;
};
```

The list keeps ten per page and `pageInfo.totalPage`, matching the other admin lists.

## 5. Frontend (`mindqna-admin`)

The coupon module (`3606de2`) is the newest pattern in this repo and this follows it directly.

### 5.1 File layout

```
src/components/page/push/
  PushList.tsx           rebuilt
  PushColumns.tsx        new   (cf. CouponColumns)
  PushStatusBadge.tsx    new   (cf. CouponStatusBadge)
  PushProgressMeter.tsx  new   (cf. CouponUsageMeter)
  PushSummaryRail.tsx    new   (cf. CouponSummaryRail)
  PushForm.tsx           rebuilt as a side sheet
  services/
    push-form-payload.ts  new, pure — form values -> CreatePushDto
    push-status.ts        new, pure — status -> badge variant + allowed actions
    push-progress.ts      new, pure — percentage and estimated remaining time
src/pages/marketing/push/new.tsx   deleted
src/pages/push/new.tsx             deleted (alias)
```

Registration moves from a dedicated page into the side sheet, matching the coupon module and DESIGN.md. Both `new` routes are removed.

### 5.2 List

| Column | Content |
|---|---|
| 번호 | `id` |
| 대상 | `전체 · ko` or `개인 · 12명` |
| 제목 | title, with the start of the body beneath it |
| 발송 시각 | `pushAt` plus a relative phrase (`3시간 후`, `2일 전`) |
| 상태 | `PushStatusBadge` |
| 진행 | `PushProgressMeter` — `12,340 / 약 442,953 · 3%` over a 1px bar |
| — | `TableRowActions` |

An absolute timestamp alone makes the reader subtract today's date to learn what it means; pairing it with status and a relative phrase lets the row explain itself, as `CouponColumns` already does.

Status uses dot badges — DESIGN.md reserves soft variants for categories:

| Status | Variant | Label |
|---|---|---|
| `SCHEDULED` | `dotInfo` | 예약됨 |
| `SENDING` | `dotWarning` | 발송 중 |
| `SENT` | `dotSuccess` | 발송 완료 |
| `FAILED` | `dotDanger` | 실패 |
| `CANCELED` | `dotNeutral` | 취소됨 |
| `ABORTED` | `dotNeutral` | 중단됨 |

A `SENT` row with `failedCount > 0` adds 실패 231건 as text beneath the badge; DESIGN.md forbids signalling by colour alone.

The filter bar gains a status select beside the existing locale select, with active filters rendered below as removable chips.

### 5.3 Row actions

| Status | Actions |
|---|---|
| `SCHEDULED` | 수정 · 예약 취소 · 삭제 |
| `SENDING` | 상세 보기 · 발송 중단 |
| `SENT` / `ABORTED` | 상세 보기 · 삭제 when `sentCount === 0` |
| `FAILED` / `CANCELED` | 상세 보기 · 복제하여 새로 등록 · 삭제 when `sentCount === 0` |

복제하여 새로 등록 covers the only real re-send case and is why §2.2 does not need a second table.

Cancel, abort, and delete all go through `confirm-dialog` naming the push by title. The abort dialog states that the 12,340 people already reached are not affected — abort is not undo, and that must be clear before the button is pressed.

### 5.4 Form

A `lg` (720px) side sheet with the coupon layout: a 140px label column and a 220px summary rail.

```
발송 시점*   ( ) 즉시 발송   (•) 예약     [2026-08-25 10:00]
             즉시 발송은 최대 1분 내에 시작됩니다
발송 대상*   (•) 전체        ( ) 개인
언어*        [ko]                          <- only when 전체
사용자*      [username, comma separated]   <- only when 개인
             12명 인식됨
제목*        [ ]
내용*        [ ]
링크         [ ]
이미지 URL   [ ]
```

Language and recipients are mutually exclusive, because a per-user send ignores locale (§2.10). The recipient field counts recognised names as you type, and a `PUSH_UNKNOWN_USERNAMES` response lists the unknown names inline. Past times are rejected client-side as well as server-side.

### 5.5 Summary rail

While composing, the rail states what the send will do in one sentence — `ko 사용자 약 442,953명에게 2026-08-25 10:00에 발송` — with the estimated duration from §2.7 beneath it. This is the place where "this takes tens of minutes" reaches the operator before they commit.

Opened on a send that has started, the rail becomes a result panel: target, delivered, failed, start and finish times, elapsed, and `lastError` when `FAILED`.

### 5.6 Polling

`usePushes` sets `refetchInterval` to 5s only while at least one row is `SENDING`, and clears it otherwise; the detail sheet does the same. `cf6f664` removed a coupon aggregate that refetched on every window focus for the same reason — polling is enabled by a condition, never by default.

### 5.7 Existing defects closed here

- `pushAt` hardcoded to now -> a send-time control
- `isActive` hardcoded to true -> replaced by the state machine, removed from the form
- `updatePush` unreachable -> wired to the edit sheet
- `removePush` never called -> wired to the row action
- `console.log` at `client/push.ts:13` -> removed
- `AdminPush` type missing `sentAt`/`imgUrl`/`userNames` -> replaced by §4.7
- `userNames` typed `string[]` against a `string` DTO -> array on the wire, joined in the DB
- unused `refetch` from `usePushes` -> replaced by conditional polling
- form stays put after save -> navigates back and invalidates `['pushes']`
- imgUrl placeholder reading 이동시킬 링크 URL을 입력하세요 -> corrected

## 6. Testing

### 6.1 Server (jest, `*.spec.ts`)

`admin-push-sender.spec.ts`, driven by fake `prisma` and `messaging` objects:

- the cursor advances to the last `User.id` of each batch, and an empty batch ends the send as `SENT`
- a row whose status flipped to `ABORTED` sends no further batch
- three consecutive batch exceptions produce `FAILED` and a `lastError`, leaving the cursor put
- a claim whose `updateMany` returns `count: 0` does nothing
- a `pushAt` older than the grace window produces `FAILED` without sending
- only the two dead-token codes null a `fcmToken`; other failures do not
- no `PushMeta` is written for either target

`admin-push-rules.spec.ts`, `fcm-response.spec.ts`, `user-names.spec.ts` cover the pure modules directly — transitions, deletability, grace window, response summarising, comma round-tripping.

`push.service.spec.ts` covers every row of the §4.6 table.

### 6.2 Admin (`node:test`, `node:assert/strict`)

`push-form-payload.test.ts`, `push-status.test.ts`, `push-progress.test.ts`. Component render tests are not added; the repo has none and this design pushes the logic into three pure modules so the components are wiring.

## 7. Rollout

```
1. dev: SQL step 1 -> review -> SQL step 2 -> verification queries
2. deploy server to dev; send to one username end-to-end
3. deploy admin to dev; exercise create, edit, cancel, abort, delete
4. production: SQL step 1 -> review -> SQL step 2 -> verification queries
5. deploy server to production
6. deploy admin to production
7. first production send is a per-user send to one account
```

SQL precedes the server deploy, since the new code reads the new columns. The interval where the SQL is applied and the server is still old is safe: the backfill writes only new columns and leaves `isActive`/`sentAt` untouched.

**Step 5 ends sending from `mindbridge-stg`.** Once the gate reads `production`, the send moves to `mindbridge-batch`. If anything is currently going out from stg, this is the cutover.

Rollback is a code revert; the new columns are simply ignored by the old code. Note that reverting also restores the `'staging'` gate and moves sending back to stg.

## 8. Risks and open items

| Risk | Handling |
|---|---|
| Historical unsent rows broadcast on first tick | Backfill grants `SCHEDULED` only to future `pushAt`; the sender enforces a one-hour grace window; §3.2 step 1 counts the affected rows before anything is applied |
| `User_locale_id_idx` creation on a large table | Online DDL (`ALGORITHM=INPLACE, LOCK=NONE`) on MySQL 8, scheduled for a quiet window; step 1 (f) confirms the version |
| A broadcast takes tens of minutes | Stated in the summary rail before creation and shown as live progress afterwards; concurrency knob available |
| A hung FCM call strands `isRunning` | Per-batch timeout, counted as a batch failure |
| Two pushes scheduled for the same minute run serially | Documented; the second stays `SCHEDULED` until the first finishes |
| Mid-send signups receive the push non-deterministically | Accepted and documented (§2.8) |
| Marketing consent is unenforced | Out of scope; the target query takes a filter without restructuring |
| The 3 rows found by §3.2 step 1 (a) are unreviewed | Inspect their `pushAt` and content before running step 2 in production; the backfill otherwise cancels them silently |
| Legacy columns still present | Dropped in §3.3 after one production cycle |
