// Next.js boot-hook file convention (https://nextjs.org/docs/app/guides/instrumentation).
// Runs once when the long-lived Node server starts (self-hosted `pnpm start`,
// not serverless) — used here to schedule the 30-day data-retention cleanup
// sweep in-process, without needing an external OS cron.
export async function register() {
  // instrumentation.ts also loads under the edge runtime; the cleanup service
  // touches Prisma (Node-only), so both the dynamic import and the interval
  // below must be gated to the nodejs runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guard against duplicate intervals being registered on dev hot-reload
  // (mirrors the globalForPrisma reuse pattern in src/lib/prisma.ts).
  const g = globalThis as unknown as { __retentionSchedulerStarted?: boolean };
  if (g.__retentionSchedulerStarted) return;
  g.__retentionSchedulerStarted = true;

  const { runRetentionCleanup } = await import("@/services/retention.service");

  const DAY_MS = 24 * 60 * 60 * 1000;
  const sweep = () => {
    runRetentionCleanup().catch((err) => {
      console.error("[retention] cleanup sweep failed:", err);
    });
  };
  sweep(); // run once at boot, then daily
  setInterval(sweep, DAY_MS);
}
