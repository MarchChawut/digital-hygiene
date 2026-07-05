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
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 max-w-4xl gap-2 px-4 mx-auto sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center text-white bg-blue-600 rounded-lg w-9 h-9 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="inline text-lg font-extrabold tracking-tight text-blue-600">DIGITAL HYGIENE</span>
        </div>
        {email ? (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="hidden text-sm truncate lg:inline text-slate-500 max-w-45">{email}</span>
            <div className="items-center hidden gap-2 md:flex">{nav}</div>
            {onSignOut && (
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onSignOut}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            )}
          </div>
        ) : (
          <Badge className="tracking-widest text-blue-700 uppercase bg-blue-100">Safety First</Badge>
        )}
      </div>
    </nav>
  );
}
