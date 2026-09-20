"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

import type { SurveyQuestion } from "@/models/survey";
import { SurveyForm } from "@/components/SurveyForm";
import { Card, CardContent } from "@/components/ui/card";

// Body of the /survey tab: the form, or a thank-you / empty state.
export function SurveyPanel({
  questions,
  alreadyResponded,
}: {
  questions: readonly SurveyQuestion[];
  alreadyResponded: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card className="rounded-3xl shadow-xl overflow-hidden py-0 scroll-mt-32">
      <CardContent className="p-5 sm:p-9">
        {alreadyResponded || submitted ? (
          <div className="text-center py-9">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3.5 text-emerald-500" />
            <p className="text-slate-700 font-bold text-lg">ขอบคุณสำหรับความคิดเห็นของคุณ</p>
            <p className="text-slate-500 text-sm mt-1.5">คุณตอบแบบประเมินความพึงพอใจเรียบร้อยแล้ว</p>
          </div>
        ) : questions.length === 0 ? (
          <p className="text-center text-sm text-slate-400 italic py-9">ยังไม่มีแบบประเมินในขณะนี้</p>
        ) : (
          <>
            <div className="mb-7 flex items-start gap-3">
              <ClipboardCheck className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1.5">แบบประเมินความพึงพอใจ</h2>
                <p className="text-sm text-slate-500">
                  ช่วยให้เราพัฒนากิจกรรมสุขอนามัยดิจิทัลให้ดียิ่งขึ้น ใช้เวลาไม่ถึง 1 นาที
                </p>
              </div>
            </div>
            <SurveyForm questions={questions} onSubmitted={() => setSubmitted(true)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
