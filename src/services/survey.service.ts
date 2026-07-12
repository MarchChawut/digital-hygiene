import "server-only";

import { prisma } from "@/lib/prisma";
import type { SurveyQuestion, SurveyQuestionInput, SurveyAnswers } from "@/models/survey";

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

export async function listQuestions(): Promise<SurveyQuestion[]> {
  await ensureDefaultQuestions();
  const rows = await prisma.surveyQuestion.findMany({ orderBy: { order: "asc" } });
  return rows.map(toModel);
}

export async function createQuestion(input: SurveyQuestionInput): Promise<SurveyQuestion> {
  const row = await prisma.surveyQuestion.create({ data: input });
  return toModel(row);
}

export async function updateQuestion(
  id: string,
  input: Partial<SurveyQuestionInput>
): Promise<SurveyQuestion> {
  const row = await prisma.surveyQuestion.update({ where: { id }, data: input });
  return toModel(row);
}

export async function deleteQuestion(id: string): Promise<void> {
  await prisma.surveyQuestion.delete({ where: { id } });
  seeded = false;
}

export async function createResponse(email: string, answers: SurveyAnswers): Promise<void> {
  await prisma.surveyResponse.create({ data: { email, answers } });
}

export async function hasResponded(email: string): Promise<boolean> {
  const count = await prisma.surveyResponse.count({ where: { email } });
  return count > 0;
}
