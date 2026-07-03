const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project. Without this, a stray lockfile
  // in a parent directory makes Next.js walk up the tree (and on macOS that can
  // hit the TCC-protected ~/Downloads folder, breaking the Turbopack build).
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
