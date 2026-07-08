import DigitalHygieneApp from "@/components/DigitalHygieneApp";
import { auth } from "@/auth";
import { listItems } from "@/services/checklist.service";
import type { SessionUser } from "@/models/session";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, checklistItems, { error }] = await Promise.all([
    auth(),
    listItems(),
    searchParams,
  ]);
  const user: SessionUser | null = session?.user
    ? {
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        division: session.user.division ?? null,
        isAdmin: session.user.isAdmin ?? false,
      }
    : null;

  return <DigitalHygieneApp user={user} checklistItems={checklistItems} authError={error ?? null} />;
}
