import type { DefaultSession } from "next-auth";

// Augment the session/user with the app-specific fields set in the session callback.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      division: string | null;
      isAdmin: boolean;
      // true once the user has acknowledged the one-time 30-day data-retention notice.
      retentionNoticeSeen: boolean;
      // Self-reported storage (GB) answers; null = not answered yet.
      storageBeforeGb: number | null;
      storageAfterGb: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    division?: string | null;
  }
}
