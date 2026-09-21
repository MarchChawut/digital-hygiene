import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Early, render-free redirect for signed-out visitors — the path a phone takes when it scans a
// section's QR code (/backup → /login?callbackUrl=%2Fbackup).
//
// Why this exists: the pages redirect signed-out users themselves, but that redirect runs inside
// a streamed (Suspense) render, so the browser gets a 200 page holding a <meta refresh> instead of
// an HTTP 307 — it downloads the whole app shell before being sent on (measured: Lighthouse 87
// vs 94 for opening /login directly). A 307 from here costs one round trip and no rendering.
//
// This is an OPTIMISATION, NOT AUTHORISATION. It only asks "is there a session cookie at all?"
// — it never validates one (that needs the DB) and it never lets anything through that a page
// wouldn't: a stale or forged cookie passes this check and is then refused by the page's own
// getSession() guard, exactly as before. Keep those guards.
//
// "/" is handled too: it has no content, so a stale/valid cookie → /cleanup and none → /login.
//
// Deliberately narrow: only navigations (GET/HEAD asking for HTML). Server Actions (POST), client
// -side navigations and prefetches (RSC requests) and API calls are left to the app, which returns
// typed results / handles them itself.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { method, headers, nextUrl } = request;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const isRoot = nextUrl.pathname === "/";

  // Signed in (a session cookie exists) → nothing to do, except that "/" has no content of its
  // own and just forwards to the first page.
  if (hasSession && !isRoot) return NextResponse.next();

  if (method !== "GET" && method !== "HEAD") return NextResponse.next();
  if (headers.has("next-action") || headers.has("rsc") || headers.has("next-router-prefetch")) {
    return NextResponse.next();
  }
  if (!(headers.get("accept") ?? "").includes("text/html")) return NextResponse.next();
  // "/?error=…" is forwarded (with the error) by the page itself.
  if (isRoot && nextUrl.searchParams.has("error")) return NextResponse.next();

  // The proxy runtime only accepts an ABSOLUTE Location, and the origin Next itself sees
  // (request.url) is the local one behind the Cloudflare Tunnel — an absolute URL built from it
  // (or from a client-supplied Host / X-Forwarded-Host, which anyone can forge) would send phones
  // to the wrong place. So use the configured public origin, AUTH_URL, which Auth.js needs to be
  // right anyway. Not configured → don't guess: let the page do its own redirect.
  let origin: string;
  try {
    origin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").origin;
  } catch {
    return NextResponse.next();
  }

  // nextUrl.pathname is one of the fixed matcher paths below, so it is safe to reflect
  // (encoded) into callbackUrl; login re-validates it anyway (safeCallbackPath).
  const target = new URL(hasSession ? "/cleanup" : "/login", origin);
  if (!hasSession && !isRoot) target.searchParams.set("callbackUrl", nextUrl.pathname);
  const response = NextResponse.redirect(target, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/", "/cleanup", "/security", "/footprint", "/backup", "/survey", "/admin"],
};
