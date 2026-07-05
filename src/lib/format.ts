// Presentational helpers — client-safe (pure functions returning labels / Tailwind classes).

// Bands for the 0-100% safety score (higher = safer): each activity group splits
// 100 points evenly, each item earns an equal share of its group's points when done.
export function scoreFor(percent: number) {
  if (percent >= 100) return { label: "ปลอดภัยสูงสุด", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (percent >= 71) return { label: "ปลอดภัยดี", text: "text-green-600", bg: "bg-green-50" };
  if (percent >= 41) return { label: "ปลอดภัยปานกลาง", text: "text-amber-600", bg: "bg-amber-50" };
  if (percent > 0) return { label: "เสี่ยงสูง", text: "text-orange-600", bg: "bg-orange-50" };
  return { label: "ยังไม่ปลอดภัย", text: "text-red-600", bg: "bg-red-50" };
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

// Covers both the current percent-band labels and the legacy labels still stored
// on records created before the percentage formula (ปลอดภัย/ความเสี่ยงต่ำ/…/วิกฤต).
export const scorePill = (label: string) => {
  switch (label) {
    case "ปลอดภัยสูงสุด":
    case "ปลอดภัย":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "ปลอดภัยดี":
      return "text-green-600 bg-green-50 border-green-200";
    case "ปลอดภัยปานกลาง":
    case "ความเสี่ยงต่ำ":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "เสี่ยงสูง":
    case "ความเสี่ยงสูง":
      return "text-orange-600 bg-orange-50 border-orange-200";
    default:
      return "text-red-600 bg-red-50 border-red-200";
  }
};
