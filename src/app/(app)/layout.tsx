import { getSession } from "@/app/session";
import { AppTopBar } from "@/components/AppTopBar";
import { AppHero } from "@/components/AppHero";
import { SectionTabs } from "@/components/SectionTabs";
import { BottomNav } from "@/components/BottomNav";
import { AppFooter } from "@/components/AppFooter";
import { DivisionGuard } from "./DivisionGuard";
import { EntryDialogs } from "./EntryDialogs";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AppTopBar email={user.email} admin={user.isAdmin} />

      {division ? (
        <>
          <AppHero division={division} />
          <SectionTabs />
          <main className="w-full max-w-4xl mx-auto px-5 py-6 sm:py-8 pb-10">{children}</main>
        </>
      ) : (
        <DivisionGuard user={user} />
      )}

      <AppFooter clearBottomNav={user.isAdmin && !!division} />

      <EntryDialogs
        showNotice={showRetentionNotice}
        askStorageBefore={!!division && user.storageBeforeGb == null && user.storageAfterGb == null}
      />
      {user.isAdmin && division && <BottomNav current="app" />}
    </div>
  );
}
