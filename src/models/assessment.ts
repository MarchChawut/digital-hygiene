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
  // Self-reported device storage USED (GB, not free/available) before/after the activities.
  // Legacy records carry their own values; for newer ones the admin list fills them in from the
  // user's answers (see record.service.listRecords). Null when not supplied. A successful
  // cleanup should reduce used space, so "freed" = storageBeforeGb - storageAfterGb.
  storageBeforeGb: number | null;
  storageAfterGb: number | null;
}

// email + division are derived server-side from the authenticated session, and the score
// (percent, label, gaps) is recomputed server-side from `selectedIds`, so the client only
// says which section it is and which items it left unchecked.
export interface CreateRecordInput {
  groupId: GroupId;
  selectedIds: string[];
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
  | { ok: false; reason: "unauthenticated" | "rate_limited" };
