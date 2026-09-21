import "server-only";

import { prisma } from "@/lib/prisma";
import { createCachedLoader } from "@/lib/cached-loader";
import type { SurveyQuestion, SurveyQuestionInput, SurveyAnswers, SurveyResponse } from "@/models/survey";

// Default questions inserted once, the first time the table is empty.
const DEFAULT_QUESTIONS: SurveyQuestionInput[] = [
  { order: 1, text: "ความพึงพอใจโดยรวมต่อกิจกรรมนี้", type: "rating" },
  { order: 2, text: "เนื้อหากิจกรรมมีประโยชน์ต่อการทำงาน/ชีวิตประจำวัน", type: "rating" },
  { order: 3, text: "ระยะเวลาที่ใช้ในการทำกิจกรรมมีความเหมาะสม", type: "rating" },
  { order: 4, text: "ท่านจะแนะนำกิจกรรมนี้ให้ผู้อื่นหรือไม่", type: "rating" },
  { order: 5, text: "ข้อเสนอแนะเพิ่มเติม", type: "text" },
];

function toModel(row: { id: string; order: number; text: string; type: string }): SurveyQuestion {
  return { id: row.id, order: row.order, text: row.text, type: row.type as SurveyQuestion["type"] };
}

// Once we've confirmed the table is non-empty, skip the count() check on every
// subsequent listQuestions() call for the life of this server process —
// deleteQuestion() resets this so a full-catalogue deletion still re-seeds.
let seeded = false;

async function ensureDefaultQuestions(): Promise<void> {
  if (seeded) return;
  const count = await prisma.surveyQuestion.count();
  if (count === 0) {
    await prisma.surveyQuestion.createMany({ data: DEFAULT_QUESTIONS });
  }
  seeded = true;
}

// Cached (see lib/cached-loader.ts): read on every /survey view and on the completing
// createRecord, changed only by admin edits. The returned array is frozen and shared.
const questionsLoader = createCachedLoader(async () => {
  await ensureDefaultQuestions();
  const rows = await prisma.surveyQuestion.findMany({ orderBy: { order: "asc" } });
  return Object.freeze(rows.map(toModel)) as readonly SurveyQuestion[];
});

export async function listQuestions(): Promise<readonly SurveyQuestion[]> {
  return questionsLoader.get();
}

export async function createQuestion(input: SurveyQuestionInput): Promise<SurveyQuestion> {
  const row = await prisma.surveyQuestion.create({ data: input });
  questionsLoader.invalidate();
  return toModel(row);
}

export async function updateQuestion(
  id: string,
  input: Partial<SurveyQuestionInput>
): Promise<SurveyQuestion> {
  const row = await prisma.surveyQuestion.update({ where: { id }, data: input });
  questionsLoader.invalidate();
  return toModel(row);
}

export async function deleteQuestion(id: string): Promise<void> {
  await prisma.surveyQuestion.delete({ where: { id } });
  seeded = false;
  questionsLoader.invalidate();
}

// One response per address — enforced by a unique index, so two concurrent submissions from the
// same account can't both succeed. Returns false if this address had already responded.
export async function createResponse(email: string, answers: SurveyAnswers): Promise<boolean> {
  try {
    await prisma.surveyResponse.create({ data: { email, answers } });
    return true;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return false; // unique violation
    throw err;
  }
}

export async function hasResponded(email: string): Promise<boolean> {
  const count = await prisma.surveyResponse.count({ where: { email } });
  return count > 0;
}

// Bounded for the same reason as record.service's ADMIN_MAX_RECORDS.
export const ADMIN_MAX_RESPONSES = 2000;

// Latest submitted survey responses, newest first — used by the admin dashboard and export.
export async function listResponses(limit: number = ADMIN_MAX_RESPONSES): Promise<SurveyResponse[]> {
  const rows = await prisma.surveyResponse.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    ts: r.createdAt.getTime(),
    answers: (r.answers ?? {}) as SurveyAnswers,
  }));
}
