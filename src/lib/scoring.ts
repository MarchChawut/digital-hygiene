// Scoring for one activity section — client-safe (pure functions, no server imports).
// Each section is analysed on its own: 100% means every "หมวดย่อย" (category) in
// that section is checked.
import type { ChecklistItem } from "@/models/risk";

export interface CategoryGroup {
  category: string;
  items: ChecklistItem[];
}

// Group a section's items by their "หมวดย่อย" (the accordion sub-item), keeping the
// order the items arrive in.
export function groupByCategory(items: ChecklistItem[]): CategoryGroup[] {
  const categories: CategoryGroup[] = [];
  for (const item of items) {
    const existing = categories.find((c) => c.category === item.category);
    if (existing) existing.items.push(item);
    else categories.push({ category: item.category, items: [item] });
  }
  return categories;
}

export interface SectionScore {
  percent: number;
  doneCount: number;
  // A category left unchecked means every item in it is still a risk: what the result
  // dialog explains and what gets stored on the record (gaps/selectedIds keep their
  // historical "ช่องโหว่" meaning).
  riskIds: string[];
}

export function scoreSection(
  categories: CategoryGroup[],
  checked: Record<string, boolean>
): SectionScore {
  const doneCount = categories.filter((c) => checked[c.category]).length;
  const percent = categories.length ? Math.round((100 * doneCount) / categories.length) : 0;
  const riskIds = categories.filter((c) => !checked[c.category]).flatMap((c) => c.items.map((i) => i.id));
  return { percent, doneCount, riskIds };
}
