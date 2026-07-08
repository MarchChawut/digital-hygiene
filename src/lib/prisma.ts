import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 7 uses the query compiler + a driver adapter. For MariaDB we pass the
// connection string straight to the MariaDB adapter (also gives connection pooling).
const connectionString = process.env.DATABASE_URL ?? "";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = new URL(connectionString);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // Default connectTimeout (1s) is too tight when the DB is reached over a
    // Tailscale VPN hop — occasional latency spikes were being misreported as
    // "session expired" further up the stack (auth.ts's session lookup). Give
    // it more headroom.
    connectTimeout: 10_000,
    acquireTimeout: 15_000,
  });
  return new PrismaClient({ adapter });
}

// Reuse a single client across dev hot-reloads to avoid exhausting DB connections.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
