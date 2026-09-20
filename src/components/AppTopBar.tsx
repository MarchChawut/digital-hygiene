"use client";

import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { LayoutDashboard } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { buttonVariants } from "@/components/ui/button";

// TopBar's onSignOut is a function, which can't cross the server→client boundary
// from the (app) layout — this thin client wrapper supplies it.
export function AppTopBar({ email, admin }: { email?: string; admin?: boolean }) {
  return (
    <TopBar
      email={email}
      onSignOut={
        email
          ? async () => {
              await signOutAction();
              window.location.assign("/");
            }
          : undefined
      }
      nav={
        admin ? (
          <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <LayoutDashboard className="w-4 h-4" />
            ระบบหลังบ้าน
          </Link>
        ) : null
      }
    />
  );
}
