import "server-only";

import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;
// AuditLog rows serve a different purpose (accountability trail for incident
// response, not user-facing assessment data) so they get their own, longer
// window rather than the 30-day privacy-driven cutoff above.
const AUDIT_LOG_RETENTION_DAYS = 90;

export function retentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function auditLogRetentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

// Deletes AssessmentRecord/SurveyResponse rows older than `cutoff`, expired
// VerificationToken rows (Auth.js never cleans these up itself when a magic
// link goes unused past its own maxAge — same sweep is a natural place for
// that housekeeping), and AuditLog rows older than `auditCutoff`. Both cutoffs
// are parameters (not hardcoded internally) so this is testable without
// waiting for the real windows to elapse.
export async function runRetentionCleanup(
  cutoff: Date = retentionCutoff(),
  auditCutoff: Date = auditLogRetentionCutoff()
): Promise<{
  records: number;
  surveyResponses: number;
  expiredTokens: number;
  expiredSessions: number;
  auditLogs: number;
}> {
  const [records, surveyResponses, expiredTokens, expiredSessions, auditLogs] = await Promise.all([
    prisma.assessmentRecord.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.surveyResponse.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: new Date() } } }),
    // Auth.js only removes an expired session when that exact token is presented again, so
    // abandoned ones (every phone that scanned a QR code once) would otherwise pile up.
    prisma.session.deleteMany({ where: { expires: { lt: new Date() } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
  ]);
  return {
    records: records.count,
    surveyResponses: surveyResponses.count,
    expiredTokens: expiredTokens.count,
    expiredSessions: expiredSessions.count,
    auditLogs: auditLogs.count,
  };
}
