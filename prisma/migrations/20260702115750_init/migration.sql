-- CreateTable
CREATE TABLE `AssessmentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `division` VARCHAR(191) NOT NULL,
    `gaps` INTEGER NOT NULL,
    `scoreLabel` VARCHAR(191) NOT NULL,
    `selectedIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AssessmentRecord_email_idx`(`email`),
    INDEX `AssessmentRecord_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
