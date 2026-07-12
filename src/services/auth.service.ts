import "server-only";

// Admin emails come from the ADMIN_EMAILS env var (comma-separated), with a
// built-in fallback. The email is trusted because it comes from a database
// session (Auth.js) created only after either a verified Google OAuth login or
// a clicked Guest email-verification link. This module is PURE — it must NOT
// import "@/auth" (that would create an import cycle, since @/auth imports
// isAdmin from here).
const DEFAULT_ADMIN_EMAILS = ["chawut.sa@gmail.com", "kornwalairathwork@gmail.com"];

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",")
  : DEFAULT_ADMIN_EMAILS
)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes((email ?? "").trim().toLowerCase());
}
