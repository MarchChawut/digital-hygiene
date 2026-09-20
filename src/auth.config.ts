import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { createLogger } from "@/lib/logger";
import { checkSignIn } from "@/lib/signin-policy";

// Optional org-domain restriction. Set ALLOWED_EMAIL_DOMAIN="thaimooc.ac.th" to only
// allow that Google Workspace domain; leave it empty to allow any Google account.
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() || "";

const log = createLogger("auth");

// Edge-safe config (no Prisma import here) — providers + the sign-in gate.
// Read either GOOGLE_CLIENT_ID/SECRET (used in this project's .env) or Auth.js's
// default AUTH_GOOGLE_ID/SECRET.
export const authConfig = {
  // Send sign-in and failed/rejected sign-ins to our own /login screen instead of
  // Auth.js's default unstyled /api/auth pages (which don't recover on refresh).
  pages: {
    signIn: "/login",
    error: "/login",
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
      // Auth.js default is 24 h. The session itself only lasts 1 h and the link is redeemed by a
      // plain GET, so a short-lived link limits what a leaked/scanned/forwarded one is worth.
      maxAge: 15 * 60,
    }),
  ],
  callbacks: {
    // The whole "may this identity sign in" policy lives in lib/signin-policy.ts (pure, unit
    // tested): plain-ASCII e-mail only (blocks look-alike addresses), Google's own
    // `email_verified`, and the optional org-domain gate — which applies to Google only, Guest
    // sign-in is intentionally exempt. No Prisma here (this config must stay edge-safe); the
    // durable audit row for *accepted* sign-ins is written from src/auth.ts's events.signIn.
    // NOTE: src/auth.ts wraps this callback (adds a per-address link cap) — it must keep calling it.
    signIn({ account, profile, user }) {
      const email = profile?.email ?? user?.email;
      const decision = checkSignIn({
        provider: account?.provider,
        email,
        googleEmailVerified: (profile as { email_verified?: boolean } | undefined)?.email_verified,
        allowedDomain: ALLOWED_DOMAIN,
      });
      if (!decision.ok) {
        log.warn("signin_rejected", {
          reason: decision.reason,
          provider: account?.provider,
          email: String(email ?? "").slice(0, 80),
        });
        return false;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
