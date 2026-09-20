import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/services/auth.service";
import * as auditService from "@/services/audit.service";
import { authConfig } from "@/auth.config";

// A sign-in link may be requested by anyone (no login), so cap how many unexpired links one
// address can have outstanding — it stops the endpoint being used to mail-bomb an address or burn
// the Resend quota one address at a time. (Per-IP / global limits belong at Cloudflare.)
const MAX_ACTIVE_LINKS_PER_ADDRESS = 3;

// The Prisma 7 generated client is structurally compatible with the adapter. Wrapped to:
//  - lower-case e-mail on lookup/create: identity columns use an exact (utf8mb4_bin) collation,
//    so "User@x.com" and "user@x.com" must not become two accounts;
//  - never store Google's access/refresh/id tokens: the app never calls Google APIs, so keeping
//    them (in plaintext) would only add data to protect and to erase.
const baseAdapter = PrismaAdapter(prisma as unknown as PrismaClient);
const adapter: Adapter = {
  ...baseAdapter,
  getUserByEmail: (email) => baseAdapter.getUserByEmail!(email.toLowerCase()),
  createUser: (user) => baseAdapter.createUser!({ ...user, email: user.email?.toLowerCase() ?? user.email }),
  linkAccount: (account) =>
    baseAdapter.linkAccount!({
      ...account,
      access_token: undefined,
      refresh_token: undefined,
      id_token: undefined,
      session_state: undefined,
    }),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
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
    // Keep the org-domain / e-mail policy from auth.config.ts — replacing `signIn` here without
    // calling it would silently disable that gate. Only the Prisma-dependent link cap is added.
    async signIn(params) {
      if (!(await authConfig.callbacks.signIn(params))) return false;
      if (params.account?.provider === "resend" && params.email?.verificationRequest) {
        const identifier = (params.user.email ?? "").toLowerCase();
        const active = await prisma.verificationToken.count({
          where: { identifier, expires: { gt: new Date() } },
        });
        if (active >= MAX_ACTIVE_LINKS_PER_ADDRESS) return false;
      }
      return true;
    },
    // Database sessions: `user` is the DB row, so `division` reflects the latest value
    // on every request (a router.refresh() after setDivision picks it up immediately).
    //
    // Build the returned object from scratch: Auth.js hands this callback the raw Session row
    // (id, sessionToken, userId) plus the whole User row, and whatever is returned is served
    // verbatim by GET /api/auth/session — returning the input leaked the session token (which
    // must stay HttpOnly) and internal columns to any script on the page.
    session({ session, user }) {
      return {
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          image: user.image ?? null,
          division: (user as { division?: string | null }).division ?? null,
          // Same DB row, so the (app) layout needs no extra query for the one-time notice.
          retentionNoticeSeen:
            (user as { retentionNoticeAcknowledgedAt?: Date | null }).retentionNoticeAcknowledgedAt != null,
          isAdmin: isAdmin(user.email),
        },
      } as typeof session;
    },
  },
  // events (unlike callbacks) always run server-side after the sign-in decision
  // is final — the right place for the durable audit row (this file is Node-only
  // / Prisma-safe, unlike the edge-safe src/auth.config.ts).
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user.email) return;
      await auditService.recordAudit({
        actorEmail: user.email,
        action: "auth.signin",
        metadata: { provider: account?.provider ?? null, isNewUser: !!isNewUser },
      });
    },
  },
});
