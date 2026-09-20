import { getSession } from "@/app/session";
import { AppTopBar } from "@/components/AppTopBar";
import { AppHero } from "@/components/AppHero";
import { SectionTabs } from "@/components/SectionTabs";
import { RetentionNoticeGate } from "@/components/RetentionNoticeGate";
import { BottomNav } from "@/components/BottomNav";
import { DivisionGuard } from "./DivisionGuard";

// Shell for the 5 section pages (/cleanup, /security, /footprint, /backup, /survey):
// top bar, and — once signed in with a division — the hero and tab navbar. A signed-in user
// without a division sees only the division gate; a signed-out visitor sees no shell at all
// (each page redirects them to /login, which has its own top bar).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session?.user ?? null;
  if (!user) return <>{children}</>;
  const division = user.division;
  const showRetentionNotice = !user.retentionNoticeSeen;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppTopBar email={user.email} admin={user.isAdmin} />

      {division ? (
        <>
          <AppHero division={division} />
          <SectionTabs />
          <main className="max-w-4xl mx-auto px-5 py-6 pb-24 sm:py-8 md:pb-14">
            {children}
            <footer className="py-12 mt-6 border-t border-slate-200 text-center">
              <p className="text-slate-400 text-sm">© Digital Hygiene &amp; Safety First</p>
              <p className="text-slate-300 text-[11px] mt-1.5">ล้างเครื่องให้ใส ใส่ใจภูมิคุ้มกันดิจิทัล</p>
            </footer>
          </main>
        </>
      ) : (
        <DivisionGuard user={user} />
      )}

      {showRetentionNotice && <RetentionNoticeGate initial />}
      {user.isAdmin && division && <BottomNav current="app" />}
    </div>
  );
}
