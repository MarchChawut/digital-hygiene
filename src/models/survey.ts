// Domain model — client-safe. The satisfaction survey (admin-editable questions,
// user-submitted answers).

export type SurveyQuestionType = "rating" | "text";

export interface SurveyQuestion {
  id: string;
  order: number;
  text: string;
  type: SurveyQuestionType;
}

// questionId -> answer: a number 1-5 for "rating" questions, a string for "text" questions.
export type SurveyAnswers = Record<string, number | string>;

export interface SurveyQuestionInput {
  text: string;
  type: SurveyQuestionType;
  order: number;
}
