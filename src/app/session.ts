import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import type { SessionUser } from "@/models/session";

// The signed-in user for this request, or null. Wrapped in React's cache() so the
// (app) layout and the page it renders share a single session lookup per request.
// Lives in the app layer (not services/lib) because it resolves the session — see
// the "no import cycle" convention in CLAUDE.md.
export const getSession = cache(async (): Promise<{ userId: string; user: SessionUser } | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    user: {
      email: session.user.email ?? "",
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      division: session.user.division ?? null,
      isAdmin: session.user.isAdmin ?? false,
      retentionNoticeSeen: session.user.retentionNoticeSeen ?? false,
    },
  };
});
