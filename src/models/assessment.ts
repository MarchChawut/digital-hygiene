// Domain model — client-safe (pure types, no server-only / prisma imports).

// The record shape the UI works with. `ts` is epoch millis (mapped from the
// DB's createdAt) so formatting helpers keep working unchanged.
export interface AssessmentRecord {
  id: string;
  email: string;
  division: string;
  ts: number;
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
}

// email + division are derived server-side from the authenticated session,
// so the client only sends the assessment result.
export interface CreateRecordInput {
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
}
