-- AlterTable
ALTER TABLE `AssessmentRecord` ADD COLUMN `groupId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `AssessmentRecord_email_groupId_idx` ON `AssessmentRecord`(`email`, `groupId`);
