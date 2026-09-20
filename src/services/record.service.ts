import "server-only";

import { prisma } from "@/lib/prisma";
import { isGroupId, type GroupId } from "@/models/activity-group";
import type { AssessmentRecord } from "@/models/assessment";

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
    storageBeforeGb: row.storageBeforeGb,
    storageAfterGb: row.storageAfterGb,
  };
}

// All submissions, newest first.
export async function listRecords(): Promise<AssessmentRecord[]> {
  const rows = await prisma.assessmentRecord.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toModel);
}

// Save one submission. Caller supplies the (already authorised) email + division.
export async function createRecord(data: {
  email: string;
  division: string;
  groupId: GroupId;
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
  storageBeforeGb?: number;
  storageAfterGb?: number;
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
