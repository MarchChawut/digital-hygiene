// Domain model — client-safe. The 4 visual/activity groups the checklist is
// organized into (each ChecklistItem belongs to exactly one, via groupId).
export const ACTIVITY_GROUPS = [
  { id: "cleanup", label: "Digital Cleanup" },
  { id: "security", label: "Digital Auto Disconnect" },
  { id: "footprint", label: "Digital Footprint Cleanup" },
  { id: "backup", label: "Digital Backup" },
] as const;

export type GroupId = (typeof ACTIVITY_GROUPS)[number]["id"];

export const GROUP_IDS: readonly GroupId[] = ACTIVITY_GROUPS.map((g) => g.id);

// Also the URL segment of each section's page (/cleanup, /security, ...).
export function isGroupId(value: unknown): value is GroupId {
  return typeof value === "string" && (GROUP_IDS as readonly string[]).includes(value);
}

// Display label for a record's group. null = a legacy record saved before the
// sections were split (it covered every group at once).
export function groupLabel(id: GroupId | null): string {
  if (id === null) return "รวม (เดิม)";
  return ACTIVITY_GROUPS.find((g) => g.id === id)?.label ?? id;
}
