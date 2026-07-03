"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { createRecord, setDivision } from "@/app/actions";
import { DIVISIONS } from "@/models/division";
import type { SessionUser } from "@/models/session";
import { RISK_DATABASE, TASK_LIST } from "@/models/risk";
import { scoreFor, severityBadge } from "@/lib/format";
import { toast } from "sonner";
import {
  ShieldCheck,
  Sparkles,
  PartyPopper,
  ClipboardList,
  FolderArchive,
  Building2,
  LayoutDashboard,
} from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export default function DigitalHygieneApp({ user }: { user: SessionUser | null }) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // division gate
  const [divisionChoice, setDivisionChoice] = useState("");
  const [savingDivision, setSavingDivision] = useState(false);

  const email = user?.email ?? "";
  const division = user?.division ?? "";
  const admin = user?.isAdmin ?? false;

  const confirmDivision = async () => {
    if (!divisionChoice) return;
    setSavingDivision(true);
    try {
      await setDivision(divisionChoice);
      router.refresh(); // re-reads session → division now set → main app
    } catch {
      toast.error("ไม่สามารถบันทึกกอง/หน่วยงานได้ กรุณาลองใหม่");
      setSavingDivision(false);
    }
  };

  const toggleTask = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    setShowResult(false);
  };

  const runAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const ids = [...selectedIds];
    try {
      await createRecord({
        gaps: ids.length,
        scoreLabel: scoreFor(ids.length).label,
        selectedIds: ids,
      });
      setShowResult(true);
    } catch {
      toast.error("ไม่สามารถบันทึกผลการประเมินได้ กรุณาลองใหม่");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const score = useMemo(() => scoreFor(selectedIds.length), [selectedIds]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  // 1) Not signed in → Google sign-in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <TopBar />
        <main className="max-w-md mx-auto w-full px-5 pt-10 pb-10 sm:pt-16">
          <Card className="rounded-3xl shadow-xl">
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <CardTitle className="text-2xl font-extrabold">เข้าสู่ระบบ</CardTitle>
              <CardDescription className="leading-relaxed">
                เข้าสู่ระบบด้วยบัญชี Google ของคุณ เพื่อเริ่มการประเมินสุขอนามัยดิจิทัลและบันทึกผลลัพธ์
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                variant="outline"
                size="lg"
                className="w-full gap-3"
              >
                <GoogleIcon />
                เข้าสู่ระบบด้วย Google
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 2) Signed in but no division → division gate
  if (!division) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <TopBar email={email} onSignOut={() => signOut({ callbackUrl: "/" })} />
        <main className="max-w-md mx-auto w-full px-5 pt-10 pb-10 sm:pt-16">
          <Card className="rounded-3xl shadow-xl">
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                <Building2 className="w-7 h-7" />
              </div>
              <CardTitle className="text-2xl font-extrabold">เลือกกอง / หน่วยงาน</CardTitle>
              <CardDescription className="leading-relaxed">
                สวัสดี {user.name || email} — กรุณาเลือกกอง/หน่วยงานของคุณก่อนเข้าใช้งาน (เลือกครั้งเดียว)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={divisionChoice} onValueChange={(v) => setDivisionChoice(v ?? "")}>
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
      </div>
    );
  }

  // 3) Main app — assessment
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        email={email}
        onSignOut={() => signOut({ callbackUrl: "/" })}
        nav={
          admin ? (
            <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <LayoutDashboard className="w-4 h-4" />
              ระบบหลังบ้าน
            </Link>
          ) : null
        }
      />

      <main className="max-w-4xl mx-auto px-5 py-8 pb-24 sm:py-14 md:pb-14">
        <section className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
            ล้างเครื่องให้ใส <span className="text-blue-600">ใส่ใจภูมิคุ้มกันดิจิทัล</span>
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            วิเคราะห์ช่องโหว่และความเสี่ยงทางไซเบอร์ส่วนบุคคล ผ่านคู่มือรณรงค์กิจกรรมสุขอนามัยดิจิทัลยุคใหม่
          </p>
          <p className="text-slate-400 text-sm mt-3">กอง/หน่วยงาน: {division}</p>
        </section>

        <Card className="rounded-3xl shadow-xl overflow-hidden py-0">
          <CardContent className="p-5 sm:p-9">
            <div className="mb-7 flex items-start gap-3">
              <ClipboardList className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1.5">รายการตรวจสอบ (Risk Checklist)</h2>
                <p className="text-sm text-slate-500">
                  เลือกกิจกรรมที่คุณ <span className="text-red-500 font-bold">&quot;ยังไม่ได้ทำ&quot;</span> เพื่อให้ระบบประเมินผลกระทบที่อาจเกิดขึ้น
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-9">
              {TASK_LIST.map((task) => {
                const sel = selectedIds.includes(task.id);
                return (
                  <label
                    key={task.id}
                    className={`flex items-center gap-3.5 text-left p-4 rounded-2xl border-2 cursor-pointer transition ${
                      sel ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <Checkbox checked={sel} onCheckedChange={() => toggleTask(task.id)} />
                    <span className={`text-sm font-medium ${sel ? "text-blue-900" : "text-slate-600"}`}>
                      {task.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <Button onClick={runAnalysis} disabled={isAnalyzing} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? "กำลังประมวลผลความเสี่ยง…" : "เริ่มการวิเคราะห์ทันที"}
            </Button>
          </CardContent>

          {showResult && (
            <div className={`border-t border-slate-100 p-5 sm:p-9 ${score.bg}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-7 pb-6 border-b border-slate-200/60">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1.5">ผลการประเมินโดยรวม</h3>
                  <div className={`text-3xl font-extrabold ${score.text}`}>{score.label}</div>
                </div>
                <div className="mt-4 md:mt-0 text-sm text-slate-600 md:text-right">
                  พบช่องโหว่สะสม <span className="font-bold text-slate-900">{selectedIds.length}</span> จาก 6 มาตรการหลัก
                </div>
              </div>

              {selectedIds.length === 0 ? (
                <div className="text-center py-9">
                  <PartyPopper className="w-12 h-12 mx-auto mb-3.5 text-emerald-500" />
                  <p className="text-slate-700 font-bold text-lg">ยอดเยี่ยม! คุณมีสุขอนามัยดิจิทัลที่ดีเยี่ยม</p>
                  <p className="text-slate-500 text-sm mt-1.5">ไม่มีความเสี่ยงที่น่ากังวลในขณะนี้ ขอให้รักษามาตรฐานนี้ไว้ครับ</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4.5">
                  {selectedIds.map((id) => {
                    const data = RISK_DATABASE[id];
                    return (
                      <Card key={id} className="rounded-2xl border-slate-200/60 animate-hgFade py-0">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-3.5">
                            <Badge variant="secondary" className="uppercase tracking-tight text-slate-500">
                              {data.category}
                            </Badge>
                            <Badge variant="outline" className={severityBadge(data.severity)}>
                              ความเสี่ยง{data.severity}
                            </Badge>
                          </div>
                          <h4 className="font-bold text-slate-900 mb-4 text-lg leading-snug">{data.title}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[13px]">
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                              <p className="text-red-600 font-bold mb-1.5">ผลกระทบที่อาจเกิด</p>
                              <p className="text-slate-600 leading-relaxed">{data.impact}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                              <p className="text-blue-700 font-bold mb-1.5">แนวทางแก้ไข (Action)</p>
                              <p className="text-blue-900 leading-relaxed">{data.action}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>

        <footer className="py-12 mt-6 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-sm">© Digital Hygiene &amp; Safety First Initiative</p>
          <p className="text-slate-300 text-[11px] mt-1.5">Digital wellness self-assessment for cyber awareness</p>
        </footer>
      </main>

      {admin && <BottomNav current="app" />}
    </div>
  );
}
