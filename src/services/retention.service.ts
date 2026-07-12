import "server-only";

import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;

export function retentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

// Deletes AssessmentRecord/SurveyResponse rows older than `cutoff`, plus any
// expired VerificationToken rows (Auth.js never cleans these up itself when a
// magic link goes unused past its own maxAge — same sweep is a natural place
// for that housekeeping). `cutoff` is a parameter (not hardcoded "now - 30
// days" internally) so this is testable without waiting 30 days.
export async function runRetentionCleanup(
  cutoff: Date = retentionCutoff()
): Promise<{ records: number; surveyResponses: number; expiredTokens: number }> {
  const [records, surveyResponses, expiredTokens] = await Promise.all([
    prisma.assessmentRecord.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.surveyResponse.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: new Date() } } }),
  ]);
  return {
    records: records.count,
    surveyResponses: surveyResponses.count,
    expiredTokens: expiredTokens.count,
  };
}
