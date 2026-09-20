"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, type LucideIcon } from "lucide-react";

import { ACTIVITY_GROUPS } from "@/models/activity-group";
import { GROUP_THEME } from "@/lib/theme";

// Short labels so all 5 tabs fit the 4xl content width on desktop (the full group name
// is the heading on each section's page); on phones the bar scrolls horizontally.
const SHORT_LABEL = {
  cleanup: "Cleanup",
  security: "Auto Disconnect",
  footprint: "Footprint",
  backup: "Backup",
} as const;

const TABS: { href: string; label: string; icon: LucideIcon; active: string }[] = [
  ...ACTIVITY_GROUPS.map((g) => ({
    href: `/${g.id}`,
    label: SHORT_LABEL[g.id],
    icon: GROUP_THEME[g.id].icon,
    active: GROUP_THEME[g.id].tabActive,
  })),
  {
    href: "/survey",
    label: "แบบประเมิน",
    icon: ClipboardCheck,
    active: "border-blue-500 text-blue-700",
  },
];

// Navbar under the hero: one real link per section, so each has its own URL (and QR
// code) and any tab can be opened first. Sticky under the 4rem TopBar.
export function SectionTabs() {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLDivElement>(null);

  // On narrow screens the 5 tabs scroll horizontally — bring the active one to the
  // middle (e.g. after opening /backup from a QR code). Set scrollLeft on the
  // scroller itself rather than scrollIntoView, which would also scroll the page.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeTab = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !activeTab) return;
    scroller.scrollTo({
      left: activeTab.offsetLeft - (scroller.clientWidth - activeTab.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [pathname]);

  return (
    <nav
      aria-label="หมวดกิจกรรม"
      className="sticky top-16 z-40 border-y border-slate-200 bg-white"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-5">
        <div ref={scrollerRef} className="relative flex overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors md:flex-1 md:justify-center ${
                  active ? tab.active : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
