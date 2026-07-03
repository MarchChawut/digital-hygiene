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
  const adapter = new PrismaMariaDb(connectionString);
  return new PrismaClient({ adapter });
}

// Reuse a single client across dev hot-reloads to avoid exhausting DB connections.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
