-- Coupon Management Enhancement — manual migration
-- Spec: 2026-08-09-coupon-management-enhancement-design.md
-- Target: mindqna-server MySQL
--
-- Apply to dev first. Run STEP 0 and STEP 4-PREVIEW before committing to the change.
-- STEP 6 runs ONLY AFTER the backend is deployed.
--
-- Order across environments:
--   dev:  STEP 0 → 4-PREVIEW → 1..5 → deploy backend → STEP 6 → verify → deploy frontend
--   prod: same sequence, and only after dev has been verified end to end.
--
-- BEFORE PRODUCTION — STEP 5 cannot be undone. Once one code has been redeemed
-- by two different users, `couponId` can never be made unique again. Back up
-- both tables first:
--
--   mysqldump -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" \
--     Coupon CouponMeta > coupon-backup-$(date +%Y%m%d-%H%M).sql
--
-- Keep that dump until the feature has run in production long enough to trust.


-- ============================================================
-- STEP 0 — verify the existing unique index name before STEP 5
-- Prisma's default is `CouponMeta_couponId_key`, but confirm.
-- ============================================================

SHOW INDEX FROM `CouponMeta`;
SHOW CREATE TABLE `CouponMeta`;


-- ============================================================
-- STEP 4-PREVIEW — how historical rows will collapse into batches
-- Read this before running STEP 4. A bulk loop that crossed a minute
-- boundary splits in two; the same name issued twice inside one minute
-- merges. Both are display-level only and never affect redemption.
-- ============================================================

SELECT `name`,
       DATE_FORMAT(`createdAt`, '%Y-%m-%d %H:%i') AS bucket,
       COUNT(*)          AS codes,
       MIN(`createdAt`)  AS first_at,
       MAX(`createdAt`)  AS last_at
  FROM `Coupon`
 GROUP BY `name`, bucket
 ORDER BY first_at DESC;


-- ============================================================
-- STEP 1 — add columns
-- `batchId` and `startAt` keep defaults so the currently deployed
-- backend can still INSERT during the window between this SQL and
-- the backend deploy.
-- ============================================================

ALTER TABLE `Coupon`
  ADD COLUMN `batchId`     VARCHAR(36) NOT NULL DEFAULT '',
  ADD COLUMN `issueMode`   ENUM('INDIVIDUAL','SHARED') NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN `startAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `maxUseCount` INT NOT NULL DEFAULT 1,
  ADD COLUMN `useCount`    INT NOT NULL DEFAULT 0;


-- ============================================================
-- STEP 2 — backfill startAt to each row's creation time
-- ============================================================

UPDATE `Coupon` SET `startAt` = `createdAt`;


-- ============================================================
-- STEP 3 — backfill useCount from existing redemption history
-- ============================================================

UPDATE `Coupon` c
   SET c.`useCount` = (SELECT COUNT(*) FROM `CouponMeta` m WHERE m.`couponId` = c.`id`);


-- ============================================================
-- STEP 4 — backfill batchId, grouping on (name, creation minute)
-- ============================================================

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


-- ============================================================
-- STEP 5 — replace the CouponMeta unique constraint
-- One code may now be redeemed by many users, but never twice by
-- the same user.
--
-- IRREVERSIBLE: once multi-use redemptions accumulate, `couponId`
-- can no longer be made unique again. Back up before running this
-- against production.
--
-- Use the index name confirmed in STEP 0.
-- ============================================================

ALTER TABLE `CouponMeta` DROP INDEX `CouponMeta_couponId_key`;

ALTER TABLE `CouponMeta`
  ADD UNIQUE INDEX `CouponMeta_couponId_userId_key` (`couponId`, `userId`);

-- The admin list's summary strip counts today's redemptions with
-- `WHERE createdAt >= CURDATE()`. CouponMeta has no index on createdAt, so without
-- this the count full-scans a table that grows by one row per redemption forever —
-- on the same instance that serves the user-facing redemption path. Safe to run at
-- any time; it is additive and touches no existing constraint.
CREATE INDEX `CouponMeta_createdAt_idx` ON `CouponMeta`(`createdAt`);


-- ============================================================
-- STEP 6 — RUN IMMEDIATELY AFTER THE BACKEND DEPLOY COMPLETES
--
-- "Immediately" is load-bearing, not a figure of speech. From the moment
-- the new backend starts serving traffic until the re-backfill below runs,
-- any legacy coupon that was redeemed during the migration window still
-- carries useCount = 0 and can be redeemed a second time by a different
-- user — granting coins and tickets twice. Have this block ready to paste
-- before you start the deploy.
-- Until the new backend ships, the temporary default lets the old
-- code keep inserting. Once it is live, every INSERT supplies a
-- batchId and the default must go, or a future bug could silently
-- write rows into an empty-string batch.
--
-- `startAt`'s default is permanent and matches Prisma @default(now()).
-- ============================================================

-- Re-run the useCount backfill. The old backend wrote CouponMeta without
-- touching useCount, so any redemption between STEP 3 and this deploy left a
-- legacy code with useCount = 0 — and therefore redeemable a second time by a
-- different user. Idempotent: rows the new backend wrote already agree.
UPDATE `Coupon` c
   SET c.`useCount` = (SELECT COUNT(*) FROM `CouponMeta` m WHERE m.`couponId` = c.`id`);

ALTER TABLE `Coupon` ALTER COLUMN `batchId` DROP DEFAULT;


-- ============================================================
-- VERIFY — after STEP 6
-- Expect: zero rows with an empty batchId, and useCount matching
-- the redemption history exactly.
--
-- If empty_batch_rows is non-zero, do NOT re-run STEP 4 as remediation: it
-- regenerates a fresh UUID() for every row in the table and merges any two
-- same-name batches created within the same minute. Remediate per row instead:
--
--   UPDATE `Coupon` SET `batchId` = (SELECT UUID()) WHERE `batchId` = '';
-- ============================================================

SELECT COUNT(*) AS empty_batch_rows FROM `Coupon` WHERE `batchId` = '';

SELECT c.`id`, c.`code`, c.`useCount`, COUNT(m.`id`) AS meta_rows
  FROM `Coupon` c
  LEFT JOIN `CouponMeta` m ON m.`couponId` = c.`id`
 GROUP BY c.`id`, c.`code`, c.`useCount`
HAVING c.`useCount` <> COUNT(m.`id`);
