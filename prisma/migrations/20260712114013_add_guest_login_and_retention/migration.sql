-- AlterTable
ALTER TABLE `User` ADD COLUMN `retentionNoticeAcknowledgedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `SurveyResponse_createdAt_idx` ON `SurveyResponse`(`createdAt`);
