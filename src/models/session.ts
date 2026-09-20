// Domain model — client-safe.

// The current user's session info passed from the server to client components.
export interface SessionUser {
  email: string;
  name: string | null;
  image: string | null;
  division: string | null;
  isAdmin: boolean;
  // Whether the one-time data-retention notice has been acknowledged.
  retentionNoticeSeen: boolean;
}
