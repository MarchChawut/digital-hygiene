// Domain model — client-safe (pure types, no server-only / prisma imports).

// The audit-log shape the admin UI works with. `ts` is epoch millis (mapped
// from the DB's createdAt), same convention as AssessmentRecord.
export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ts: number;
}
