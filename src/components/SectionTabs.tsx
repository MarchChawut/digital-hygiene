"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardCheck, type LucideIcon } from "lucide-react";

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
  // Which sides still hide tabs — drives the arrow buttons (shown only where there's more).
  const [more, setMore] = useState({ left: false, right: false });

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

  // Track overflow from scroll + size changes. Both are callbacks (the ResizeObserver also
  // fires once on observe), so the initial state needs no setState in the effect body.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      const left = scroller.scrollLeft > 2;
      const right = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
      setMore((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    Array.from(scroller.children).forEach((child) => observer.observe(child));
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scrollByPage = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    scroller?.scrollBy({ left: direction * scroller.clientWidth * 0.6, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="หมวดกิจกรรม"
      className="sticky top-16 z-40 border-y border-slate-200 bg-white"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-5">
        <div className="relative">
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
          {more.left && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="เลื่อนแท็บไปทางซ้าย"
              onClick={() => scrollByPage(-1)}
              className="absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-start bg-linear-to-r from-white via-white/90 to-transparent text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {more.right && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="เลื่อนแท็บไปทางขวา"
              onClick={() => scrollByPage(1)}
              className="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-end bg-linear-to-l from-white via-white/90 to-transparent text-slate-500 hover:text-slate-900"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
