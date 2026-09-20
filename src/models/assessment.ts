// Domain model — client-safe (pure types, no server-only / prisma imports).
import type { GroupId } from "@/models/activity-group";

// The record shape the UI works with. `ts` is epoch millis (mapped from the
// DB's createdAt) so formatting helpers keep working unchanged.
export interface AssessmentRecord {
  id: string;
  email: string;
  division: string;
  ts: number;
  // The activity section this submission is for. null = a legacy record from before
  // the sections were split (it scored every group together).
  groupId: GroupId | null;
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
  // Optional self-reported device storage USED (GB, not free/available) before/
  // after the Digital Cleanup checklist. Null when not supplied. A successful
  // cleanup should reduce used space, so "freed" = storageBeforeGb - storageAfterGb.
  storageBeforeGb: number | null;
  storageAfterGb: number | null;
}

// email + division are derived server-side from the authenticated session,
// so the client only sends the assessment result.
export interface CreateRecordInput {
  groupId: GroupId;
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
  storageBeforeGb?: number;
  storageAfterGb?: number;
}

// Result of submitting one section. `completedGroupIds` are the sections this user
// has submitted at least once (including this one). `surveyNudge` is true only on
// the submission that completes the last section, when the survey is still open —
// so the client shows the "please take the survey" popup exactly once.
export type CreateRecordResult =
  | {
      ok: true;
      record: AssessmentRecord;
      completedGroupIds: GroupId[];
      surveyNudge: boolean;
    }
  | { ok: false; reason: "unauthenticated" };
