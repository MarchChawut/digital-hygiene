import { notFound, redirect } from "next/navigation";
import { getSession } from "@/app/session";
import { listItems } from "@/services/checklist.service";
import { isGroupId } from "@/models/activity-group";
import { loginPath } from "@/lib/safe-redirect";
import { GroupSection } from "@/components/GroupSection";
import { DivisionGuard } from "../DivisionGuard";

// One activity section: /cleanup, /security, /footprint, /backup. Each is its own
// URL so it can get its own QR code.
export default async function Page({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!isGroupId(group)) notFound();

  // Signed out → /login, remembering this section so login returns here (a scanned QR
  // code still ends on its own section). The layout doesn't re-run on a client-side tab
  // click, so this page can't rely on it having checked.
  const session = await getSession();
  if (!session) redirect(loginPath(`/${group}`));
  if (!session.user.division) return <DivisionGuard user={session.user} />;

  const items = (await listItems()).filter((i) => i.groupId === group);
  return <GroupSection key={group} groupId={group} items={items} userEmail={session.user.email} />;
}
