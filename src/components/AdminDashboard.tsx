"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { clearRecords, runRetentionCleanupNow } from "@/app/actions";
import type { AssessmentRecord } from "@/models/assessment";
import type { SurveyQuestion, SurveyResponse } from "@/models/survey";
import type { ChecklistItem } from "@/models/risk";
import type { AuditLogEntry } from "@/models/audit";
import { fmtTime, fmtDate, scorePill } from "@/lib/format";
import { toast } from "sonner";
import { Download, FolderArchive, ArrowLeft } from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SurveyAdmin } from "@/components/SurveyAdmin";
import { ChecklistAdmin } from "@/components/ChecklistAdmin";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function AdminDashboard({
  email,
  initialRecords,
  initialSurveyQuestions,
  initialSurveyResponses,
  initialChecklistItems,
  initialAuditLog,
}: {
  email: string;
  initialRecords: AssessmentRecord[];
  initialSurveyQuestions: SurveyQuestion[];
  initialSurveyResponses: SurveyResponse[];
  initialChecklistItems: ChecklistItem[];
  initialAuditLog: AuditLogEntry[];
}) {
  const [records, setRecords] = useState<AssessmentRecord[]>(initialRecords);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(initialSurveyResponses);
  // Only clearData()/runRetentionCleanup() below (the two admin actions that live in this
  // file) optimistically append to this state so their own audit row shows up without a
  // reload. Checklist/survey CRUD (ChecklistAdmin/SurveyAdmin) also write audit rows but
  // manage their own local state independently of this file — those rows still need a
  // page reload to appear here.
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(initialAuditLog);
  const checklistById = useMemo(
    () => new Map(initialChecklistItems.map((i) => [i.id, i])),
    [initialChecklistItems]
  );

  // The submissions table only renders one page of rows at a time (the 30-day
  // retention sweep bounds long-term growth, but a busy window can still mean
  // hundreds/thousands of rows) — exportExcel() below still reads the full
  // `records` array, so the export always contains everything regardless of
  // what page is currently shown on screen.
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRecords = useMemo(
    () => records.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [records, currentPage]
  );

  const clearData = async () => {
    try {
      const result = await clearRecords();
      setRecords([]);
      setPage(0);
      setAuditLog((prev) => [
        {
          id: `local-${Date.now()}`,
          actorEmail: email,
          action: "records.cleared",
          targetId: null,
          metadata: { deleted: result.deleted },
          ts: Date.now(),
        },
        ...prev,
      ]);
      toast.success("ล้างข้อมูลการประเมินทั้งหมดแล้ว");
    } catch {
      toast.error("ไม่สามารถล้างข้อมูลได้");
    }
  };

  // Manually run the 30-day cleanup sweep — the sweep also runs automatically
  // every 24h (src/instrumentation.ts); this is for operator visibility/testing.
  const runRetentionCleanup = async () => {
    try {
      const result = await runRetentionCleanupNow();
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setRecords((prev) => prev.filter((r) => r.ts >= cutoff));
      setSurveyResponses((prev) => prev.filter((r) => r.ts >= cutoff));
      setPage(0);
      setAuditLog((prev) => [
        {
          id: `local-${Date.now()}`,
          actorEmail: email,
          action: "retention.manual_sweep",
          targetId: null,
          metadata: result,
          ts: Date.now(),
        },
        ...prev,
      ]);
      toast.success(
        `ลบข้อมูลที่เกิน 30 วันแล้ว: ผลการประเมิน ${result.records} รายการ, แบบสอบถาม ${result.surveyResponses} รายการ`
      );
    } catch {
      toast.error("ไม่สามารถรันการลบข้อมูลได้");
    }
  };

  // Builds an Excel XML Spreadsheet 2003 (SpreadsheetML) document — a plain-text
  // XML format Excel opens natively as a real multi-tab workbook, no library
  // needed (same "no dependency" spirit as the old HTML-as-.xls trick this
  // replaces). Two sheets: submissions, then satisfaction-survey responses.
  const exportExcel = () => {
    if (!records.length && !surveyResponses.length) {
      toast.error("ยังไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const esc = (s: unknown) =>
      String(s ?? "")
        // XML 1.0 forbids most C0 control chars outright (no escape makes them legal) —
        // free-text survey answers can carry these from pasted Word/PDF content, and
        // just one would make Excel refuse to open the whole workbook.
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    // Numbers are declared ss:Type="Number" (not string) so Excel keeps them
    // summable/averageable (device-storage GB, survey ratings) instead of importing
    // them as text like the old HTML-table export effectively did via type-sniffing.
    const dataCell = (v: string | number) =>
      typeof v === "number" && Number.isFinite(v)
        ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
        : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const headerCell = (v: string) =>
      `<Cell ss:StyleID="Header"><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const row = (cells: (string | number)[]) => `<Row>${cells.map(dataCell).join("")}</Row>`;
    const worksheet = (name: string, head: string[], bodyRows: string) =>
      `<Worksheet ss:Name="${esc(name)}"><Table><Row>${head.map(headerCell).join("")}</Row>${bodyRows}</Table></Worksheet>`;

    // Sheet 1: submissions (same columns as the previous single-sheet export).
    const recordsHead = [
      "ลำดับ",
      "อีเมลผู้ใช้",
      "กอง / หน่วยงาน",
      "วันที่/เวลา",
      "จำนวนช่องโหว่",
      "ระดับความเสี่ยง",
      "พื้นที่ก่อน (GB)",
      "พื้นที่หลัง (GB)",
      "พื้นที่ที่ลดได้ (GB)",
      "รายการช่องโหว่",
    ];
    const recordsBody = records
      .map((r, i) => {
        const items = (r.selectedIds || []).map((id) => checklistById.get(id)?.title ?? id).join(" · ");
        const freed = storageFreedGb(r);
        return row([
          i + 1,
          r.email,
          r.division || "-",
          fmtTime(r.ts),
          `${r.gaps}/${initialChecklistItems.length}`,
          r.scoreLabel,
          r.storageBeforeGb ?? "-",
          r.storageAfterGb ?? "-",
          freed !== null ? Number(freed.toFixed(1)) : "-",
          items,
        ]);
      })
      .join("");

    // Sheet 2: satisfaction-survey responses — one column per current survey
    // question (ordered), value = the user's answer to that question. Answers
    // keyed to a since-deleted question have no column and are dropped.
    const sortedQuestions = [...initialSurveyQuestions].sort((a, b) => a.order - b.order);
    const surveyHead = ["ลำดับ", "อีเมลผู้ใช้", "วันที่/เวลา", ...sortedQuestions.map((q) => q.text)];
    const surveyBody = surveyResponses
      .map((res, i) =>
        row([i + 1, res.email, fmtTime(res.ts), ...sortedQuestions.map((q) => res.answers[q.id] ?? "-")])
      )
      .join("");

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/>' +
      '<Interior ss:Color="#2563EB" ss:Pattern="Solid"/></Style></Styles>' +
      worksheet("บันทึกการประเมิน", recordsHead, recordsBody) +
      worksheet("แบบสำรวจความพึงพอใจ", surveyHead, surveyBody) +
      "</Workbook>";

    const blob = new Blob(["﻿" + xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const a = document.createElement("a");
    a.href = url;
    a.download = `digital-hygiene-backoffice-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const users = useMemo(() => {
    const map: Record<string, { email: string; division: string; count: number; first: number }> = {};
    [...records].reverse().forEach((r) => {
      if (!map[r.email]) map[r.email] = { email: r.email, division: r.division, count: 0, first: r.ts };
      map[r.email].count += 1;
      if (r.ts < map[r.email].first) map[r.email].first = r.ts;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [records]);

  // Risky bands: new percent-formula labels + the legacy "วิกฤต" from older records.
  const RISKY_LABELS = ["วิกฤต", "เสี่ยงสูง", "ยังไม่ปลอดภัย"];
  const critical = records.filter((r) => RISKY_LABELS.includes(r.scoreLabel)).length;
  const avgGaps = records.length ? (records.reduce((a, r) => a + r.gaps, 0) / records.length).toFixed(1) : "0";

  // Storage freed (GB) — only defined when a submission has both before/after
  // values. Fields store used space, so freed = before − after (positive =
  // improvement; can be negative if used space grew instead of shrinking).
  const storageFreedGb = (r: AssessmentRecord): number | null =>
    r.storageBeforeGb != null && r.storageAfterGb != null ? r.storageBeforeGb - r.storageAfterGb : null;
  const storageRecords = records.filter((r) => storageFreedGb(r) !== null);
  const avgStorageFreed = storageRecords.length
    ? (storageRecords.reduce((a, r) => a + (storageFreedGb(r) ?? 0), 0) / storageRecords.length).toFixed(1)
    : null;

  const sortedSurveyQuestions = useMemo(
    () => [...initialSurveyQuestions].sort((a, b) => a.order - b.order),
    [initialSurveyQuestions]
  );

  // Rating questions: average (1-5) + valid-answer count, per question. Answers
  // are a JSON blob with no DB-level validation, and a question's `type` can be
  // edited in SurveyAdmin after responses already exist, so guard both shape
  // and range rather than trusting the answer matches the question's current type.
  const ratingStats = useMemo(
    () =>
      sortedSurveyQuestions
        .filter((q) => q.type === "rating")
        .map((q) => {
          let sum = 0;
          let count = 0;
          for (const res of surveyResponses) {
            const raw = res.answers[q.id];
            const n = typeof raw === "number" ? raw : Number(raw);
            if (Number.isFinite(n) && n >= 1 && n <= 5) {
              sum += n;
              count += 1;
            }
          }
          return { question: q, avg: count ? sum / count : null, count };
        }),
    [sortedSurveyQuestions, surveyResponses]
  );

  // Text questions: non-empty free-text answers (surveyResponses is already
  // ordered newest-first from listResponses(), so no re-sort needed here).
  const textAnswersByQuestion = useMemo(
    () =>
      sortedSurveyQuestions
        .filter((q) => q.type === "text")
        .map((q) => ({
          question: q,
          answers: surveyResponses
            .filter((res) => typeof res.answers[q.id] === "string" && (res.answers[q.id] as string).trim())
            .map((res) => ({ email: res.email, ts: res.ts, text: res.answers[q.id] as string })),
        })),
    [sortedSurveyQuestions, surveyResponses]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        email={email}
        onSignOut={() => signOut({ callbackUrl: "/" })}
        nav={
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="w-4 h-4" />
            หน้าหลัก
          </Link>
        }
      />

      <main className="max-w-4xl mx-auto px-5 pt-6 pb-24 sm:pt-11 md:pb-10">
        <div className="flex flex-wrap gap-4 items-end justify-between mb-7">
          <div>
            <Badge className="bg-blue-50 text-blue-600 uppercase tracking-widest">ADMIN · BACK OFFICE</Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2.5 mb-1">ระบบหลังบ้าน</h1>
            <p className="text-slate-500 text-sm">ภาพรวมผู้ใช้งานและผลการประเมินความเสี่ยงที่บันทึกไว้ในระบบ</p>
          </div>
          <div className="flex gap-2.5 flex-wrap w-full sm:w-auto">
            <Button onClick={exportExcel} className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="outline" className="flex-1 sm:flex-none" />}
              >
                รันการลบข้อมูลเกิน 30 วันตอนนี้
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ต้องการรันการลบข้อมูลที่เกิน 30 วันตอนนี้หรือไม่?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ระบบจะลบผลการประเมินและคำตอบแบบสอบถามที่บันทึกไว้เกิน 30 วันออกจากฐานข้อมูลอย่างถาวร
                    (ปกติระบบจะรันการลบนี้โดยอัตโนมัติทุกวันอยู่แล้ว)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={runRetentionCleanup} className="bg-blue-600 hover:bg-blue-700 text-white">
                    รันการลบ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="outline" className="text-red-600 border-red-200 hover:text-red-700 flex-1 sm:flex-none" />}
              >
                ล้างข้อมูลทั้งหมด
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ต้องการล้างข้อมูลการประเมินทั้งหมดหรือไม่?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การกระทำนี้จะลบผลการประเมินทั้งหมดออกจากฐานข้อมูลอย่างถาวร และย้อนกลับไม่ได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={clearData} className="bg-red-600 hover:bg-red-700 text-white">
                    ล้างข้อมูล
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "ผู้ใช้งาน", value: String(users.length), cls: "text-blue-600" },
            { label: "การประเมิน", value: String(records.length), cls: "text-slate-900" },
            { label: "เสี่ยงสูง", value: String(critical), cls: critical ? "text-red-600" : "text-slate-900" },
            { label: "ช่องโหว่เฉลี่ย", value: avgGaps, cls: "text-slate-900" },
            { label: "พื้นที่เฉลี่ยที่ลดได้ (GB)", value: avgStorageFreed ?? "-", cls: "text-slate-900" },
          ].map((s) => (
            <Card key={s.label} className="rounded-2xl py-0">
              <CardContent className="p-4 sm:p-5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">{s.label}</div>
                <div className={`text-2xl sm:text-3xl font-extrabold ${s.cls}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submissions */}
        <Card className="rounded-3xl shadow-xl overflow-hidden py-0">
          <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-slate-800">บันทึกการประเมิน (Submissions)</h2>
            <span className="text-sm text-slate-400">{records.length} รายการ</span>
          </div>

          {records.length ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>อีเมลผู้ใช้</TableHead>
                    <TableHead>กอง / หน่วยงาน</TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ช่องโหว่</TableHead>
                    <TableHead>ระดับความเสี่ยง</TableHead>
                    <TableHead>พื้นที่ที่ลดได้ (GB)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.map((r) => {
                    const freed = storageFreedGb(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold text-slate-900">{r.email}</TableCell>
                        <TableCell className="text-slate-600 text-[13px]">{r.division || "-"}</TableCell>
                        <TableCell className="text-slate-500 text-[13px]">{fmtTime(r.ts)}</TableCell>
                        <TableCell className="text-slate-700 font-semibold">
                          {r.gaps}
                          <span className="text-slate-400">/{initialChecklistItems.length}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={scorePill(r.scoreLabel)}>
                            {r.scoreLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-[13px]">
                          {freed !== null ? freed.toFixed(1) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
          {records.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                หน้า {currentPage + 1} จาก {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          ) : null}
          {!records.length && (
            <div className="text-center py-14 px-5">
              <FolderArchive className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-700 font-semibold">ยังไม่มีข้อมูลการประเมิน</p>
              <p className="text-slate-400 text-[13px] mt-1.5">
                เมื่อผู้ใช้เข้าประเมินและกด &quot;เริ่มการวิเคราะห์&quot; ผลลัพธ์จะปรากฏที่นี่
              </p>
            </div>
          )}
        </Card>

        {/* Satisfaction survey results */}
        <Card className="rounded-3xl shadow-xl overflow-hidden mt-6 py-0">
          <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-slate-800">ผลแบบสำรวจความพึงพอใจ (Satisfaction Survey Results)</h2>
            <span className="text-sm text-slate-400">{surveyResponses.length} รายการ</span>
          </div>

          {surveyResponses.length ? (
            <div className="p-6 space-y-6">
              {ratingStats.map(({ question, avg, count }) => (
                <div key={question.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-sm font-semibold text-slate-800">{question.text}</span>
                    <span className="text-sm font-bold text-slate-700 shrink-0">
                      {avg !== null ? `${avg.toFixed(1)} / 5` : "-"}
                      <span className="text-slate-400 font-normal ml-1.5 text-xs">({count} คำตอบ)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${avg !== null ? Math.min(100, Math.max(0, (avg / 5) * 100)) : 0}%` }}
                    />
                  </div>
                </div>
              ))}

              {textAnswersByQuestion.map(({ question, answers }) => (
                <div key={question.id}>
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    {question.text}
                    <span className="text-slate-400 font-normal ml-1.5 text-xs">({answers.length} คำตอบ)</span>
                  </div>
                  {answers.length ? (
                    <div className="space-y-2">
                      {answers.map((a, i) => (
                        <div key={i} className="rounded-xl bg-slate-50 px-4 py-3">
                          <div className="text-[13px] text-slate-500 mb-1">
                            {a.email} · {fmtTime(a.ts)}
                          </div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{a.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">ยังไม่มีคำตอบ</p>
                  )}
                </div>
              ))}

              {!ratingStats.length && !textAnswersByQuestion.length && (
                <p className="text-sm text-slate-400 text-center py-4">ไม่มีคำถามในแบบสำรวจ</p>
              )}
            </div>
          ) : (
            <div className="text-center py-14 px-5">
              <FolderArchive className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-700 font-semibold">ยังไม่มีคำตอบแบบสำรวจ</p>
              <p className="text-slate-400 text-[13px] mt-1.5">
                เมื่อผู้ใช้ตอบแบบสำรวจความพึงพอใจ ผลลัพธ์จะปรากฏที่นี่
              </p>
            </div>
          )}
        </Card>

        {/* Users */}
        <Card className="rounded-3xl shadow-xl overflow-hidden mt-6 py-0">
          <div className="px-7 py-6 border-b border-slate-100">
            <h2 className="text-[17px] font-bold text-slate-800">ผู้ใช้งานในระบบ (Users)</h2>
          </div>
          {users.length ? (
            <div className="p-4">
              {users.map((u) => (
                <div key={u.email} className="flex items-center justify-between gap-3 px-3 py-3.5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[15px] shrink-0">
                      {(u.email[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{u.email}</div>
                      <div className="text-xs text-slate-400">
                        {u.division || "-"} · เข้าใช้ครั้งแรก {fmtDate(u.first)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold text-slate-700">{u.count} ครั้ง</div>
                    <div className="text-[11px] text-slate-400">ประเมิน</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีผู้ใช้งาน</div>
          )}
        </Card>

        <ChecklistAdmin initialItems={initialChecklistItems} />
        <SurveyAdmin initialQuestions={initialSurveyQuestions} />
        <AuditLogPanel initialEntries={auditLog} />
      </main>

      <BottomNav current="admin" />
    </div>
  );
}
