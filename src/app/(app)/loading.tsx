// Shown inside the shell (under the hero + tabs) while a section page's server data
// is loading, so switching tabs feels instant instead of blanking the whole screen.
// min-h ≈ the shortest section card (358-414px), so the footer moves as little as possible
// when the real content (up to ~665px for Cleanup) replaces it.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 min-h-[25rem]" aria-busy="true" aria-label="กำลังโหลด">
      <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
    </div>
  );
}
