"use client";

import React, { useState } from "react";
import {
  adminCreateSurveyQuestion,
  adminUpdateSurveyQuestion,
  adminDeleteSurveyQuestion,
} from "@/app/actions";
import type { SurveyQuestion, SurveyQuestionType } from "@/models/survey";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TYPE_LABEL: Record<SurveyQuestionType, string> = { rating: "คะแนน 1-5", text: "ข้อความ" };

export function SurveyAdmin({ initialQuestions }: { initialQuestions: SurveyQuestion[] }) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SurveyQuestion | null>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<SurveyQuestionType>("rating");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setText("");
    setType("rating");
    setFormOpen(true);
  };

  const openEdit = (q: SurveyQuestion) => {
    setEditing(q);
    setText(q.text);
    setType(q.type);
    setFormOpen(true);
  };

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await adminUpdateSurveyQuestion(editing.id, { text: text.trim(), type });
        setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        toast.success("แก้ไขคำถามแล้ว");
      } else {
        const order = questions.length ? Math.max(...questions.map((q) => q.order)) + 1 : 1;
        const created = await adminCreateSurveyQuestion({ text: text.trim(), type, order });
        setQuestions((prev) => [...prev, created].sort((a, b) => a.order - b.order));
        toast.success("เพิ่มคำถามแล้ว");
      }
      setFormOpen(false);
    } catch {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminDeleteSurveyQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("ลบคำถามแล้ว");
    } catch {
      toast.error("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  return (
    <Card className="rounded-3xl shadow-xl overflow-hidden mt-6 py-0">
      <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-slate-800">แบบสำรวจความพึงพอใจ (Survey)</h2>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          เพิ่มคำถามใหม่
        </Button>
      </div>

      {questions.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-14">ลำดับ</TableHead>
                <TableHead>คำถาม</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="text-slate-500 text-[13px]">{q.order}</TableCell>
                  <TableCell className="font-medium text-slate-900">{q.text}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABEL[q.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(q)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button variant="ghost" size="icon-sm" className="text-red-600 hover:text-red-700" />}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ลบคำถามนี้หรือไม่?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{q.text}&quot; จะถูกลบออกจากแบบสำรวจอย่างถาวร
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove(q.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              ลบ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีคำถามในแบบสำรวจ</div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</DialogTitle>
            <DialogDescription>กำหนดข้อความคำถามและรูปแบบคำตอบ</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="survey-q-text">คำถาม</Label>
              <Input id="survey-q-text" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>รูปแบบคำตอบ</Label>
              <Select value={type} onValueChange={(v) => setType(v as SurveyQuestionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">คะแนน 1-5</SelectItem>
                  <SelectItem value="text">ข้อความ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={!text.trim() || saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
