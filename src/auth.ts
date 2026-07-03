import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/services/auth.service";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The Prisma 7 generated client is structurally compatible with the adapter.
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  session: { strategy: "database" },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Database sessions: `user` is the DB row, so `division` reflects the latest value
    // on every request (a router.refresh() after setDivision picks it up immediately).
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.division = (user as { division?: string | null }).division ?? null;
        session.user.isAdmin = isAdmin(session.user.email);
      }
      return session;
    },
  },
});
