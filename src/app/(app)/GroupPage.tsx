import { redirect } from "next/navigation";
import { getSession } from "@/app/session";
import { listItems } from "@/services/checklist.service";
import type { GroupId } from "@/models/activity-group";
import { loginPath } from "@/lib/safe-redirect";
import { GroupSection } from "@/components/GroupSection";
import { DivisionGuard } from "./DivisionGuard";

// One activity section. Each of /cleanup, /security, /footprint and /backup is its own route
// (see the four folders next to this file), so it can have its own URL and QR code.
//
// Deliberately NOT a dynamic `[group]` segment: that also matched /favicon.ico, /robots.txt,
// /foo … and ran the whole (app) layout — including a session lookup, 2 DB queries — for each
// of them before the page could 404. With explicit routes those paths never reach this layout.
// Keep the folders in sync with GROUP_IDS (src/models/activity-group.ts).
export async function GroupPage({ group }: { group: GroupId }) {
  // Signed out → /login, remembering this section so login returns here (a scanned QR
  // code still ends on its own section). The layout doesn't re-run on a client-side tab
  // click, so this page can't rely on it having checked.
  const session = await getSession();
  if (!session) redirect(loginPath(`/${group}`));
  if (!session.user.division) return <DivisionGuard user={session.user} />;

  const items = (await listItems()).filter((i) => i.groupId === group);
  return <GroupSection key={group} groupId={group} items={items} userEmail={session.user.email} />;
}
