import { ShieldCheck } from "lucide-react";

// Shown automatically by Next.js while page.tsx's server-side data (auth()
// session + checklist items) is still resolving — replaces the blank white
// screen that would otherwise show on first paint.
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-sm">กำลังโหลด…</p>
      </div>
    </div>
  );
}
