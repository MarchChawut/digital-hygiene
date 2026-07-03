"use client";

import React from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TopBar({
  email,
  onSignOut,
  nav,
}: {
  email?: string;
  onSignOut?: () => void;
  nav?: React.ReactNode;
}) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline font-extrabold text-lg tracking-tight text-blue-600">DIGITAL HYGIENE</span>
        </div>
        {email ? (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="hidden lg:inline text-sm text-slate-500 truncate max-w-45">{email}</span>
            <div className="hidden md:flex items-center gap-2">{nav}</div>
            {onSignOut && (
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onSignOut}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            )}
          </div>
        ) : (
          <Badge className="bg-blue-100 text-blue-700 uppercase tracking-widest">Safety First</Badge>
        )}
      </div>
    </nav>
  );
}
