# Coupon Management Enhancement — Rollout & Verification

- **Date**: 2026-08-10
- **Design**: [2026-08-09-coupon-management-enhancement-design.md](./2026-08-09-coupon-management-enhancement-design.md)
- **Migration SQL**: [2026-08-09-coupon-management-enhancement.sql](./2026-08-09-coupon-management-enhancement.sql)
- **Status**: code complete and reviewed on both sides; **nothing has been run against a database or seen in a browser**

## What is done

| | Branch | Commits | Verification |
|---|---|---|---|
| Backend | `mindqna-server` `feat/coupon-management-enhancement` | `dd505d2..edbd8b3` (17) | `tsc` clean, 436 tests across 45 suites |
| Frontend | `mindqna-admin` `feat/coupon-management-enhancement` | `a9901c3..b309c74` (28) | `tsc` clean repo-wide, lint clean, no test runner |

Every task passed an independent review; both branches then passed a whole-branch review whose findings were fixed and re-reviewed. The backend review verified the SQL file against `schema.prisma` element by element, and the frontend review verified every request and response field against the backend source.

## What is not done

**Nothing here has touched a database or a browser.** The remaining verification is entirely manual and is described below. Two consequences:

- Raw SQL semantics in `coupon.sql.ts` are unproven. Mocked tests confirm the bindings and the fragment shape; only a live query proves it selects the right rows.
- The concurrency guard on redemption is unproven under real parallelism.
- Every screen in the admin is unproven.

## Order of operations

Apply to **dev** first and complete the checks below before touching production.

1. Apply the migration SQL, **STEP 0 → 4-PREVIEW → 1–5**. Read STEP 4-PREVIEW's output before running STEP 4.
2. Deploy the backend.
3. **Run STEP 6 immediately.** Not "later that day" — see the warning in the SQL file. Between the deploy and STEP 6, a legacy coupon redeemed during the migration window is redeemable a second time by a different user.
4. Run the VERIFY block. Both queries must return zero rows.
5. Work the checks below in order.
6. Deploy the frontend.
7. Repeat 1–6 against production. **Back up `Coupon` and `CouponMeta` first** — STEP 5 cannot be undone once one code has been redeemed by two users.

## Open question — resolve this first

**Does `dueAt` display and save one day late?**

The backend stores `startAt` at start of day and `dueAt` at end of day in the **server's** local time, and the admin formats them in the **browser's** local time. No timezone is configured anywhere in the backend repo — not in `Docker-compose.yml`, not in the deploy scripts, not via a dayjs plugin — so the value depends on the host default.

If the API server runs UTC and the admin's browser is KST, `dueAt` stored as `T23:59:59.999Z` reads as 08:59 the **next day**. Every list row and every edit form then shows `dueAt + 1`, and each save writes `dueAt + 1` — so a coupon quietly outlives its intended expiry a little more every time someone renames it.

**The test:** create a coupon with 시작일 = today and 만료일 = today + 30. Save. Reopen it via 수정.

- 만료일 reads **today + 30** → no issue, close this out.
- 만료일 reads **today + 31** → this is a live money bug. Say so and the fix is to normalise on `YYYY-MM-DD` strings end to end rather than re-parsing the ISO instant on either side.

Cross-check the list's 기간 column against the same dates.

## Screen checks, in order of what is most likely to catch a real defect

**1. Date round-trip** — the open question above. Do this before anything else.

**2. Edit a migrated batch.** On dev: `SELECT batchId, name, COUNT(*) c FROM Coupon GROUP BY batchId HAVING c > 1000;`
If any row returns, open that batch's 수정, change only the name, save. It must save. (A bound on 발급 수량 used to block this on the edit path; that is fixed, and this confirms it.) **Check production's counts before deploying there** — dev data is not proof.

**3. Delete an expanded batch that has redemptions.** Expand a batch with a mix of used and unused codes, leave it expanded, delete it.
Expect: a toast reporting how many were deleted and how many were kept, and the code list beneath it refreshing to match. Redeemed codes must survive — they carry the redemption history.

**4. Read the toast on each rejection.** On a batch with at least one redemption: change 코인 수량; lower a shared batch's 최대 이용 횟수 below its current usage; create a shared coupon reusing an existing code; create a shared coupon with 최대 이용 횟수 blank.
Expect four **distinguishable** Korean messages, not four identical `400`s.

**5. Shared-batch expansion.** Redeem a shared coupon from two accounts, then expand it.
Expect: one row per redemption with the same code and different usernames, each labelled 사용 with its own timestamp; no 코드 전체 복사 button; the pager counting redemptions, so 21+ redemptions makes page 2 reachable and non-empty.

**6. 코드 전체 복사 across a page boundary.** Issue 25 individual codes, expand, copy, paste.
Expect all **25**, not the 20 on screen.

**7. Unlimited shared coupon.** Create one with 무제한 checked.
Expect `0 / 무제한` with **no progress bar**. Reopen in 수정: 무제한 pre-checked, and unchecking it demands a real number.

**8. Filters.** Type a 2-character search, then each status in turn.
Expect: the chip appears and dismisses, the page resets to 1 on every filter change, and every visible row's 상태 matches. A 1-character search should fire nothing.

**9. Mode switch on create, twice around.** 개별 → 공용 → 개별 → 공용, typing a distinct 발급 수량 and 최대 이용 횟수 along the way.
Expect neither field to clobber the other. The 이렇게 발급됩니다 card is the quickest way to read the result.

## Backend checks

**Concurrency.** Create a `SHARED` coupon with `maxUseCount = 1`, then fire two redemptions simultaneously from two different users:

```bash
curl -s -X POST "$HOST/premium/coupon/use" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d "{\"spaceId\":\"$SPACE_A\",\"code\":\"$CODE\"}" &
curl -s -X POST "$HOST/premium/coupon/use" -H "Authorization: Bearer $TOKEN_B" \
  -H 'Content-Type: application/json' -d "{\"spaceId\":\"$SPACE_B\",\"code\":\"$CODE\"}" &
wait
```

Exactly one succeeds. Then confirm the counter did not overshoot:

```sql
SELECT `code`, `useCount`, `maxUseCount` FROM `Coupon` WHERE `code` = 'CODE';
SELECT COUNT(*) FROM `CouponMeta` WHERE `couponId` = (SELECT id FROM `Coupon` WHERE `code` = 'CODE');
```

`useCount = 1`, one `CouponMeta` row. If `useCount = 2`, the guard is not working — stop and fix before production.

**Search.** The batch list's `WHERE` clause is the one behaviour no unit test can prove. With at least two batches present and one coupon redeemed:

1. Search by coupon name → only matching batches.
2. Search by code → for a shared batch its own code finds it; for an individual batch, pasting one member code returns **the whole batch**, not one row.
3. Search by redeeming username → the batch containing that redemption appears. This is the `LEFT JOIN CouponMeta` path, the least covered in the feature.
4. Search something matching nothing → empty list, no error.
5. Combine a search with each status filter → the intersection, and the row's status matches the filter.

Failures here are in `couponSearchFilter` or `couponBatchSubquery` in `coupon.sql.ts`, not in the frontend.

**Shared-batch rendering.** Create a `SHARED` batch with `maxUseCount = 100`. The list row must show the code string and `0 / 100`; after one redemption, `1 / 100` and still 진행중. (This exercises the `MIN(CAST(issueMode AS CHAR))` projection, which no mocked test can reach.)

## Known limitations, accepted

- **The coin radio offers 하트 or 스타** while the API accepts both. Deliberate — granting both has no product use today, and the constraint sits in the UI so it can be relaxed without a server change. A dual-currency coupon arriving from the API is handled: the list shows both, and the form locks the rewards and echoes them back unchanged so the coupon stays editable for its name and dates.
- **코드 전체 복사 appears only for individual batches.** `?all=true` on a shared batch returns redemptions rather than codes, and a shared code is already visible in its row.
- **The record count on a partly-filled last page is approximate** — the API returns a page count, not a total.
- **`assertCouponInput` allows a coupon granting only tickets**, no coins. Intentional.

## Deferred, with reasons

None of these block merge. Listed so they are not rediscovered as surprises.

| Item | Why deferred |
|---|---|
| `coupon.utils.ts`'s code alphabet carries both letter cases although every code is uppercased | Effective space is 36^n, not 62^n — still ~3.7 × 10^15 against a 1000-code ceiling. Cosmetic. |
| `dayjs()` runs in server-local time while `startAt` is stored UTC | Self-consistent under a stable server timezone. Related to the open question above; resolve together. |
| Controller inlines the `status` union rather than importing `CouponStatus` | Two places to update, but changing a `@TypedQuery` type untested on the deploy path is the greater risk. |
| `?all=true` on a shared batch returns redemptions, not codes | The copy button is individual-only, so nothing reaches it. Endpoint contract reads broader than it behaves. |
| `updateCouponBatch` reads `peakUseCount` without a lock | A redemption committing mid-update can leave `maxUseCount` one below true usage. Consequence is a batch that stops accepting redemptions — benign, no money moves. |
| Accessibility: the usage meter's progressbar has no accessible name; heart vs star is conveyed by icon and colour alone | Real, and worth a dedicated pass rather than a patch here. |
| A 발급 중단ed batch whose `startAt` was still in the future opens with `startAt > dueAt` failing validation | Recoverable by fixing the start date, but the admin has to discover it. |
| `CouponForm` and five sibling forms carry a `react-hooks/exhaustive-deps` warning | Adding `form` to the deps of an effect that calls `form.reset` is the shape that causes reset loops. Fix repo-wide, separately. |
