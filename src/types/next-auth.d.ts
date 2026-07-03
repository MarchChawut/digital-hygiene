import type { DefaultSession } from "next-auth";

// Augment the session/user with the app-specific fields set in the session callback.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      division: string | null;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    division?: string | null;
  }
}
