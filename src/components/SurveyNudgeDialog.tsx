"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Shown once, when the user finishes the last of the 4 sections: invites them to the
// /survey tab. Dismissing it is final — the server only signals the nudge on that
// completing submit, so it won't nag again.
export function SurveyNudgeDialog({
  open,
  onOpenChange,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>ทำครบทั้ง 4 กิจกรรมแล้ว 🎉</DialogTitle>
          <DialogDescription>
            ขอบคุณที่ร่วมกิจกรรมครบทุกหมวด ช่วยตอบแบบประเมินความพึงพอใจสั้นๆ (ไม่ถึง 1 นาที)
            เพื่อให้เราพัฒนากิจกรรมให้ดียิ่งขึ้นได้ไหมครับ
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ไว้ทีหลัง
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onAccept();
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            ไปทำแบบประเมิน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
