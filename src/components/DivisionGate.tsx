"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

import { setDivision } from "@/app/actions";
import { DIVISIONS } from "@/models/division";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// One-time gate after first sign-in: the user picks their division/unit.
export function DivisionGate({ name, email }: { name: string | null; email: string }) {
  const router = useRouter();
  const [divisionChoice, setDivisionChoice] = useState("");
  const [savingDivision, setSavingDivision] = useState(false);

  const confirmDivision = async () => {
    if (!divisionChoice) return;
    setSavingDivision(true);
    try {
      const result = await setDivision(divisionChoice);
      if (!result.ok && result.reason === "already_set") {
        // Another tab already chose one — just move on with what's saved.
        router.refresh();
        return;
      }
      if (!result.ok) {
        toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        // A refresh alone isn't enough here — a structurally-broken session (a valid
        // Session row but missing user data) would just re-render this same gate
        // forever. Force a real sign-out so the next render is genuinely signed-out
        // and recoverable.
        await signOut({ callbackUrl: "/" });
        return;
      }
      router.refresh(); // re-reads session → division now set → the section page
    } catch {
      toast.error("ไม่สามารถบันทึกกอง/หน่วยงานได้ กรุณาลองใหม่");
    } finally {
      setSavingDivision(false);
    }
  };

  return (
    <main className="max-w-md mx-auto w-full px-5 pt-10 pb-10 sm:pt-16">
      <Card className="rounded-3xl shadow-xl">
        <CardHeader>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-900/20">
            <Building2 className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-extrabold">เลือกกอง / หน่วยงาน</CardTitle>
          <CardDescription className="leading-relaxed">
            สวัสดี {name || email} — กรุณาเลือกกอง/หน่วยงานของคุณก่อนเข้าใช้งาน (เลือกครั้งเดียว)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={divisionChoice} onValueChange={setDivisionChoice}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— เลือกกอง —" />
            </SelectTrigger>
            <SelectContent>
              {DIVISIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={confirmDivision}
            disabled={!divisionChoice || savingDivision}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {savingDivision ? "กำลังบันทึก…" : "ยืนยันและเข้าสู่ระบบ →"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
