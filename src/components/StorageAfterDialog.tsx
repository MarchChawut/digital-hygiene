"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { HardDrive, TrendingDown, TrendingUp } from "lucide-react";

import { saveStorageAfter, signOutAction } from "@/app/actions";
import { MAX_GB, freedGb, parseGbInput } from "@/lib/storage-gb";
import { loginPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Asked on /survey once every section is done: how much storage is used AFTER the activities,
// then a summary (before → after → difference) before the survey itself. The server only accepts
// the answer after all sections were submitted, and writes it once. "ไว้ทีหลัง" hides it until
// /survey is opened again.
export function StorageAfterDialog({ before }: { before: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Set after saving: what the server stored, shown as the summary.
  const [summary, setSummary] = useState<{ before: number | null; after: number; saved: boolean } | null>(null);
  const gb = parseGbInput(value);

  const close = (next: boolean) => {
    setOpen(next);
    // Only now does the page learn the answer exists (a refresh mid-summary would unmount it).
    if (!next && summary) router.refresh();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (gb === null || saving) return;
    setSaving(true);
    try {
      const result = await saveStorageAfter(gb);
      if (result.ok) {
        setSummary({ before: result.before, after: result.after, saved: result.saved });
      } else if (result.reason === "unauthenticated") {
        await signOutAction();
        window.location.assign(loginPath(pathname, "SessionExpired"));
      } else if (result.reason === "not_finished") {
        toast.error("ยังทำกิจกรรมไม่ครบทุกหมวด");
        setOpen(false);
      } else if (result.reason === "no_division" || result.reason === "gone") {
        toast.error("ไม่พบข้อมูลบัญชี กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(`ค่าไม่ถูกต้อง กรุณากรอกตัวเลข 0 – ${MAX_GB.toLocaleString("en-US")} GB`);
      }
    } catch {
      toast.error("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const diff = summary && summary.before !== null ? freedGb(summary.before, summary.after) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={summary ? (e) => e.preventDefault() : undefined}>
        {summary ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>สรุปพื้นที่จัดเก็บ</DialogTitle>
              <DialogDescription>ผลก่อนและหลังทำกิจกรรม Digital Hygiene ของคุณ</DialogDescription>
            </DialogHeader>
            <dl className="rounded-2xl border border-slate-200 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-slate-500">ก่อนเริ่มกิจกรรม</dt>
                <dd className="font-bold text-slate-800">
                  {summary.before !== null ? `${summary.before} GB` : "ไม่ได้กรอก"}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-slate-500">หลังทำกิจกรรมเสร็จสิ้น (ที่เหลือ)</dt>
                <dd className="font-bold text-slate-800">{summary.after} GB</dd>
              </div>
            </dl>
            {!summary.saved && (
              <p className="text-xs text-slate-500">คุณเคยบันทึกค่าหลังทำกิจกรรมไว้แล้ว จึงแสดงค่าที่บันทึกไว้เดิม</p>
            )}
            {diff === null ? (
              <p className="text-sm text-slate-500">ไม่มีค่า &quot;ก่อนเริ่มกิจกรรม&quot; จึงยังเปรียบเทียบไม่ได้</p>
            ) : diff > 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <TrendingDown className="w-4 h-4" /> ใช้พื้นที่ลดลง {diff.toFixed(1)} GB
              </p>
            ) : diff < 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                <TrendingUp className="w-4 h-4" /> ใช้พื้นที่เพิ่มขึ้น {Math.abs(diff).toFixed(1)} GB
              </p>
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                พื้นที่ที่ใช้เท่าเดิม
              </p>
            )}
            <DialogFooter>
              <Button onClick={() => close(false)} className="bg-blue-600 hover:bg-blue-700">
                ไปทำแบบประเมินต่อ
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <HardDrive className="w-5 h-5" />
              </div>
              <DialogTitle>หลังทำกิจกรรมเสร็จสิ้น มีพื้นที่จัดเก็บเท่าไร</DialogTitle>
              <DialogDescription className="leading-relaxed">
                ทำครบทุกหมวดแล้ว! ดูที่ ตั้งค่า &gt; ที่เก็บข้อมูล (Storage) อีกครั้ง แล้วกรอกพื้นที่ที่ <b>ใช้ไปแล้ว</b> ตอนนี้
                {before !== null && <> (ก่อนเริ่มคุณกรอกไว้ {before} GB)</>}
              </DialogDescription>
            </DialogHeader>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                aria-label="พื้นที่จัดเก็บที่ใช้ไป หลังทำกิจกรรมเสร็จสิ้น (GB)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-32"
                autoComplete="off"
              />
              GB
            </label>
            {value.trim() !== "" && gb === null ? (
              <p className="text-xs text-red-500">กรอกตัวเลข 0 – {MAX_GB.toLocaleString("en-US")} GB (เช่น 100)</p>
            ) : (
              <p className="text-xs text-slate-400">ตรวจตัวเลขให้ถูกต้องก่อนกดบันทึก — บันทึกแล้วแก้ไขเองไม่ได้</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                ไว้ทีหลัง
              </Button>
              <Button type="submit" disabled={gb === null || saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? "กำลังบันทึก…" : "บันทึกและดูผล"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
