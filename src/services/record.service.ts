import "server-only";

import { prisma } from "@/lib/prisma";
import type { AssessmentRecord } from "@/models/assessment";

// DB row (createdAt/JSON) -> client-facing model (ts number / string[]).
function toModel(row: {
  id: string;
  email: string;
  division: string;
  gaps: number;
  scoreLabel: string;
  selectedIds: unknown;
  createdAt: Date;
}): AssessmentRecord {
  return {
    id: row.id,
    email: row.email,
    division: row.division,
    ts: row.createdAt.getTime(),
    gaps: row.gaps,
    scoreLabel: row.scoreLabel,
    selectedIds: Array.isArray(row.selectedIds) ? (row.selectedIds as string[]) : [],
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
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
}): Promise<AssessmentRecord> {
  const row = await prisma.assessmentRecord.create({ data });
  return toModel(row);
}

// Delete every submission.
export async function clearAllRecords(): Promise<{ deleted: number }> {
  const res = await prisma.assessmentRecord.deleteMany({});
  return { deleted: res.count };
}
