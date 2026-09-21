"use client";

import React from "react";
import Image from "next/image";
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
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Plain <img> output (unoptimized): a 23 KB static PNG, so no image-optimizer/sharp is needed on
              the server. width/height reserve the space (no layout shift); priority = it is above the fold. */}
          <Image
            src="/DTC-Logo.png"
            alt="DTC — Digital Technology Center"
            width={781}
            height={268}
            unoptimized
            priority
            className="w-auto h-9 sm:h-12 shrink-0"
          />
          <span aria-hidden className="w-px h-8 bg-slate-200 shrink-0" />
          <div className="items-center justify-center hidden text-white bg-blue-600 rounded-lg sm:flex w-9 h-9 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-blue-600 truncate sm:text-lg">DIGITAL HYGIENE</span>
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
          /* Phones: the wordmark matters more than the tag line, and both don't fit beside the logo. */
          <Badge className="hidden tracking-widest text-blue-700 uppercase bg-blue-100 sm:inline-flex">Safety First</Badge>
        )}
      </div>
    </nav>
  );
}
