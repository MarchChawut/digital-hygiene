"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { HardDrive } from "lucide-react";

import { saveStorageBefore, signOutAction } from "@/app/actions";
import { MAX_GB, parseGbInput } from "@/lib/storage-gb";
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

// Asked once, right after the division is chosen (or on the next visit of someone who already
// had one): how much storage the device uses BEFORE the activities. "ไว้ทีหลัง" only hides it
// until the page is reloaded — the layout that mounts this survives tab switches, so it doesn't
// pop up again on every tab — and the answer is written once on the server.
export function StorageBeforeDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const gb = parseGbInput(value);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (gb === null || saving) return;
    setSaving(true);
    try {
      const result = await saveStorageBefore(gb);
      if (result.ok) {
        setOpen(false);
        router.refresh(); // the session now carries the value, so the layout stops mounting this
      } else if (result.reason === "unauthenticated") {
        await signOutAction();
        window.location.assign(loginPath(pathname, "SessionExpired"));
      } else if (result.reason === "already_set" || result.reason === "too_late") {
        // Answered already (another tab / a slow retry) or too late — nothing was overwritten.
        toast.info(
          result.reason === "already_set"
            ? "คุณบันทึกค่านี้ไว้แล้ว จึงใช้ค่าเดิม"
            : "บันทึกค่าหลังทำกิจกรรมไปแล้ว จึงไม่รับค่าก่อนเริ่มกิจกรรม"
        );
        setOpen(false);
        router.refresh();
      } else if (result.reason === "no_division") {
        router.refresh(); // the layout will show the division gate
      } else {
        toast.error(`ค่าไม่ถูกต้อง กรุณากรอกตัวเลข 0 – ${MAX_GB.toLocaleString("en-US")} GB`);
      }
    } catch {
      toast.error("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <HardDrive className="w-5 h-5" />
            </div>
            <DialogTitle>ก่อนเริ่มกิจกรรม ใช้พื้นที่จัดเก็บไปเท่าไร</DialogTitle>
            <DialogDescription className="leading-relaxed">
              ดูได้ที่ ตั้งค่า &gt; ที่เก็บข้อมูล (Storage) ของอุปกรณ์ — กรอกพื้นที่ที่ <b>ใช้ไปแล้ว</b> ไม่ใช่พื้นที่ว่าง
              เพื่อเทียบกับหลังทำกิจกรรมเสร็จ
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="พื้นที่จัดเก็บที่ใช้ไป ก่อนเริ่มกิจกรรม (GB)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-32"
              autoComplete="off"
            />
            GB
          </label>
          {value.trim() !== "" && gb === null ? (
            <p className="text-xs text-red-500">กรอกตัวเลข 0 – {MAX_GB.toLocaleString("en-US")} GB (เช่น 128.5)</p>
          ) : (
            <p className="text-xs text-slate-400">ตรวจตัวเลขให้ถูกต้องก่อนกดบันทึก — บันทึกแล้วแก้ไขเองไม่ได้</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ไว้ทีหลัง
            </Button>
            <Button type="submit" disabled={gb === null || saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
