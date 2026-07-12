import { LayoutDashboard } from "lucide-react";

// Shown automatically by Next.js while admin/page.tsx's server-side data
// (auth() + listRecords()/listQuestions()/listItems()) is still resolving.
export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white animate-pulse">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <p className="text-sm">กำลังโหลดระบบหลังบ้าน…</p>
      </div>
    </div>
  );
}
