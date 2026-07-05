// Domain model — client-safe. The 4 visual/activity groups the checklist is
// organized into (each ChecklistItem belongs to exactly one, via groupId).
export const ACTIVITY_GROUPS = [
  { id: "cleanup", label: "Digital Cleanup" },
  { id: "security", label: "Digital Auto Disconnect" },
  { id: "footprint", label: "Digital Footprint Cleanup" },
  { id: "backup", label: "Digital Backup" },
] as const;

export type GroupId = (typeof ACTIVITY_GROUPS)[number]["id"];
