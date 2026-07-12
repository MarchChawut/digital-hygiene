"use client";

import { useState } from "react";
import { acknowledgeDataRetentionNotice } from "@/app/actions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function DataRetentionNoticeDialog({
  open,
  onAcknowledged,
}: {
  open: boolean;
  onAcknowledged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  // This is a one-time compliance notice, not a casual dialog — every dismiss
  // path (button, backdrop, Escape) routes through the same acknowledge call
  // so the "seen" flag is always persisted, mirroring the showResult/closeResult
  // chaining pattern used elsewhere in DigitalHygieneApp.tsx.
  const acknowledge = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await acknowledgeDataRetentionNotice();
    } catch {
      // Non-fatal: if the write fails, the notice simply reappears on the next
      // visit — acceptable degradation, don't block the user from the app.
    } finally {
      setSaving(false);
      onAcknowledged();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && acknowledge()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>การเก็บรักษาข้อมูล</DialogTitle>
          <DialogDescription>
            ข้อมูลผลการประเมินและแบบสอบถามความพึงพอใจของท่านจะถูกเก็บไว้เป็นเวลา
            30 วันนับจากวันที่บันทึก หลังจากนั้นระบบจะลบข้อมูลดังกล่าวโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={acknowledge} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "กำลังบันทึก…" : "รับทราบ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
