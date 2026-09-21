"use client";

import dynamic from "next/dynamic";
import type { SessionUser } from "@/models/session";

// Shown to a signed-in user who hasn't picked a division yet (the one-time gate after
// first sign-in); renders nothing once they have one. Signed-out visitors never get here —
// the (app) pages redirect them to /login first.
//
// Client component ON PURPOSE: next/dynamic in a Server Component doesn't keep a module out
// of the layout's chunk set (measured), while a client-side dynamic() only fetches the
// chunk when the gate actually renders. Don't import DivisionGate (or next-auth/react)
// statically from the (app) layout or pages — every tab would ship them again.
const DivisionGate = dynamic(() => import("@/components/DivisionGate").then((m) => m.DivisionGate));

export function DivisionGuard({ user }: { user: SessionUser }) {
  if (user.division) return null;
  return <DivisionGate name={user.name} email={user.email} />;
}
