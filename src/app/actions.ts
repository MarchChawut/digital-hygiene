"use server";

import { createHash } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { auth, signOut } from "@/auth";
import { isAdmin } from "@/services/auth.service";
import * as recordService from "@/services/record.service";
import * as userService from "@/services/user.service";
import * as surveyService from "@/services/survey.service";
import * as checklistService from "@/services/checklist.service";
import * as retentionService from "@/services/retention.service";
import * as auditService from "@/services/audit.service";
import { createLogger } from "@/lib/logger";
import { groupByCategory, scoreSection } from "@/lib/scoring";
import { scoreFor } from "@/lib/format";
import { allSectionsDone, requiredGroupIds } from "@/lib/completion";
import { isValidGb } from "@/lib/storage-gb";
import { validateSurveyAnswers } from "@/lib/survey-validation";
import { isSafeAsciiEmail } from "@/lib/signin-policy";
import { DIVISIONS } from "@/models/division";
import { GROUP_IDS, isGroupId } from "@/models/activity-group";
import type { CreateRecordInput, CreateRecordResult } from "@/models/assessment";
import type { SaveStorageAfterResult, SaveStorageBeforeResult } from "@/models/storage";
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

// Sign out on the server (deletes the DB session, clears the cookie). Used instead of
// next-auth/react's signOut so that library stays out of the signed-in bundle.
// It deliberately does NOT redirect: a redirecting server action makes the client-side
// promise reject, which callers' try/catch would misread as a failure. The caller
// navigates itself (window.location.assign) once this resolves.
export async function signOutAction(): Promise<void> {
  try {
    await signOut({ redirect: false });
  } catch (err) {
    unstable_rethrow(err);
    // In the expired-session case the DB row is already gone and the adapter throws on
    // deleting it. The user is signed out either way, so don't fail the caller.
    log.warn("signout_failed", { message: err instanceof Error ? err.message : String(err) });
  }
}

// Set the current user's division (the one-time gate after first sign-in).
// A missing/expired session is returned as a typed result (not thrown) so the
// client can distinguish "please sign in again" from an unexpected failure.
export async function setDivision(
  division: string
): Promise<{ ok: true } | { ok: false; reason: "unauthenticated" | "already_set" }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!DIVISIONS.includes(division as (typeof DIVISIONS)[number])) {
    throw new Error("Invalid division");
  }
  const outcome = await userService.setDivisionOnce(user.id, division);
  if (outcome === "already_set") {
    log.warn("division_change_refused", { userId: user.id });
    return { ok: false, reason: "already_set" };
  }
  return { ok: true };
}

// Most submissions one address may make per hour (across all sections, re-submits included) —
// generous for real use, but stops one account flooding the table (and /admin) in a loop.
const RECORDS_PER_HOUR_LIMIT = 30;

// Save one section's submission. email + division come from the session, not the client. The
// client only reports WHICH ITEMS it left unchecked; the section, the valid items, the score,
// the label and `gaps` are all recomputed here, so a tampered payload can neither attach other
// sections' items nor forge "ปลอดภัยสูงสุด" (the label used to be trusted as sent).
export async function createRecord(input: CreateRecordInput): Promise<CreateRecordResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!user.division) throw new Error("Division not set");
  if (!isGroupId(input.groupId)) throw new Error("Invalid group");

  const [items, completedBefore, recentCount] = await Promise.all([
    checklistService.listItems(),
    recordService.listCompletedGroupIds(user.email),
    recordService.countRecordsSince(user.email, new Date(Date.now() - 60 * 60 * 1000)),
  ]);
  if (recentCount >= RECORDS_PER_HOUR_LIMIT) {
    log.warn("record_rate_limited", { userId: user.id, recentCount });
    return { ok: false, reason: "rate_limited" };
  }
  const groupItems = items.filter((i) => i.groupId === input.groupId);
  if (groupItems.length === 0) throw new Error("Group has no checklist items");

  // A category counts as done only if none of its items is reported at risk; the stored risks
  // are then exactly the items of the unchecked categories (same meaning as always).
  const reported = new Set(
    Array.isArray(input.selectedIds) ? input.selectedIds.slice(0, 1000).filter((id) => typeof id === "string") : []
  );
  const categories = groupByCategory(groupItems);
  const checked = Object.fromEntries(
    categories.map((c) => [c.category, !c.items.some((i) => reported.has(i.id))])
  );
  const { percent, riskIds: selectedIds } = scoreSection(categories, checked);

  const record = await recordService.createRecord({
    email: user.email,
    division: user.division,
    groupId: input.groupId,
    gaps: selectedIds.length,
    scoreLabel: scoreFor(percent).label,
    selectedIds,
  });
  log.info("assessment.submitted", {
    recordId: record.id,
    groupId: input.groupId,
    gaps: record.gaps,
    scoreLabel: record.scoreLabel,
  });

  const completedGroupIds = GROUP_IDS.filter(
    (g) => g === input.groupId || completedBefore.includes(g)
  );
  // A section only counts as required if it has items (an admin may empty one out).
  const justCompletedAll =
    !completedBefore.includes(input.groupId) &&
    requiredGroupIds(items).every((g) => completedGroupIds.includes(g));
  const surveyNudge =
    justCompletedAll &&
    !(await surveyService.hasResponded(user.email)) &&
    (await surveyService.listQuestions()).length > 0;

  return { ok: true, record, completedGroupIds, surveyNudge };
}

// The two self-reported storage (GB) pop-ups. Bad input (negative, non-finite, above MAX_GB) is
// refused — unlike the old optional field it is the whole point of the request. Each value is
// written once, "before" only while "after" is still empty (see user.service), and the result says
// truthfully when nothing was written. "after" is only accepted once every section has been
// submitted, checked here — the client never decides that.
export async function saveStorageBefore(gb: number): Promise<SaveStorageBeforeResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!user.division) return { ok: false, reason: "no_division" };
  if (!isValidGb(gb)) return { ok: false, reason: "invalid" };
  const outcome = await userService.setStorageBeforeOnce(user.id, gb === 0 ? 0 : gb); // JSON can carry -0
  return outcome === "set" ? { ok: true } : { ok: false, reason: outcome };
}

export async function saveStorageAfter(gb: number): Promise<SaveStorageAfterResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!user.division) return { ok: false, reason: "no_division" };
  if (!isValidGb(gb)) return { ok: false, reason: "invalid" };
  const [items, completed] = await Promise.all([
    checklistService.listItems(),
    recordService.listCompletedGroupIds(user.email),
  ]);
  if (!allSectionsDone(items, completed)) return { ok: false, reason: "not_finished" };
  const stored = await userService.setStorageAfterOnce(user.id, gb === 0 ? 0 : gb);
  // Never echo the client's number as if it were stored: if the row is gone, say so.
  if (stored.after === null) return { ok: false, reason: "gone" };
  return { ok: true, before: stored.before, after: stored.after, saved: stored.saved };
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

// Erase everything held for one address, on request (the promise made on /deletion-instructions).
// Admin only. The audit row records WHO erased and a short hash of the address — not the address.
export async function adminDeleteUserData(email: string): Promise<{
  userDeleted: boolean;
  records: number;
  surveyResponses: number;
  auditRows: number;
}> {
  const admin = await requireAdmin("user_data.deleted");
  const target = String(email ?? "").trim().toLowerCase();
  if (!isSafeAsciiEmail(target)) throw new Error("Invalid e-mail");
  const result = await userService.deleteAllDataForEmail(target);
  await auditService.recordAudit({
    actorEmail: admin.email,
    action: "user_data.deleted",
    targetId: createHash("sha256").update(target).digest("hex").slice(0, 16),
    metadata: result,
  });
  return result;
}

// Let one user choose their division again — for a wrong pick, which is otherwise final. Admin only;
// audited (who + a hash of the address). Records already saved keep the division they were filed under.
export async function adminResetDivision(email: string): Promise<{ reset: boolean }> {
  const admin = await requireAdmin("division.reset");
  const target = String(email ?? "").trim().toLowerCase();
  if (!isSafeAsciiEmail(target)) throw new Error("Invalid e-mail");
  const reset = await userService.resetDivision(target);
  await auditService.recordAudit({
    actorEmail: admin.email,
    action: "division.reset",
    targetId: createHash("sha256").update(target).digest("hex").slice(0, 16),
    metadata: { found: reset },
  });
  return { reset };
}

// Manually run the 30-day cleanup sweep now — admin only. The sweep also runs
// automatically on a daily interval (src/instrumentation.ts); this exists for
// operator visibility/testing.
export async function runRetentionCleanupNow(): Promise<{
  records: number;
  surveyResponses: number;
  expiredTokens: number;
  expiredSessions: number;
  auditLogs: number;
  storageCleared: number;
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
  // Only answers to real questions, with the right shape and bounded size, are stored — the
  // raw payload is untrusted (it used to be saved verbatim: 900 KB strings, thousands of keys).
  const checked = validateSurveyAnswers(answers, await surveyService.listQuestions());
  if (!checked.ok) throw new Error("Invalid survey answers");
  // One response per address: a cheap early exit, and the unique index makes concurrent
  // submissions from the same account safe too (createResponse returns false on a duplicate).
  if (await surveyService.hasResponded(user.email)) return;
  await surveyService.createResponse(user.email, checked.answers);
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
