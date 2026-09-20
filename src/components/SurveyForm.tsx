"use client";

import { useState } from "react";
import { toast } from "sonner";

import { submitSurveyResponse } from "@/app/actions";
import type { SurveyQuestion, SurveyAnswers } from "@/models/survey";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// The satisfaction-survey questions + submit. Rating (1-5) questions are required,
// free-text ones optional.
export function SurveyForm({
  questions,
  onSubmitted,
}: {
  questions: readonly SurveyQuestion[];
  onSubmitted: () => void;
}) {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitting, setSubmitting] = useState(false);

  const allRatingsAnswered = questions
    .filter((q) => q.type === "rating")
    .every((q) => answers[q.id] != null);

  const setAnswer = (questionId: string, value: number | string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!allRatingsAnswered || submitting) return;
    setSubmitting(true);
    try {
      await submitSurveyResponse(answers);
      toast.success("ขอบคุณสำหรับความคิดเห็นของคุณ");
      onSubmitted();
    } catch {
      toast.error("ไม่สามารถส่งแบบสำรวจได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {questions.map((q, i) => (
        <div key={q.id}>
          <p className="text-sm font-medium text-slate-700 mb-2">
            {i + 1}. {q.text}
          </p>
          {q.type === "rating" ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition ${
                    answers[q.id] === n
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"
              rows={3}
            />
          )}
        </div>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={!allRatingsAnswered || submitting}
        size="lg"
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {submitting ? "กำลังส่ง…" : "ส่งแบบประเมิน"}
      </Button>
    </div>
  );
}
