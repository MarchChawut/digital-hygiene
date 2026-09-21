import type { MetadataRoute } from "next";

// A static /robots.txt (instead of falling through to a page render): keep crawlers out of the
// back office and the auth API.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: ["/admin", "/api/"] } };
}
