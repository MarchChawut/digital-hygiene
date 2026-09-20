"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserX } from "lucide-react";

import { adminDeleteUserData } from "@/app/actions";
import { isSafeAsciiEmail } from "@/lib/signin-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Erasure on request (see /deletion-instructions): removes everything held for one address —
// the account and its sessions, assessment records, survey response, pending sign-in links —
// and de-identifies that address in the audit trail. Admin only (enforced again server-side).
export function UserDataDeletion({ onDeleted }: { onDeleted: (email: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const target = value.trim().toLowerCase();
  const valid = isSafeAsciiEmail(target);

  const run = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const r = await adminDeleteUserData(target);
      onDeleted(target);
      setValue("");
      toast.success(
        `ลบข้อมูลของ ${target} แล้ว: บัญชี ${r.userDeleted ? 1 : 0}, ผลการประเมิน ${r.records}, แบบสอบถาม ${r.surveyResponses}, ` +
          `บันทึกที่ปกปิดชื่อ ${r.auditRows}`
      );
    } catch {
      toast.error("ไม่สามารถลบข้อมูลได้");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-2xl py-0 mb-8">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5" />
            ลบข้อมูลรายบุคคล (ตามคำขอ)
          </div>
          <Input
            type="email"
            placeholder="อีเมลของผู้ขอลบข้อมูล"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="อีเมลของผู้ขอลบข้อมูล"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline" className="text-red-600 border-red-200 hover:text-red-700" disabled={!valid || busy} />}
          >
            ลบข้อมูลของอีเมลนี้
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบข้อมูลทั้งหมดของ {target || "อีเมลนี้"} หรือไม่?</AlertDialogTitle>
              <AlertDialogDescription>
                จะลบบัญชี ผลการประเมิน และแบบสอบถามของอีเมลนี้ออกจากฐานข้อมูลอย่างถาวร และย้อนกลับไม่ได้
                (ประวัติการเข้าสู่ระบบที่เก็บเพื่อความปลอดภัยจะถูกปกปิดชื่อแทนการลบ) ควรยืนยันตัวตนผู้ขอก่อนดำเนินการ
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={run} className="bg-red-600 hover:bg-red-700 text-white">
                ลบข้อมูล
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
