"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Code-split: a first-time visitor never needs this dialog's JS on first paint. This
// wrapper exists because next/dynamic with ssr:false isn't allowed in Server
// Components (the (app) layout).
const DataRetentionNoticeDialog = dynamic(
  () => import("@/components/DataRetentionNoticeDialog").then((m) => m.DataRetentionNoticeDialog),
  { ssr: false }
);

// One-time data-retention notice, shown right after sign-in. `initial` is seeded
// server-side (from a DB column, not localStorage), so there's no post-hydration
// round trip or dialog flash.
export function RetentionNoticeGate({
  initial,
  onAcknowledged,
}: {
  initial: boolean;
  onAcknowledged?: () => void;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <DataRetentionNoticeDialog
      open={open}
      onAcknowledged={() => {
        setOpen(false);
        onAcknowledged?.();
      }}
    />
  );
}
