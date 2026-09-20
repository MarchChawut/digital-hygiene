"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "อีเมลนี้เคยเข้าสู่ระบบด้วยผู้ให้บริการอื่นแล้ว กรุณาใช้ผู้ให้บริการเดิม",
  Verification:
    "ลิงก์ยืนยันตัวตนหมดอายุหรือถูกใช้ไปแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลอีกครั้งเพื่อรับลิงก์ใหม่",
  // Not an Auth.js code: GroupSection sends it after a mid-section session expiry, since
  // its own toast wouldn't survive the full-page reload back to the sign-in gate.
  SessionExpired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
};

// Auth.js reports failed sign-ins at "/login?error=…" (and the app sends "SessionExpired"
// there too) — toast it once, then strip ONLY the error param so a refresh doesn't repeat
// it while ?callbackUrl= (where the user was headed) survives. Renders nothing.
export function AuthErrorToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!error) return;
    toast.error(AUTH_ERROR_MESSAGES[error] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete("error");
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [error, pathname, router, searchParams]);

  return null;
}
