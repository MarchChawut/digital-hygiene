// Domain model — client-safe. Results of the two storage (GB) pop-ups.

// "already_set": an answer is stored already (another tab, or a slow retry) — the dialog closes.
// "too_late": "after" was answered first, so "before" can no longer be written (see user.service).
export type SaveStorageBeforeResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "no_division" | "invalid" | "already_set" | "too_late" };

// `before`/`after` are what is STORED (the first value written wins); `saved` says whether this
// call wrote it, so the pop-up can tell the user when an earlier answer was kept instead.
export type SaveStorageAfterResult =
  | { ok: true; before: number | null; after: number; saved: boolean }
  | { ok: false; reason: "unauthenticated" | "no_division" | "invalid" | "not_finished" | "gone" };
