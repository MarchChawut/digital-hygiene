"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/services/auth.service";
import * as recordService from "@/services/record.service";
import * as userService from "@/services/user.service";
import * as surveyService from "@/services/survey.service";
import * as checklistService from "@/services/checklist.service";
import { DIVISIONS } from "@/models/division";
import type { AssessmentRecord, CreateRecordInput } from "@/models/assessment";
import type { SurveyQuestion, SurveyQuestionInput, SurveyAnswers } from "@/models/survey";
import type { ChecklistItem, ChecklistItemInput } from "@/models/risk";

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
  });
}

// Delete every submission — admin only.
export async function clearRecords(): Promise<{ deleted: number }> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  return recordService.clearAllRecords();
}

/* ------------------------------------------------------------------ */
/*  Satisfaction survey                                                */
/* ------------------------------------------------------------------ */

export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
  await requireUser();
  return surveyService.listQuestions();
}

export async function submitSurveyResponse(answers: SurveyAnswers): Promise<void> {
  const user = await requireUser();
  await surveyService.createResponse(user.email, answers);
}

export async function hasSubmittedSurvey(): Promise<boolean> {
  const user = await requireUser();
  return surveyService.hasResponded(user.email);
}

// Admin-only: manage survey questions.
export async function adminCreateSurveyQuestion(input: SurveyQuestionInput): Promise<SurveyQuestion> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  return surveyService.createQuestion(input);
}

export async function adminUpdateSurveyQuestion(
  id: string,
  input: Partial<SurveyQuestionInput>
): Promise<SurveyQuestion> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  return surveyService.updateQuestion(id, input);
}

export async function adminDeleteSurveyQuestion(id: string): Promise<void> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  await surveyService.deleteQuestion(id);
}

/* ------------------------------------------------------------------ */
/*  Checklist items                                                    */
/* ------------------------------------------------------------------ */

// Admin-only: manage checklist items (the main page fetches them server-side).
export async function adminCreateChecklistItem(input: ChecklistItemInput): Promise<ChecklistItem> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  return checklistService.createItem(input);
}

export async function adminUpdateChecklistItem(
  id: string,
  input: Partial<ChecklistItemInput>
): Promise<ChecklistItem> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  return checklistService.updateItem(id, input);
}

export async function adminDeleteChecklistItem(id: string): Promise<void> {
  const user = await requireUser();
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  await checklistService.deleteItem(id);
}
