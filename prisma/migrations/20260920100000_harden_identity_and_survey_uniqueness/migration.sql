-- Hardening migration.
--
-- 1. E-mail identity columns move from utf8mb4_unicode_ci to utf8mb4_bin.
--    The case- AND accent-insensitive collation let a look-alike address ("chawut.sa@gmaîl.com")
--    match the row of the real one when Auth.js looked the user up by e-mail, so a magic link for
--    the look-alike signed in as that user (an admin, for the admin's address). Prisma does not
--    model collations, so this is plain SQL here. The app now also refuses non-ASCII addresses
--    (src/lib/signin-policy.ts) and lower-cases addresses at the adapter boundary (src/auth.ts).
--
--    Existing rows are lower-cased FIRST. BINARY is needed in the WHERE: under the current
--    collation "A@x.com" = "a@x.com", so a plain comparison would find nothing to change.
--    No unique-key collisions are possible: User.email was already unique under the folding
--    collation, so no two rows can differ only by case.
UPDATE `User` SET `email` = LOWER(`email`) WHERE `email` IS NOT NULL AND BINARY `email` <> LOWER(`email`);
UPDATE `AssessmentRecord` SET `email` = LOWER(`email`) WHERE BINARY `email` <> LOWER(`email`);
UPDATE `SurveyResponse` SET `email` = LOWER(`email`) WHERE BINARY `email` <> LOWER(`email`);
UPDATE `AuditLog` SET `actorEmail` = LOWER(`actorEmail`) WHERE BINARY `actorEmail` <> LOWER(`actorEmail`);

-- Outstanding sign-in links are short-lived and can simply be requested again; dropping them
-- avoids keeping identifiers in the old case/accent-folded form.
DELETE FROM `VerificationToken`;

-- 2. One survey response per address. The action used check-then-insert, which two concurrent
--    requests from one account both passed (20 parallel submits produced 20 rows). Keep the
--    earliest response per address (ties broken by id) so the unique index can be created.
DELETE sr FROM `SurveyResponse` sr
  JOIN `SurveyResponse` keep
    ON keep.`email` = sr.`email`
   AND (keep.`createdAt` < sr.`createdAt` OR (keep.`createdAt` = sr.`createdAt` AND keep.`id` < sr.`id`));

ALTER TABLE `User` MODIFY `email` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;
ALTER TABLE `AssessmentRecord` MODIFY `email` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `SurveyResponse` MODIFY `email` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `AuditLog` MODIFY `actorEmail` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `VerificationToken` MODIFY `identifier` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

-- DropIndex
DROP INDEX `SurveyResponse_email_idx` ON `SurveyResponse`;

-- CreateIndex
CREATE UNIQUE INDEX `SurveyResponse_email_key` ON `SurveyResponse`(`email`);

-- 3. Data minimisation: the app never calls Google's APIs, so the OAuth tokens Auth.js used to
--    store in plaintext are not needed (new sign-ins no longer store them, see src/auth.ts).
UPDATE `Account` SET `access_token` = NULL, `refresh_token` = NULL, `id_token` = NULL, `session_state` = NULL;

-- Expired sessions are never swept by Auth.js unless that exact token is presented again.
DELETE FROM `Session` WHERE `expires` < NOW();
