import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Optional org-domain restriction. Set ALLOWED_EMAIL_DOMAIN="thaimooc.ac.th" to only
// allow that Google Workspace domain; leave it empty to allow any Google account.
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() || "";

// Edge-safe config (no Prisma import here) — providers + the sign-in gate.
// Read either GOOGLE_CLIENT_ID/SECRET (used in this project's .env) or Auth.js's
// default AUTH_GOOGLE_ID/SECRET.
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    signIn({ profile, user }) {
      if (!ALLOWED_DOMAIN) return true;
      const email = (profile?.email ?? user?.email ?? "").toLowerCase();
      return email.endsWith("@" + ALLOWED_DOMAIN);
    },
  },
} satisfies NextAuthConfig;
