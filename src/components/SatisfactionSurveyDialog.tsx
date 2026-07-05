"use client";

import { useState } from "react";
import { submitSurveyResponse } from "@/app/actions";
import type { SurveyQuestion, SurveyAnswers } from "@/models/survey";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function SatisfactionSurveyDialog({
  open,
  onOpenChange,
  questions,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: SurveyQuestion[];
  onSubmitted?: () => void;
}) {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitting, setSubmitting] = useState(false);

  const ratingQuestions = questions.filter((q) => q.type === "rating");
  const allRatingsAnswered = ratingQuestions.every(
    (q) => answers[q.id] != null,
  );

  const setRating = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };
  const setText = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Blur whatever's focused (always a button here) before the dialog closes/unmounts —
  // Base UI's own return-focus already uses preventScroll, but WebKit can still jump-scroll
  // to the bottom of the page when a focused element is removed from the DOM during teardown.
  const closeDialog = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!allRatingsAnswered || submitting) return;
    setSubmitting(true);
    try {
      await submitSurveyResponse(answers);
      toast.success("ขอบคุณสำหรับความคิดเห็นของคุณ");
      closeDialog();
      setAnswers({});
      onSubmitted?.();
    } catch {
      toast.error("ไม่สามารถส่งแบบสำรวจได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>แบบประเมินความพึงพอใจ</DialogTitle>
          <DialogDescription>
            ช่วยให้เราพัฒนากิจกรรมสุขอนามัยดิจิทัลให้ดียิ่งขึ้น ใช้เวลาไม่ถึง 1
            นาที
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
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
                      onClick={() => setRating(q.id, n)}
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
                  onChange={(e) => setText(q.id, e.target.value)}
                  placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"
                  rows={3}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            ข้าม
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allRatingsAnswered || submitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? "กำลังส่ง…" : "ส่งแบบประเมิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
