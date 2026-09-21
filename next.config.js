const path = require("path");

// Baseline security headers for every response. A full script-src CSP needs a per-request nonce
// (a proxy file) because Next injects inline scripts; until then this covers the parts that
// don't need one: framing (clickjacking of the sign-in card / admin UI), MIME sniffing, referrer
// leakage, base-tag and plugin injection, powerful browser features, and HTTPS pinning (browsers
// ignore HSTS on plain http, so it is harmless in dev).
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" }, // same as frame-ancestors, for older browsers
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework/version to scanners ("X-Powered-By: Next.js").
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Files in public/ carry no content hash, so Next serves them with max-age=0 (revalidated on
      // every page view); the logo changes rarely, so let browsers keep it for a day.
      { source: "/DTC-Logo.png", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    ];
  },
  // Pin the file-tracing root to this project. Without this, a stray lockfile
  // in a parent directory makes Next.js walk up the tree (and on macOS that can
  // hit the TCC-protected ~/Downloads folder, breaking the Turbopack build).
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
