-- AlterTable
ALTER TABLE `User` ADD COLUMN `storageAfterGb` DOUBLE NULL,
    ADD COLUMN `storageBeforeGb` DOUBLE NULL,
    ADD COLUMN `storageUpdatedAt` DATETIME(3) NULL;
