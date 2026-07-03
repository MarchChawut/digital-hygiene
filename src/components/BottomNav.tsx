"use client";

import Link from "next/link";
import { ClipboardList, LayoutDashboard } from "lucide-react";

// Mobile-only bottom navigation. Only shown for admins, who navigate between the
// assessment ("/") and the backoffice ("/admin"); regular users have a single page.
export function BottomNav({ current }: { current: "app" | "admin" }) {
  const tabs = [
    { id: "app" as const, label: "แบบประเมิน", href: "/", icon: ClipboardList },
    { id: "admin" as const, label: "ระบบหลังบ้าน", href: "/admin", icon: LayoutDashboard },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {tabs.map((t) => {
          const active = current === t.id;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
