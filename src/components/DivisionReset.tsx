"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

import { adminResetDivision } from "@/app/actions";
import { isSafeAsciiEmail } from "@/lib/signin-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// Support tool for a wrong division pick (the choice is otherwise final): the user sees the
// division gate again on their next visit. Results they already saved keep the old division.
export function DivisionReset() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const target = value.trim().toLowerCase();
  const valid = isSafeAsciiEmail(target);

  const run = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const r = await adminResetDivision(target);
      if (r.reset) {
        toast.success(`รีเซ็ตกองของ ${target} แล้ว — ผู้ใช้จะได้เลือกกองใหม่ในการเข้าใช้ครั้งถัดไป (ผลที่บันทึกไปแล้วยังเป็นกองเดิม)`);
        setValue("");
      } else {
        toast.error("ไม่พบบัญชีของอีเมลนี้");
      }
    } catch {
      toast.error("ไม่สามารถรีเซ็ตกองได้");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-2xl py-0 mb-4">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            รีเซ็ตกอง/หน่วยงานของผู้ใช้ (กรณีเลือกผิด)
          </div>
          <Input
            type="email"
            placeholder="อีเมลของผู้ใช้"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="อีเมลของผู้ใช้ที่ต้องการรีเซ็ตกอง"
          />
        </div>
        <Button variant="outline" onClick={run} disabled={!valid || busy}>
          รีเซ็ตกอง
        </Button>
      </CardContent>
    </Card>
  );
}
