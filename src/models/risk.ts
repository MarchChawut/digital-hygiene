// Domain model — client-safe. Admin-managed checklist items shown on the
// assessment page, grouped by one of the 4 fixed ACTIVITY_GROUPS.

import type { GroupId } from "@/models/activity-group";

export interface ChecklistItem {
  id: string;
  order: number;
  groupId: GroupId;
  category: string;
  title: string; // checkbox label AND result-card headline
  severity: string; // "ปานกลาง" | "สูง" | "วิกฤต" — matches severityBadge in src/lib/format.ts
  impact: string;
  action: string;
  guide: string; // admin-authored step-by-step text shown via "เปิดคู่มือ"; "" until filled in
}

export type ChecklistItemInput = Omit<ChecklistItem, "id">;
