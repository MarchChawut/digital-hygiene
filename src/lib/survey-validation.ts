// Server-side validation of survey answers — pure (no imports), so it can be unit-tested with
// `node --experimental-strip-types`. The client is untrusted: before this, any JSON (900 KB
// strings, thousands of keys, ratings of 999) was stored and later shipped to the admin page.

export const MAX_TEXT_ANSWER_LENGTH = 1000;

type QuestionLike = { id: string; type: "rating" | "text" | string };

// Remove characters that cannot be represented in the admin's Excel (XML 1.0) export or that only
// make text unreadable: C0 controls (except tab/newline), DEL, U+FFFE/U+FFFF and lone surrogates.
export function stripUnsafeText(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += input[i] + input[i + 1];
        i++;
      }
      continue; // lone high surrogate → dropped
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue; // lone low surrogate
    if (c === 0xfffe || c === 0xffff) continue;
    if (c === 127 || (c < 32 && c !== 9 && c !== 10)) continue;
    out += input[i];
  }
  return out;
}

export type SurveyValidation =
  | { ok: true; answers: Record<string, number | string> }
  | { ok: false; reason: string };

// Keep only answers to REAL questions, with the right shape:
//  - rating → integer 1–5, required (the form requires them);
//  - text   → optional string, cleaned and cut to MAX_TEXT_ANSWER_LENGTH;
// anything else (unknown keys, wrong types, nesting, arrays) is rejected or dropped, so the
// stored size is bounded by (number of questions × 1000 characters).
export function validateSurveyAnswers(raw: unknown, questions: readonly QuestionLike[]): SurveyValidation {
  if (questions.length === 0) return { ok: false, reason: "no_questions" };
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "not_an_object" };
  const source = raw as Record<string, unknown>;
  const answers: Record<string, number | string> = {};
  for (const q of questions) {
    // own properties only: a "__proto__"/"constructor" key must never be read through the prototype
    const value = Object.prototype.hasOwnProperty.call(source, q.id) ? source[q.id] : undefined;
    if (q.type === "rating") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
        return { ok: false, reason: "invalid_rating" };
      }
      answers[q.id] = value;
    } else if (typeof value === "string") {
      let text = stripUnsafeText(value).trim().slice(0, MAX_TEXT_ANSWER_LENGTH);
      // the cut may have split a surrogate pair — drop the dangling half
      const last = text.charCodeAt(text.length - 1);
      if (last >= 0xd800 && last <= 0xdbff) text = text.slice(0, -1);
      if (text) answers[q.id] = text;
    }
  }
  return { ok: true, answers };
}
