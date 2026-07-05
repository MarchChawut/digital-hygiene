"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { createRecord, setDivision, getSurveyQuestions, hasSubmittedSurvey } from "@/app/actions";
import { DIVISIONS } from "@/models/division";
import type { SessionUser } from "@/models/session";
import type { SurveyQuestion } from "@/models/survey";
import type { ChecklistItem } from "@/models/risk";
import { ACTIVITY_GROUPS } from "@/models/activity-group";
import { GROUP_THEME } from "@/lib/theme";
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
  Lock,
  Wifi,
  CloudUpload,
  CheckCircle2,
} from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SatisfactionSurveyDialog } from "@/components/SatisfactionSurveyDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

export default function DigitalHygieneApp({
  user,
  checklistItems,
}: {
  user: SessionUser | null;
  checklistItems: ChecklistItem[];
}) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // division gate
  const [divisionChoice, setDivisionChoice] = useState("");
  const [savingDivision, setSavingDivision] = useState(false);

  // satisfaction survey — chained after the analysis modal, skipped once already answered
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [alreadyResponded, setAlreadyResponded] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);

  const email = user?.email ?? "";
  const division = user?.division ?? "";
  const admin = user?.isAdmin ?? false;

  useEffect(() => {
    if (!division) return;
    getSurveyQuestions()
      .then(setSurveyQuestions)
      .catch(() => setSurveyQuestions([]));
    hasSubmittedSurvey()
      .then(setAlreadyResponded)
      .catch(() => setAlreadyResponded(true));
  }, [division]);

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

  // Dismissing the result dialog (by any method — button, X icon, backdrop, Escape) chains
  // straight into the satisfaction survey, once, unless the user already answered it.
  const closeResult = () => {
    setShowResult(false);
    if (!alreadyResponded && surveyQuestions.length > 0) setShowSurvey(true);
  };

  const itemById = useMemo(
    () => new Map(checklistItems.map((i) => [i.id, i])),
    [checklistItems]
  );

  // Groups that currently have items — an admin-emptied group is excluded from scoring.
  const groupsWithItems = useMemo(
    () => ACTIVITY_GROUPS.filter((g) => checklistItems.some((i) => i.groupId === g.id)),
    [checklistItems]
  );

  // Safety score: 100 points split evenly across groups with items; each item earns an
  // equal share of its group's points when checked (= done). Higher = safer.
  const percent = useMemo(() => {
    if (!groupsWithItems.length) return 0;
    const groupWorth = 100 / groupsWithItems.length;
    let total = 0;
    for (const group of groupsWithItems) {
      const items = checklistItems.filter((i) => i.groupId === group.id);
      const done = items.filter((i) => selectedIds.includes(i.id)).length;
      total += groupWorth * (done / items.length);
    }
    return Math.round(total);
  }, [selectedIds, checklistItems, groupsWithItems]);

  // Unchecked items = risks still open: what the result dialog explains and what gets
  // stored on the record (gaps/selectedIds keep their historical "ช่องโหว่" meaning).
  const riskIds = useMemo(
    () => checklistItems.filter((i) => !selectedIds.includes(i.id)).map((i) => i.id),
    [checklistItems, selectedIds]
  );

  const score = useMemo(() => scoreFor(percent), [percent]);

  // A group earns its checkmark once every item in it is done.
  const groupComplete = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const group of groupsWithItems) {
      result[group.id] = checklistItems
        .filter((i) => i.groupId === group.id)
        .every((t) => selectedIds.includes(t.id));
    }
    return result;
  }, [selectedIds, checklistItems, groupsWithItems]);

  const runAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      // The record stores the risks (unchecked items), not the completed ones —
      // same meaning gaps/selectedIds have always had in the DB.
      await createRecord({
        gaps: riskIds.length,
        scoreLabel: score.label,
        selectedIds: riskIds,
      });
      setShowResult(true);
    } catch {
      toast.error("ไม่สามารถบันทึกผลการประเมินได้ กรุณาลองใหม่");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-900/20">
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-900/20">
                <Building2 className="w-7 h-7" />
              </div>
              <CardTitle className="text-2xl font-extrabold">เลือกกอง / หน่วยงาน</CardTitle>
              <CardDescription className="leading-relaxed">
                สวัสดี {user.name || email} — กรุณาเลือกกอง/หน่วยงานของคุณก่อนเข้าใช้งาน (เลือกครั้งเดียว)
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
        <section className="mb-8 sm:mb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 px-6 py-10 sm:px-10 sm:py-14 text-center shadow-xl">
            <div
              className="absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 text-white opacity-10 pointer-events-none"
              aria-hidden
            >
              <ShieldCheck className="w-16 h-16 sm:w-24 sm:h-24" />
              <Lock className="w-16 h-16 sm:w-24 sm:h-24" />
              <Wifi className="w-16 h-16 sm:w-24 sm:h-24" />
              <CloudUpload className="w-16 h-16 sm:w-24 sm:h-24" />
            </div>
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                ล้างเครื่องให้ใส <br/><span className="text-sky-300">ใส่ใจภูมิคุ้มกันดิจิทัล</span>
              </h1>
              <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
                วิเคราะห์ช่องโหว่และความเสี่ยงทางไซเบอร์ <br/> ผ่านกิจกรรมสุขอนามัยดิจิทัลยุคใหม่
              </p>
              {/* <p className="text-blue-200 text-sm mt-3">กอง/หน่วยงาน: {division}</p> */}
              <p className="text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent mt-3">กอง/หน่วยงาน: {division}</p>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl shadow-xl overflow-hidden py-0">
          <CardContent className="p-5 sm:p-9">
            <div className="mb-7 flex items-start gap-3">
              <ClipboardList className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1.5">รายการตรวจสอบ (Risk Checklist)</h2>
                <p className="text-sm text-slate-500">
                  ติ๊กกิจกรรมที่คุณ <span className="text-emerald-600 font-bold">&quot;ทำเสร็จแล้ว&quot;</span> ระบบจะคำนวณ % ความปลอดภัยของอุปกรณ์ และแจ้งความเสี่ยงที่ยังเหลืออยู่จากข้อที่ยังไม่ได้ทำ
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 mb-9">
              {ACTIVITY_GROUPS.map((group) => {
                const theme = GROUP_THEME[group.id];
                const GroupIcon = theme.icon;
                const tasks = checklistItems.filter((t) => t.groupId === group.id);
                const itemWeight =
                  groupsWithItems.length && tasks.length
                    ? 100 / groupsWithItems.length / tasks.length
                    : 0;
                const categories: { category: string; items: typeof tasks }[] = [];
                for (const task of tasks) {
                  const existing = categories.find((c) => c.category === task.category);
                  if (existing) existing.items.push(task);
                  else categories.push({ category: task.category, items: [task] });
                }
                return (
                  <div
                    key={group.id}
                    className={`rounded-2xl border ${theme.sectionBorder} ${theme.sectionBg} p-4 sm:p-5`}
                  >
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <div className={`w-8 h-8 rounded-lg ${theme.sectionIconBg} ${theme.sectionIconText} flex items-center justify-center shrink-0`}>
                        <GroupIcon className="w-4.5 h-4.5" />
                      </div>
                      <h3 className={`text-sm font-bold ${theme.sectionTitle} flex items-center gap-1.5`}>
                        {group.label}
                        {groupComplete[group.id] && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </h3>
                    </div>
                    {categories.length ? (
                      <Accordion multiple defaultValue={[]}>
                        {categories.map(({ category, items }) => {
                          const categoryChecked = items.every((i) => selectedIds.includes(i.id));
                          return (
                            <AccordionItem key={category} value={category}>
                              <AccordionTrigger>
                                <span className="flex items-center gap-1.5">
                                  {category}
                                  {categoryChecked && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  )}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {items.map((task) => {
                                    const sel = selectedIds.includes(task.id);
                                    return (
                                      <label
                                        key={task.id}
                                        className={`flex items-center gap-3 text-left p-3.5 rounded-xl border-2 bg-white cursor-pointer transition ${
                                          sel ? "border-blue-500" : "border-transparent hover:border-slate-200"
                                        }`}
                                      >
                                        <Checkbox checked={sel} onCheckedChange={() => toggleTask(task.id)} />
                                        <span className={`text-sm font-medium ${sel ? "text-blue-900" : "text-slate-600"}`}>
                                          {task.title}{" "}
                                          <span className="text-[11px] font-semibold text-slate-400">
                                            ({itemWeight.toFixed(1)} คะแนน)
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-slate-400 italic">ยังไม่มีรายการตรวจสอบในหมวดนี้</p>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? "กำลังประมวลผลความเสี่ยง…" : "เริ่มการวิเคราะห์ทันที"}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showResult} onOpenChange={(open) => (open ? setShowResult(true) : closeResult())}>
          {/* Prevent auto-focusing the first tabbable element (the footer ปิด button),
              which would auto-scroll this scrollable dialog to the bottom on open. */}
          <DialogContent
            className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className={`p-5 sm:p-9 ${score.bg} rounded-t-xl`}>
              <DialogHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                  <div>
                    <DialogTitle className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1.5">
                      ผลการประเมินโดยรวม
                    </DialogTitle>
                    <div className={`text-3xl font-extrabold ${score.text}`}>{score.label}</div>
                  </div>
                  <div className="text-sm text-slate-600 md:text-right">
                    <div>
                      คะแนนความปลอดภัย <span className="font-bold text-slate-900">{percent}%</span>
                    </div>
                    <div>
                      ความเสี่ยงที่ยังเหลือ <span className="font-bold text-slate-900">{riskIds.length}</span> จาก {checklistItems.length} มาตรการหลัก
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {riskIds.length === 0 ? (
                <div className="text-center py-9">
                  <PartyPopper className="w-12 h-12 mx-auto mb-3.5 text-emerald-500" />
                  <p className="text-slate-700 font-bold text-lg">ยอดเยี่ยม! คุณมีสุขอนามัยดิจิทัลที่ดีเยี่ยม</p>
                  <p className="text-slate-500 text-sm mt-1.5">ทำครบทุกข้อแล้ว ไม่มีความเสี่ยงที่เหลืออยู่ ขอให้รักษามาตรฐานนี้ไว้ครับ</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4.5 mt-5">
                  {riskIds.map((id) => {
                    const data = itemById.get(id);
                    if (!data) return null;
                    const theme = GROUP_THEME[data.groupId];
                    const GroupIcon = theme.icon;
                    return (
                      <Card
                        key={id}
                        className={`rounded-2xl border-slate-200/60 border-l-4 ${theme.accentBorder} animate-hgFade py-0`}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-md ${theme.chipBg} ${theme.chipText} flex items-center justify-center shrink-0`}>
                                <GroupIcon className="w-3.5 h-3.5" />
                              </span>
                              <Badge variant="secondary" className="uppercase tracking-tight text-slate-500">
                                {data.category}
                              </Badge>
                            </div>
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
            <DialogFooter className="p-5 sm:p-9 pt-0 sm:pt-0 -mt-4 rounded-t-none border-t-0 bg-transparent">
              <Button variant="outline" onClick={closeResult}>
                ปิด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SatisfactionSurveyDialog
          open={showSurvey}
          onOpenChange={setShowSurvey}
          questions={surveyQuestions}
          onSubmitted={() => setAlreadyResponded(true)}
        />

        <footer className="py-12 mt-6 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-sm">© Digital Hygiene &amp; Safety First Initiative</p>
          <p className="text-slate-300 text-[11px] mt-1.5">Digital wellness self-assessment for cyber awareness</p>
        </footer>
      </main>

      {admin && <BottomNav current="app" />}
    </div>
  );
}
