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
  // The self-reported storage (GB) answers; null = not answered yet (drives the two pop-ups).
  storageBeforeGb: number | null;
  storageAfterGb: number | null;
}
