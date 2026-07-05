// Presentational helper — client-safe. Maps each activity group (@/models/activity-group)
// to its icon + Tailwind color classes. Color language is derived from the reference
// posters (public/2-5-7.png): indigo=Cleanup, orange=Security, amber=Footprint, sky=Backup.
import { Eraser, ShieldAlert, Fingerprint, CloudUpload, type LucideIcon } from "lucide-react";
import type { GroupId } from "@/models/activity-group";

export interface GroupTheme {
  icon: LucideIcon;
  // Section container (checklist group card)
  sectionBg: string;
  sectionBorder: string;
  sectionIconBg: string;
  sectionIconText: string;
  sectionTitle: string;
  // Result-card left accent + small inline icon chip
  accentBorder: string;
  chipBg: string;
  chipText: string;
}

export const GROUP_THEME: Record<GroupId, GroupTheme> = {
  cleanup: {
    icon: Eraser,
    sectionBg: "bg-indigo-50/60",
    sectionBorder: "border-indigo-200",
    sectionIconBg: "bg-indigo-100",
    sectionIconText: "text-indigo-600",
    sectionTitle: "text-indigo-900",
    accentBorder: "border-l-indigo-500",
    chipBg: "bg-indigo-100",
    chipText: "text-indigo-700",
  },
  security: {
    icon: ShieldAlert,
    sectionBg: "bg-orange-50/60",
    sectionBorder: "border-orange-200",
    sectionIconBg: "bg-orange-100",
    sectionIconText: "text-orange-600",
    sectionTitle: "text-orange-900",
    accentBorder: "border-l-orange-500",
    chipBg: "bg-orange-100",
    chipText: "text-orange-700",
  },
  footprint: {
    icon: Fingerprint,
    sectionBg: "bg-amber-50/60",
    sectionBorder: "border-amber-200",
    sectionIconBg: "bg-amber-100",
    sectionIconText: "text-amber-600",
    sectionTitle: "text-amber-900",
    accentBorder: "border-l-amber-500",
    chipBg: "bg-amber-100",
    chipText: "text-amber-700",
  },
  backup: {
    icon: CloudUpload,
    sectionBg: "bg-sky-50/60",
    sectionBorder: "border-sky-200",
    sectionIconBg: "bg-sky-100",
    sectionIconText: "text-sky-600",
    sectionTitle: "text-sky-900",
    accentBorder: "border-l-sky-500",
    chipBg: "bg-sky-100",
    chipText: "text-sky-700",
  },
};
