-- Split User.storageUpdatedAt into one timestamp per answer, so the 30-day retention sweep ages
-- "before" and "after" separately (a late "after" used to keep an old "before" alive). The old
-- column's value is carried over to whichever answers exist, so nothing is lost or extended.
-- Also index Session.expires, which the daily sweep filters on.

-- AlterTable (add first, backfill, then drop)
ALTER TABLE `User` ADD COLUMN `storageBeforeAt` DATETIME(3) NULL,
    ADD COLUMN `storageAfterAt` DATETIME(3) NULL;

UPDATE `User` SET `storageBeforeAt` = `storageUpdatedAt` WHERE `storageBeforeGb` IS NOT NULL;
UPDATE `User` SET `storageAfterAt` = `storageUpdatedAt` WHERE `storageAfterGb` IS NOT NULL;

ALTER TABLE `User` DROP COLUMN `storageUpdatedAt`;

-- CreateIndex
CREATE INDEX `Session_expires_idx` ON `Session`(`expires`);
