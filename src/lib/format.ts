// Presentational helpers — client-safe (pure functions returning labels / Tailwind classes).

export function scoreFor(count: number) {
  if (count === 0) return { label: "ปลอดภัย", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (count <= 2) return { label: "ความเสี่ยงต่ำ", text: "text-amber-600", bg: "bg-amber-50" };
  if (count <= 4) return { label: "ความเสี่ยงสูง", text: "text-orange-600", bg: "bg-orange-50" };
  return { label: "วิกฤต", text: "text-red-600", bg: "bg-red-50" };
}

export function fmtTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export const severityBadge = (severity: string) =>
  severity === "วิกฤต"
    ? "border-red-200 text-red-600 bg-red-50"
    : severity === "สูง"
    ? "border-orange-200 text-orange-600 bg-orange-50"
    : "border-amber-200 text-amber-600 bg-amber-50";

export const scorePill = (label: string) => {
  switch (label) {
    case "ปลอดภัย":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "ความเสี่ยงต่ำ":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "ความเสี่ยงสูง":
      return "text-orange-600 bg-orange-50 border-orange-200";
    default:
      return "text-red-600 bg-red-50 border-red-200";
  }
};
