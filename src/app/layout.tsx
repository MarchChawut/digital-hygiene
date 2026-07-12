import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Self-hosted via next/font (built at build time, served from our own origin) —
// no runtime request to fonts.googleapis.com/fonts.gstatic.com, and Next
// generates a size-adjusted fallback so there's minimal layout shift before
// the real font loads.
const plexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digital Hygiene — Security Checklist",
  description: "วิเคราะห์ช่องโหว่และความเสี่ยงทางไซเบอร์ส่วนบุคคล",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plexSansThai.variable} ${plexSans.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
