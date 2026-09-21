"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { RetentionNoticeGate } from "@/components/RetentionNoticeGate";

// Client wrapper for the same reason as DivisionGuard: next/dynamic({ssr:false}) isn't allowed
// in a Server Component, and a client-side dynamic() only fetches the chunk when it renders.
const loadStorageBefore = () => import("@/components/StorageBeforeDialog").then((m) => m.StorageBeforeDialog);
const StorageBeforeDialog = dynamic(loadStorageBefore, { ssr: false });

// The pop-ups a signed-in user can meet on entering the app, one at a time: the one-time
// data-retention notice first, then — once they have a division — the "storage before the
// activities" question. The layout outlives tab switches, so a dismissed pop-up doesn't return
// until the page is reloaded. Not on /survey: that page has its own "storage after" pop-up, and
// two modals must never stack (a user who skipped "before" and finished everything would get both).
export function EntryDialogs({
  showNotice,
  askStorageBefore,
}: {
  showNotice: boolean;
  askStorageBefore: boolean;
}) {
  const pathname = usePathname();
  const [noticeOpen, setNoticeOpen] = useState(showNotice);

  // While the notice is open, fetch the next pop-up's code so it appears immediately after.
  useEffect(() => {
    if (showNotice && askStorageBefore) void loadStorageBefore();
  }, [showNotice, askStorageBefore]);

  return (
    <>
      {showNotice && <RetentionNoticeGate initial onAcknowledged={() => setNoticeOpen(false)} />}
      {askStorageBefore && !noticeOpen && pathname !== "/survey" && <StorageBeforeDialog />}
    </>
  );
}
