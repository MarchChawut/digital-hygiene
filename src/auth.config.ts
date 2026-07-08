import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

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
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? process.env.AUTH_FACEBOOK_SECRET,
    }),
  ],
  callbacks: {
    signIn({ account, profile, user }) {
      // Facebook accounts never carry the institutional email domain, so the
      // org-domain gate below only applies to Google sign-in.
      if (account?.provider === "facebook") {
        // Facebook doesn't always deliver an email (mobile-only accounts, or the
        // user declined the "email" permission at consent) — the rest of this app
        // is keyed on email, so reject early with a clear reason instead of letting
        // the user reach the division gate and fail confusingly later.
        if (!profile?.email) return "/?error=FacebookNoEmail";
        return true;
      }
      if (!ALLOWED_DOMAIN) return true;
      const email = (profile?.email ?? user?.email ?? "").toLowerCase();
      return email.endsWith("@" + ALLOWED_DOMAIN);
    },
  },
} satisfies NextAuthConfig;
