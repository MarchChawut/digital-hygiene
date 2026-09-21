import { GROUP_IDS, type GroupId } from "@/models/activity-group";

// Sections the user has to finish: every group that has at least one checklist item (an admin may
// empty a group out, and then it can't be required). Pure, so pages, actions and tests agree.
export function requiredGroupIds(items: readonly { groupId: GroupId }[]): GroupId[] {
  return GROUP_IDS.filter((g) => items.some((i) => i.groupId === g));
}

export function allSectionsDone(
  items: readonly { groupId: GroupId }[],
  completed: readonly GroupId[]
): boolean {
  const required = requiredGroupIds(items);
  return required.length > 0 && required.every((g) => completed.includes(g));
}
