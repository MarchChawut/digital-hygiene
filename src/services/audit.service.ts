import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AuditLogEntry } from "@/models/audit";
import { createLogger } from "@/lib/logger";

const log = createLogger("audit");

// DB row (createdAt/JSON) -> client-facing model (ts number / plain object),
// same conversion convention as record.service.ts's toModel.
function toModel(row: {
  id: string;
  actorEmail: string;
  action: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: Date;
}): AuditLogEntry {
  return {
    id: row.id,
    actorEmail: row.actorEmail,
    action: row.action,
    targetId: row.targetId,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    ts: row.createdAt.getTime(),
  };
}

// Record one audit event. Never throws: a failure to persist an audit row
// (e.g. a transient DB hiccup — this app talks to MariaDB over Tailscale) must
// not break the primary action it's recording — most call sites are either
// mid-sign-in (src/auth.ts's events.signIn) or right after an admin mutation
// has already succeeded, so a throw here would misreport an already-completed
// action as failed. Logged instead, so the failure is still visible.
export async function recordAudit(entry: {
  actorEmail: string;
  action: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { ...entry, metadata: entry.metadata as Prisma.InputJsonValue | undefined },
    });
  } catch (err) {
    log.error("write_failed", err, { action: entry.action, actorEmail: entry.actorEmail });
  }
}

// Most recent audit events, newest first.
export async function listAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toModel);
}
