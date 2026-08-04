"use client";

import React, { useMemo, useState } from "react";
import type { AuditLogEntry } from "@/models/audit";
import { fmtTime } from "@/lib/format";
import { ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Read-only view of the AuditLog table for incident-response reconstruction —
// admin mutations (checklist/survey CRUD, records cleared, manual retention
// sweeps) and auth events (sign-ins, rejected domain-gate attempts logged only
// to the process log, not here — see src/auth.config.ts). Mirrors the
// Submissions table's card/pagination pattern in AdminDashboard.tsx.
export function AuditLogPanel({ initialEntries }: { initialEntries: AuditLogEntry[] }) {
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(initialEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedEntries = useMemo(
    () => initialEntries.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [initialEntries, currentPage]
  );

  return (
    <Card className="rounded-3xl shadow-xl overflow-hidden mt-6 py-0">
      <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4.5 h-4.5 text-slate-400" />
          <h2 className="text-[17px] font-bold text-slate-800">
            บันทึกการตรวจสอบ (Audit Log)
          </h2>
        </div>
        <span className="text-sm text-slate-400">{initialEntries.length} รายการ</span>
      </div>

      {initialEntries.length ? (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>เวลา</TableHead>
                  <TableHead>ผู้ทำรายการ</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-slate-500 text-[13px]">{fmtTime(entry.ts)}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{entry.actorEmail}</TableCell>
                    <TableCell className="text-slate-700 text-[13px]">
                      {entry.action}
                      {entry.targetId && (
                        <div className="text-[11px] text-slate-400 font-normal">{entry.targetId}</div>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-slate-500 text-[12px] font-mono max-w-[280px] truncate"
                      title={entry.metadata ? JSON.stringify(entry.metadata) : undefined}
                    >
                      {entry.metadata ? JSON.stringify(entry.metadata) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {initialEntries.length > PAGE_SIZE ? (
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
        </>
      ) : (
        <div className="text-center py-14 px-5">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-700 font-semibold">ยังไม่มีบันทึกการตรวจสอบ</p>
          <p className="text-slate-400 text-[13px] mt-1.5">
            การกระทำของแอดมินและเหตุการณ์เข้าสู่ระบบจะถูกบันทึกไว้ที่นี่
          </p>
        </div>
      )}
    </Card>
  );
}
