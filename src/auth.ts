import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/services/auth.service";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The Prisma 7 generated client is structurally compatible with the adapter.
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  session: {
    strategy: "database",
    // Idle sessions expire after 1 hour so a stale tab/old cookie doesn't silently
    // resume as logged in — re-authenticating with Google or Guest (email link) is
    // required after that. updateAge is kept short relative to maxAge so continuous active use
    // (picking a division, doing the assessment) keeps extending the session and
    // isn't interrupted mid-flow.
    maxAge: 60 * 60, // 1 hour
    updateAge: 5 * 60, // refresh the expiry every 5 minutes of activity
  },
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
