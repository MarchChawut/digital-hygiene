// Domain model — client-safe. Organisation divisions, used by both the UI Select
// and server-side validation.
export const DIVISIONS = [
  "กองบังคับการ",
  "กองระบบเครือข่ายสารสนเทศ และความปลอดภัย",
  "กองสนับสนุนสารสนเทศ และการสื่อสาร",
  "กองศึกษา วิจัย และพัฒนา",
  "กองบริการปฏิบัติการสารสนเทศ",
] as const;

export type Division = (typeof DIVISIONS)[number];
