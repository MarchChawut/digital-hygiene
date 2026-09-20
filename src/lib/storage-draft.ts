// Client-only draft of the Digital Cleanup before/after storage (GB) inputs, so the
// values survive switching between section tabs (the user reads "before", cleans the
// device, then comes back for "after"). An external store for useSyncExternalStore:
// backed by an in-memory map (so typing still works if sessionStorage is blocked) and
// written through to sessionStorage (so it also survives a reload). Keyed by email so
// a shared device never leaks one person's draft to the next.

export interface StorageDraft {
  before: string;
  after: string;
}

const EMPTY_DRAFT: StorageDraft = { before: "", after: "" };
const key = (email: string) => `dh:storage:${email}`;
const cache = new Map<string, string>(); // raw JSON per email
const listeners = new Set<() => void>();

export function subscribeStorageDraft(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Snapshot for useSyncExternalStore — a string, so it's referentially stable.
export function getStorageDraftSnapshot(email: string): string {
  let raw = cache.get(email);
  if (raw === undefined) {
    try {
      raw = sessionStorage.getItem(key(email)) ?? "";
    } catch {
      raw = "";
    }
    cache.set(email, raw);
  }
  return raw;
}

export function parseStorageDraft(raw: string): StorageDraft {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.before === "string" && typeof parsed?.after === "string") {
      return { before: parsed.before, after: parsed.after };
    }
  } catch {
    // empty or corrupt — fall through
  }
  return EMPTY_DRAFT;
}

export function setStorageDraft(email: string, draft: StorageDraft) {
  const raw = JSON.stringify(draft);
  cache.set(email, raw);
  try {
    sessionStorage.setItem(key(email), raw);
  } catch {
    // non-fatal: the in-memory copy still carries it across tabs
  }
  listeners.forEach((l) => l());
}
