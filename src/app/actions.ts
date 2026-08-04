"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/services/auth.service";
import * as recordService from "@/services/record.service";
import * as userService from "@/services/user.service";
import * as surveyService from "@/services/survey.service";
import * as checklistService from "@/services/checklist.service";
import * as retentionService from "@/services/retention.service";
import * as auditService from "@/services/audit.service";
import { createLogger } from "@/lib/logger";
import { DIVISIONS } from "@/models/division";
import type { AssessmentRecord, CreateRecordInput } from "@/models/assessment";
import type { SurveyQuestion, SurveyQuestionInput, SurveyAnswers } from "@/models/survey";
import type { ChecklistItem, ChecklistItemInput } from "@/models/risk";

const log = createLogger("actions");

// Resolve the authenticated user (id + email) or throw. This is the only place
// that couples the session to logic — services stay session-free (no import cycle).
async function requireUser() {
  let session;
  try {
    session = await auth();
  } catch {
    // auth() throwing (vs. cleanly resolving with no session) is the signature of a
    // transient DB connection hiccup (e.g. Tailscale VPN latency) — retry once before
    // giving up, since retrying a genuinely missing session wouldn't help anyway.
    await new Promise((resolve) => setTimeout(resolve, 300));
    session = await auth();
  }
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Unauthenticated");
  }
  return { id: session.user.id, email: session.user.email, division: session.user.division };
}

// Resolve the authenticated user AND require admin — a non-admin hitting an
// admin-only action is itself a security-relevant signal, so it's logged
// (structured log only, not the audit DB — there's no confirmed admin
// identity to attribute the audit row to) before throwing.
async function requireAdmin(action: string) {
  const user = await requireUser();
  if (!isAdmin(user.email)) {
    log.warn("unauthorized_attempt", { email: user.email, action });
    throw new Error("Unauthorized");
  }
  return user;
}

// Set the current user's division (the one-time gate after first sign-in).
// A missing/expired session is returned as a typed result (not thrown) so the
// client can distinguish "please sign in again" from an unexpected failure.
export async function setDivision(
  division: string
): Promise<{ ok: true } | { ok: false; reason: "unauthenticated" }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!DIVISIONS.includes(division as (typeof DIVISIONS)[number])) {
    throw new Error("Invalid division");
  }
  await userService.updateUserDivision(user.id, division);
  return { ok: true };
}

// Save one submission. email + division come from the session, not the client.
export async function createRecord(
  input: CreateRecordInput
): Promise<AssessmentRecord | { ok: false; reason: "unauthenticated" }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!user.division) throw new Error("Division not set");
  return recordService.createRecord({
    email: user.email,
    division: user.division,
    gaps: input.gaps,
    scoreLabel: input.scoreLabel,
    selectedIds: input.selectedIds,
    storageBeforeGb: sanitizeGb(input.storageBeforeGb),
    storageAfterGb: sanitizeGb(input.storageAfterGb),
  });
}

// Optional, self-reported GB values from the client — not required to submit,
// so bad/negative/non-finite input is dropped rather than rejected outright.
function sanitizeGb(n?: number): number | undefined {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Delete every submission — admin only.
export async function clearRecords(): Promise<{ deleted: number }> {
  const user = await requireAdmin("records.cleared");
  const result = await recordService.clearAllRecords();
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "records.cleared",
    metadata: { deleted: result.deleted },
  });
  return result;
}

/* ------------------------------------------------------------------ */
/*  Data retention                                                     */
/* ------------------------------------------------------------------ */

export async function acknowledgeDataRetentionNotice(): Promise<void> {
  const user = await requireUser();
  await userService.acknowledgeRetentionNotice(user.id);
}

// Manually run the 30-day cleanup sweep now — admin only. The sweep also runs
// automatically on a daily interval (src/instrumentation.ts); this exists for
// operator visibility/testing.
export async function runRetentionCleanupNow(): Promise<{
  records: number;
  surveyResponses: number;
  expiredTokens: number;
  auditLogs: number;
}> {
  const user = await requireAdmin("retention.manual_sweep");
  const result = await retentionService.runRetentionCleanup();
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "retention.manual_sweep",
    metadata: result,
  });
  return result;
}

/* ------------------------------------------------------------------ */
/*  Satisfaction survey                                                */
/* ------------------------------------------------------------------ */

export async function submitSurveyResponse(answers: SurveyAnswers): Promise<void> {
  const user = await requireUser();
  await surveyService.createResponse(user.email, answers);
}

// Admin-only: manage survey questions.
export async function adminCreateSurveyQuestion(input: SurveyQuestionInput): Promise<SurveyQuestion> {
  const user = await requireAdmin("survey_question.created");
  const question = await surveyService.createQuestion(input);
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "survey_question.created",
    targetId: question.id,
  });
  return question;
}

export async function adminUpdateSurveyQuestion(
  id: string,
  input: Partial<SurveyQuestionInput>
): Promise<SurveyQuestion> {
  const user = await requireAdmin("survey_question.updated");
  const question = await surveyService.updateQuestion(id, input);
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "survey_question.updated",
    targetId: id,
  });
  return question;
}

export async function adminDeleteSurveyQuestion(id: string): Promise<void> {
  const user = await requireAdmin("survey_question.deleted");
  await surveyService.deleteQuestion(id);
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "survey_question.deleted",
    targetId: id,
  });
}

/* ------------------------------------------------------------------ */
/*  Checklist items                                                    */
/* ------------------------------------------------------------------ */

// Admin-only: manage checklist items (the main page fetches them server-side).
export async function adminCreateChecklistItem(input: ChecklistItemInput): Promise<ChecklistItem> {
  const user = await requireAdmin("checklist_item.created");
  const item = await checklistService.createItem(input);
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "checklist_item.created",
    targetId: item.id,
  });
  return item;
}

export async function adminUpdateChecklistItem(
  id: string,
  input: Partial<ChecklistItemInput>
): Promise<ChecklistItem> {
  const user = await requireAdmin("checklist_item.updated");
  const item = await checklistService.updateItem(id, input);
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "checklist_item.updated",
    targetId: id,
  });
  return item;
}

export async function adminDeleteChecklistItem(id: string): Promise<void> {
  const user = await requireAdmin("checklist_item.deleted");
  await checklistService.deleteItem(id);
  await auditService.recordAudit({
    actorEmail: user.email,
    action: "checklist_item.deleted",
    targetId: id,
  });
}
