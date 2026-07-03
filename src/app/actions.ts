"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/services/auth.service";
import * as recordService from "@/services/record.service";
import * as userService from "@/services/user.service";
import { DIVISIONS } from "@/models/division";
import type { AssessmentRecord, CreateRecordInput } from "@/models/assessment";

// Resolve the authenticated user (id + email) or throw. This is the only place
// that couples the session to logic — services stay session-free (no import cycle).
async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Unauthenticated");
  }
  return { id: session.user.id, email: session.user.email, division: session.user.division };
}

// Set the current user's division (the one-time gate after first sign-in).
export async function setDivision(division: string): Promise<{ ok: true }> {
  const user = await requireUser();
  if (!DIVISIONS.includes(division as (typeof DIVISIONS)[number])) {
    throw new Error("Invalid division");
  }
  await userService.updateUserDivision(user.id, division);
  return { ok: true };
}

// Save one submission. email + division come from the session, not the client.
export async function createRecord(input: CreateRecordInput): Promise<AssessmentRecord> {
  const user = await requireUser();
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
