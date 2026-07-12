import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

// Optional org-domain restriction. Set ALLOWED_EMAIL_DOMAIN="thaimooc.ac.th" to only
// allow that Google Workspace domain; leave it empty to allow any Google account.
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() || "";

// Edge-safe config (no Prisma import here) — providers + the sign-in gate.
// Read either GOOGLE_CLIENT_ID/SECRET (used in this project's .env) or Auth.js's
// default AUTH_GOOGLE_ID/SECRET.
export const authConfig = {
  // Send failed/rejected sign-ins back to our own start screen instead of
  // Auth.js's default unstyled /api/auth/error page (which doesn't recover on refresh).
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
      // Lets a Guest (email-verified) account that later signs in with Google
      // using the same address merge into the same User row instead of hitting
      // Auth.js's AccountNotLinked error. Google verifies email ownership
      // itself, so auto-linking here isn't "dangerous" in this app's threat model.
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "Digital Hygiene <chawut.sa@gmail.com>",
    }),
  ],
  callbacks: {
    signIn({ account, profile, user }) {
      // Guest sign-in: any real, clicked-and-verified email is allowed — the
      // org-domain gate below only applies to Google sign-in.
      if (account?.provider === "resend") return true;
      if (!ALLOWED_DOMAIN) return true;
      const email = (profile?.email ?? user?.email ?? "").toLowerCase();
      return email.endsWith("@" + ALLOWED_DOMAIN);
    },
  },
} satisfies NextAuthConfig;
