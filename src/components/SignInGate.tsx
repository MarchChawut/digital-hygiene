"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

// Sign-in card: Google or Guest (email magic link). Both providers return the user to
// `callbackUrl` — the page they were headed for (e.g. a section's QR-code link), already
// sanitised by safeCallbackPath() on the /login page. Auth.js's own default redirect
// callback also rejects anything that isn't same-origin.
export function SignInGate({ callbackUrl }: { callbackUrl: string }) {
  const [guestEmail, setGuestEmail] = useState("");
  const [guestStatus, setGuestStatus] = useState<"idle" | "sending" | "sent">("idle");

  const submitGuestEmail = async () => {
    if (!guestEmail.trim() || guestStatus === "sending") return;
    setGuestStatus("sending");
    try {
      const result = await signIn("resend", {
        email: guestEmail.trim(),
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        toast.error("ไม่สามารถส่งอีเมลยืนยันตัวตนได้ กรุณาตรวจสอบอีเมลและลองใหม่");
        setGuestStatus("idle");
        return;
      }
      setGuestStatus("sent");
    } catch {
      toast.error("ไม่สามารถส่งอีเมลยืนยันตัวตนได้ กรุณาลองใหม่");
      setGuestStatus("idle");
    }
  };

  return (
    <main className="max-w-md mx-auto w-full px-5 pt-10 pb-10 sm:pt-16">
      <Card className="rounded-3xl shadow-xl">
        <CardHeader>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-900/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-extrabold">เข้าสู่ระบบ</CardTitle>
          <CardDescription className="leading-relaxed">
            เข้าสู่ระบบเพื่อเริ่มการประเมินสุขอนามัยดิจิทัลและบันทึกผลลัพธ์
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() => signIn("google", { callbackUrl })}
            variant="outline"
            size="lg"
            className="w-full gap-3"
          >
            <GoogleIcon />
            เข้าสู่ระบบด้วย Google
          </Button>

          <div className="relative py-1 text-center">
            <span className="relative bg-white px-3 text-xs text-slate-400">หรือ</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-slate-200" />
          </div>

          {guestStatus === "sent" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold mb-1">ส่งลิงก์ยืนยันแล้ว</p>
              <p className="leading-relaxed">
                กรุณาตรวจสอบกล่องอีเมลของ <span className="font-medium">{guestEmail}</span>{" "}
                (รวมถึงโฟลเดอร์สแปม) และคลิกลิงก์เพื่อเข้าสู่ระบบ
              </p>
              <button
                type="button"
                onClick={() => setGuestStatus("idle")}
                className="mt-2 text-xs underline hover:text-emerald-900"
              >
                ใช้อีเมลอื่น
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder="อีเมลของคุณ"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={guestStatus === "sending"}
              />
              <Button
                onClick={submitGuestEmail}
                disabled={!guestEmail.trim() || guestStatus === "sending"}
                variant="outline"
                size="lg"
                className="w-full gap-3"
              >
                <Mail className="w-4.5 h-4.5" />
                {guestStatus === "sending" ? "กำลังส่งลิงก์ยืนยัน…" : "เข้าสู่ระบบด้วยอีเมล (Guest)"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/privacy" className="underline hover:text-slate-600">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </main>
  );
}
