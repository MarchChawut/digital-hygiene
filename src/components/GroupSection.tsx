"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, PartyPopper, ClipboardList, CheckCircle2, BookOpen } from "lucide-react";

import { createRecord, signOutAction } from "@/app/actions";
import { ACTIVITY_GROUPS, type GroupId } from "@/models/activity-group";
import type { ChecklistItem } from "@/models/risk";
import { GROUP_THEME } from "@/lib/theme";
import { scoreFor, severityBadge } from "@/lib/format";
import { groupByCategory, scoreSection } from "@/lib/scoring";
import { loginPath } from "@/lib/safe-redirect";
import {
  getStorageDraftSnapshot,
  parseStorageDraft,
  setStorageDraft,
  subscribeStorageDraft,
} from "@/lib/storage-draft";

import { SurveyNudgeDialog } from "@/components/SurveyNudgeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// One activity section (a tab): its checklist, its own analysis and its own result.
// Sections are independent — each submit saves one AssessmentRecord for this group.
export function GroupSection({
  groupId,
  items,
  userEmail,
}: {
  groupId: GroupId;
  items: ChecklistItem[]; // this group's items only
  userEmail: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const group = ACTIVITY_GROUPS.find((g) => g.id === groupId)!;
  const theme = GROUP_THEME[groupId];
  const GroupIcon = theme.icon;

  // Checking happens at the category ("หมวดย่อย") level. Each item still has an optional
  // "เปิดคู่มือ" step-by-step guide. The header checkbox is a derived master checkbox:
  // indeterminate when only some categories are checked; clicking it bulk-toggles them.
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Optional self-reported device storage USED (GB, not free/available) before/after the
  // Digital Cleanup checklist — kept as raw input strings so a partial/empty field doesn't
  // force a NaN; parsed to numbers only when submitting. A successful cleanup should reduce
  // used space, so "freed" is before − after (positive = good). The user does the "before,
  // clean the device, after" steps across tabs, so the draft lives in an external store
  // (see lib/storage-draft.ts) and survives navigation. The server snapshot is empty, so
  // hydration matches and the stored value appears right after.
  const hasStorage = groupId === "cleanup";
  const draftRaw = useSyncExternalStore(
    subscribeStorageDraft,
    () => getStorageDraftSnapshot(userEmail),
    () => ""
  );
  const { before: storageBeforeGb, after: storageAfterGb } = useMemo(
    () => parseStorageDraft(draftRaw),
    [draftRaw]
  );
  const updateStorage = (before: string, after: string) =>
    setStorageDraft(userEmail, { before, after });
  const storageFreedGb = useMemo(() => {
    const before = Number(storageBeforeGb);
    const after = Number(storageAfterGb);
    if (storageBeforeGb === "" || storageAfterGb === "" || !Number.isFinite(before) || !Number.isFinite(after)) {
      return null;
    }
    return before - after;
  }, [storageBeforeGb, storageAfterGb]);

  const [guideItem, setGuideItem] = useState<ChecklistItem | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Set by the submit that completes the last section (server-decided); the survey
  // nudge opens when the result dialog is dismissed, so the two dialogs never stack.
  const [pendingNudge, setPendingNudge] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const categories = useMemo(() => groupByCategory(items), [items]);
  const { percent, doneCount, riskIds } = useMemo(
    () => scoreSection(categories, checked),
    [categories, checked]
  );
  const score = useMemo(() => scoreFor(percent), [percent]);
  const empty = categories.length === 0;
  const done = !empty && doneCount === categories.length;
  const indeterminate = doneCount > 0 && doneCount < categories.length;

  const toggleCategory = (category: string) => {
    setChecked((prev) => ({ ...prev, [category]: !prev[category] }));
    setShowResult(false);
  };

  // Bulk toggle for the header master checkbox.
  const toggleAll = (value: boolean) => {
    setChecked(Object.fromEntries(categories.map((c) => [c.category, value])));
    setShowResult(false);
  };

  // Dismissing the result dialog (by any method — button, X icon, backdrop, Escape)
  // chains into the survey nudge, once, if this submit completed the last section.
  const closeResult = () => {
    setShowResult(false);
    if (pendingNudge) {
      setPendingNudge(false);
      setShowNudge(true);
    }
  };

  const runAnalysis = async () => {
    if (isAnalyzing || empty) return;
    setIsAnalyzing(true);
    try {
      // The record stores the risks (unchecked items), not the completed ones —
      // same meaning gaps/selectedIds have always had in the DB.
      const result = await createRecord({
        groupId,
        gaps: riskIds.length,
        scoreLabel: score.label,
        selectedIds: riskIds,
        storageBeforeGb: hasStorage && storageBeforeGb !== "" ? Number(storageBeforeGb) : undefined,
        storageAfterGb: hasStorage && storageAfterGb !== "" ? Number(storageAfterGb) : undefined,
      });
      if (!result.ok) {
        // A refresh alone isn't enough — a structurally-broken session won't clear on
        // its own, so force a real sign-out and come back to this same section. The
        // "session expired" message travels as ?error= (shown by AuthErrorToast on /login)
        // because a toast raised here would be wiped by this full-page reload; callbackUrl
        // brings the user back to this section after they sign in again.
        await signOutAction();
        window.location.assign(loginPath(pathname, "SessionExpired"));
        return;
      }
      setPendingNudge(result.surveyNudge);
      setShowResult(true);
    } catch {
      toast.error("ไม่สามารถบันทึกผลการประเมินได้ กรุณาลองใหม่");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Card className="rounded-3xl shadow-xl overflow-hidden py-0 scroll-mt-32">
        <CardContent className="p-5 sm:p-9">
          <div className="mb-7 flex items-start gap-3">
            <ClipboardList className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1.5">
                รายการตรวจสอบ: {group.label}
              </h2>
              <p className="text-sm text-slate-500">
                เลือกกิจกรรมที่คุณ <span className="text-emerald-600 font-bold">&quot;ทำเสร็จแล้ว&quot;</span> ระบบจะคำนวณ % ความปลอดภัยของอุปกรณ์ และแจ้งความเสี่ยงที่ยังเหลืออยู่จากข้อที่ยังไม่ได้ทำ
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border ${theme.sectionBorder} ${theme.sectionBg} p-4 sm:p-5 mb-9`}>
            <label className="flex items-center gap-2.5 mb-3.5 cursor-pointer select-none">
              <Checkbox
                checked={done}
                indeterminate={indeterminate}
                onCheckedChange={() => !empty && toggleAll(!done)}
                disabled={empty}
              />
              <div className={`w-8 h-8 rounded-lg ${theme.sectionIconBg} ${theme.sectionIconText} flex items-center justify-center shrink-0`}>
                <GroupIcon className="w-4.5 h-4.5" />
              </div>
              <h3 className={`text-sm font-bold ${theme.sectionTitle} flex items-center gap-1.5`}>
                {group.label}
                <span className="text-[11px] font-semibold text-slate-400">
                  (ทำแล้ว {doneCount}/{categories.length} หมวดย่อย)
                </span>
                {done && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </h3>
            </label>

            {hasStorage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  ก่อนเริ่มกิจกรรม (พื้นที่ที่ใช้ไป) :
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={storageBeforeGb}
                    onChange={(e) => updateStorage(e.target.value, storageAfterGb)}
                    className="w-24"
                  />
                  GB
                </label>
                <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  หลังกิจกรรม (พื้นที่ที่ใช้ไป) :
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={storageAfterGb}
                    onChange={(e) => updateStorage(storageBeforeGb, e.target.value)}
                    className="w-24"
                  />
                  GB
                </label>
                {/* Always rendered (min-h reserves the line): the draft is restored right
                    after hydration, and a line appearing then would shift the accordion down. */}
                <p
                  className={`sm:col-span-2 min-h-4 text-xs font-bold ${
                    storageFreedGb !== null && storageFreedGb < 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {storageFreedGb === null
                    ? null
                    : storageFreedGb >= 0
                      ? `พื้นที่ว่างเพิ่มขึ้น ${storageFreedGb.toFixed(1)} GB`
                      : `พื้นที่ว่างลดลง ${Math.abs(storageFreedGb).toFixed(1)} GB`}
                </p>
              </div>
            )}

            {categories.length ? (
              <Accordion multiple defaultValue={[]}>
                {categories.map(({ category, items: categoryItems }) => {
                  const categoryChecked = !!checked[category];
                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger
                        leading={
                          <Checkbox
                            checked={categoryChecked}
                            onCheckedChange={() => toggleCategory(category)}
                            aria-label={`ทำเสร็จแล้ว: ${category}`}
                          />
                        }
                      >
                        <span className="flex items-center gap-1.5">
                          {category}
                          {categoryChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categoryItems.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-2 text-left p-3.5 rounded-xl border-2 border-transparent bg-white"
                            >
                              <span className="text-sm font-medium text-slate-600">{task.title}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0 text-blue-600 hover:text-blue-700"
                                onClick={() => setGuideItem(task)}
                                aria-label="เปิดคู่มือ"
                              >
                                <BookOpen className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
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

          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing || empty}
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
                    ผลการประเมิน: {group.label}
                  </DialogTitle>
                  <div className={`text-3xl font-extrabold ${score.text}`}>{score.label}</div>
                </div>
                <div className="text-sm text-slate-600 md:text-right">
                  <div>
                    คะแนนความปลอดภัย <span className="font-bold text-slate-900">{percent}%</span>
                  </div>
                  <div>
                    ความเสี่ยงที่ยังเหลือ{" "}
                    <span className="font-bold text-slate-900">{categories.length - doneCount}</span> จาก{" "}
                    {categories.length} หมวดย่อย
                  </div>
                  {hasStorage && storageFreedGb !== null && (
                    <div>
                      {storageFreedGb >= 0 ? "พื้นที่จัดเก็บที่ลดได้" : "พื้นที่ที่ใช้เพิ่มขึ้น"}{" "}
                      <span className="font-bold text-slate-900">{Math.abs(storageFreedGb).toFixed(1)}</span> GB
                    </div>
                  )}
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

      <SurveyNudgeDialog
        open={showNudge}
        onOpenChange={setShowNudge}
        onAccept={() => router.push("/survey")}
      />

      <Dialog open={!!guideItem} onOpenChange={(open) => !open && setGuideItem(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{guideItem?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {guideItem?.guide?.trim() || "ยังไม่มีคู่มือสำหรับข้อนี้"}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
