// Tiny in-process cache for reads that change only when an admin edits them (the
// checklist and the survey questions). Every section page needs them, so without this
// each page view — including each tab click — re-queries the DB (a WAN-scale hop when
// the DB is reached over Tailscale).
//
// - TTL is a safety net: another server process, or an edit made straight in the DB,
//   can't leave a stale copy for longer than `ttlMs`.
// - invalidate() must be called by every write path that changes the data. A load that
//   started before an invalidate() never repopulates the cache with its (stale) result.
// - Concurrent misses share one in-flight load instead of each hitting the DB.
export function createCachedLoader<T>(load: () => Promise<T>, ttlMs = 60_000) {
  let entry: { value: T; at: number } | null = null;
  let inflight: Promise<T> | null = null;
  let version = 0;

  return {
    get(): Promise<T> {
      if (entry && Date.now() - entry.at < ttlMs) return Promise.resolve(entry.value);
      if (inflight) return inflight;
      const startedAt = version;
      const p = load().then((value) => {
        if (startedAt === version) entry = { value, at: Date.now() };
        return value;
      });
      inflight = p;
      const clear = () => {
        if (inflight === p) inflight = null;
      };
      p.then(clear, clear);
      return p;
    },
    invalidate() {
      version++;
      entry = null;
      inflight = null;
    },
  };
}
