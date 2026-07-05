"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { clearRecords } from "@/app/actions";
import type { AssessmentRecord } from "@/models/assessment";
import type { SurveyQuestion } from "@/models/survey";
import type { ChecklistItem } from "@/models/risk";
import { fmtTime, fmtDate, scorePill } from "@/lib/format";
import { toast } from "sonner";
import { Download, FolderArchive, ArrowLeft } from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SurveyAdmin } from "@/components/SurveyAdmin";
import { ChecklistAdmin } from "@/components/ChecklistAdmin";
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
  initialChecklistItems,
}: {
  email: string;
  initialRecords: AssessmentRecord[];
  initialSurveyQuestions: SurveyQuestion[];
  initialChecklistItems: ChecklistItem[];
}) {
  const [records, setRecords] = useState<AssessmentRecord[]>(initialRecords);
  const checklistById = useMemo(
    () => new Map(initialChecklistItems.map((i) => [i.id, i])),
    [initialChecklistItems]
  );

  const clearData = async () => {
    try {
      await clearRecords();
      setRecords([]);
      toast.success("ล้างข้อมูลการประเมินทั้งหมดแล้ว");
    } catch {
      toast.error("ไม่สามารถล้างข้อมูลได้");
    }
  };

  const exportExcel = () => {
    if (!records.length) {
      toast.error("ยังไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const esc = (s: unknown) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const head = ["ลำดับ", "อีเมลผู้ใช้", "กอง / หน่วยงาน", "วันที่/เวลา", "จำนวนช่องโหว่", "ระดับความเสี่ยง", "รายการช่องโหว่"];
    const body = records
      .map((r, i) => {
        const items = (r.selectedIds || []).map((id) => checklistById.get(id)?.title ?? id).join(" · ");
        const cells = [
          i + 1,
          r.email,
          r.division || "-",
          fmtTime(r.ts),
          `${r.gaps}/${initialChecklistItems.length}`,
          r.scoreLabel,
          items,
        ];
        return "<tr>" + cells.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
      })
      .join("");
    const table =
      '<table border="1"><thead><tr>' +
      head.map((h) => `<th style="background:#2563eb;color:#fff">${esc(h)}</th>`).join("") +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table>";
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>' +
      table +
      "</body></html>";
    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
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
              <Table className="min-w-[780px]">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>อีเมลผู้ใช้</TableHead>
                    <TableHead>กอง / หน่วยงาน</TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ช่องโหว่</TableHead>
                    <TableHead>ระดับความเสี่ยง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-14 px-5">
              <FolderArchive className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-700 font-semibold">ยังไม่มีข้อมูลการประเมิน</p>
              <p className="text-slate-400 text-[13px] mt-1.5">
                เมื่อผู้ใช้เข้าประเมินและกด &quot;เริ่มการวิเคราะห์&quot; ผลลัพธ์จะปรากฏที่นี่
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
      </main>

      <BottomNav current="admin" />
    </div>
  );
}
