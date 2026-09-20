// Same-site redirect helpers — client-safe (pure functions). `callbackUrl` comes from the
// query string, i.e. from anyone who can craft a link, so it must never be trusted as-is:
// it is only ever used after passing safeCallbackPath().

export const HOME_PATH = "/cleanup"; // the first page after signing in

// True if the string has a control character (code < 32, or DEL) or a backslash — browsers
// treat "/\evil.com" like "//evil.com", and control characters can smuggle in line breaks.
function hasUnsafeChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127 || code === 92) return true;
  }
  return false;
}

// Returns `raw` only if it is a plain same-site path; otherwise `fallback`.
// Rejects: non-strings, protocol-relative ("//evil.com"), backslashes, control characters,
// absolute URLs, over-long values, and the sign-in / Auth.js API routes themselves (so
// "log in → sent back to /login → …" can never loop).
export function safeCallbackPath(raw: unknown, fallback: string = HOME_PATH): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (value.length === 0 || value.length > 200) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (hasUnsafeChar(value)) return fallback;
  const path = value.split(/[?#]/)[0];
  if (path === "/login" || path.startsWith("/login/")) return fallback;
  if (path === "/api" || path.startsWith("/api/")) return fallback;
  return value;
}

// "/login" URL for a signed-out visitor, remembering where they were headed and, optionally,
// why they were sent here (an error code shown as a toast by AuthErrorToast).
export function loginPath(callback?: string, error?: string): string {
  const params = new URLSearchParams();
  const safe = callback === undefined ? "" : safeCallbackPath(callback, "");
  if (safe) params.set("callbackUrl", safe);
  if (error) params.set("error", error);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}
