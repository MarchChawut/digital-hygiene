// Sign-in policy — pure functions with NO imports, so it is edge-safe (auth.config.ts) and can
// be unit-tested directly with `node --experimental-strip-types`.

// A plain-ASCII e-mail address: exactly one "@", no whitespace / control characters / quotes /
// commas, printable ASCII only (code 33-126), and a dotted domain. This deliberately rejects
// Unicode look-alikes ("gmaîl.com", full-width "＠") that a case/accent-insensitive database
// collation, or a mail library that normalises Unicode, could fold onto a real user's address
// (see the H-1 finding: a look-alike of an admin's address signing in as that admin).
export function isSafeAsciiEmail(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 3 || value.length > 191) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 33 || code > 126) return false; // control chars, space, DEL, and anything non-ASCII
  }
  if (/["',;<>()[\]\\:]/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(domain);
}

export type SignInDecision =
  | { ok: true }
  | { ok: false; reason: "invalid_email" | "unverified_google_email" | "domain_not_allowed" };

// Decide whether a sign-in attempt may proceed. `allowedDomain` (ALLOWED_EMAIL_DOMAIN) only
// gates Google — Guest (magic-link) sign-in is intentionally exempt, as documented.
export function checkSignIn(input: {
  provider: string | undefined;
  email: string | null | undefined;
  googleEmailVerified?: boolean | undefined;
  allowedDomain?: string;
}): SignInDecision {
  const email = (input.email ?? "").trim();
  if (!isSafeAsciiEmail(email)) return { ok: false, reason: "invalid_email" };
  if (input.provider === "google") {
    // Google says the address isn't verified → never trust it as an identity.
    if (input.googleEmailVerified === false) return { ok: false, reason: "unverified_google_email" };
    const domain = (input.allowedDomain ?? "").trim().toLowerCase();
    if (domain && !email.toLowerCase().endsWith("@" + domain)) return { ok: false, reason: "domain_not_allowed" };
  }
  return { ok: true };
}
