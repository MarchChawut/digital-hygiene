import "server-only";

// Zero-dependency structured logger. One JSON object per line to stdout/stderr —
// the app runs as a bare Node process under PM2 (or similar), which already
// captures and rotates stdout/stderr, so there's nothing for a transport-based
// library (pino/winston) to add here. Generalizes the previous ad-hoc
// "[retention] ..." console.error bracket-tag convention into a reusable,
// scoped logger used across services/actions/auth for incident-response
// traceability.

type LogMeta = Record<string, unknown>;

function write(level: "info" | "warn" | "error", scope: string, event: string, meta?: LogMeta) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope, event, ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string) {
  return {
    info: (event: string, meta?: LogMeta) => write("info", scope, event, meta),
    warn: (event: string, meta?: LogMeta) => write("warn", scope, event, meta),
    error: (event: string, err?: unknown, meta?: LogMeta) =>
      write("error", scope, event, {
        ...meta,
        error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      }),
  };
}
