import "server-only";

import { prisma } from "@/lib/prisma";
import { isGroupId, type GroupId } from "@/models/activity-group";
import type { AssessmentRecord } from "@/models/assessment";
import { isValidGb } from "@/lib/storage-gb";

// DB row (createdAt/JSON) -> client-facing model (ts number / string[]).
function toModel(row: {
  id: string;
  email: string;
  division: string;
  gaps: number;
  scoreLabel: string;
  selectedIds: unknown;
  storageBeforeGb: number | null;
  storageAfterGb: number | null;
  groupId: string | null;
  createdAt: Date;
}): AssessmentRecord {
  return {
    id: row.id,
    email: row.email,
    division: row.division,
    ts: row.createdAt.getTime(),
    groupId: isGroupId(row.groupId) ? row.groupId : null,
    gaps: row.gaps,
    scoreLabel: row.scoreLabel,
    selectedIds: Array.isArray(row.selectedIds) ? (row.selectedIds as string[]) : [],
    // Rows written before the cap existed may hold absurd numbers (1e308 once got stored); the
    // admin sums/averages these, so anything out of range is shown as "not supplied".
    storageBeforeGb: isValidGb(row.storageBeforeGb) ? row.storageBeforeGb : null,
    storageAfterGb: isValidGb(row.storageAfterGb) ? row.storageAfterGb : null,
  };
}

// The admin page ships this list to the browser whole, so it is bounded (the 30-day retention
// sweep also bounds it over time, but a busy window — or one abusive account — should not be
// able to make /admin arbitrarily large).
export const ADMIN_MAX_RECORDS = 5000;

// Latest submissions, newest first. The storage (GB) answers now live on the User row (asked in
// pop-ups, not per submission), so each address's LATEST Cleanup record gets them filled in — one
// row per person keeps the admin's averages per person. The pair is applied only to a record that
// has neither value of its own (mixing a legacy "before" with a newer "after" measures nothing).
// The users are fetched alongside, by "has an answer" (a small set), not by an IN list of up to
// ADMIN_MAX_RECORDS addresses after the records arrive.
export async function listRecords(limit: number = ADMIN_MAX_RECORDS): Promise<AssessmentRecord[]> {
  const [rows, users] = await Promise.all([
    prisma.assessmentRecord.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.user.findMany({
      where: { OR: [{ storageBeforeGb: { not: null } }, { storageAfterGb: { not: null } }] },
      select: { email: true, storageBeforeGb: true, storageAfterGb: true },
    }),
  ]);
  const records = rows.map(toModel);
  const byEmail = new Map(users.map((u) => [u.email, u]));
  const filled = new Set<string>();
  return records.map((r) => {
    if (r.groupId !== "cleanup" || filled.has(r.email)) return r;
    filled.add(r.email); // newest first, so this is the latest Cleanup record of that address
    const u = byEmail.get(r.email);
    if (!u || r.storageBeforeGb !== null || r.storageAfterGb !== null) return r;
    return {
      ...r,
      storageBeforeGb: isValidGb(u.storageBeforeGb) ? u.storageBeforeGb : null,
      storageAfterGb: isValidGb(u.storageAfterGb) ? u.storageAfterGb : null,
    };
  });
}

// How many submissions this address made since `since` — used to throttle createRecord.
export async function countRecordsSince(email: string, since: Date): Promise<number> {
  return prisma.assessmentRecord.count({ where: { email, createdAt: { gte: since } } });
}

// Save one submission. Caller supplies the (already authorised) email + division.
export async function createRecord(data: {
  email: string;
  division: string;
  groupId: GroupId;
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
}): Promise<AssessmentRecord> {
  const row = await prisma.assessmentRecord.create({ data });
  return toModel(row);
}

// The sections this user has submitted at least once. Legacy records (groupId null)
// don't count — they predate the per-section split.
export async function listCompletedGroupIds(email: string): Promise<GroupId[]> {
  const rows = await prisma.assessmentRecord.groupBy({
    by: ["groupId"],
    where: { email, groupId: { not: null } },
  });
  return rows.map((r) => r.groupId).filter(isGroupId);
}

// Delete every submission.
export async function clearAllRecords(): Promise<{ deleted: number }> {
  const res = await prisma.assessmentRecord.deleteMany({});
  return { deleted: res.count };
}
