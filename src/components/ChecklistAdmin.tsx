"use client";

import React, { useState } from "react";
import {
  adminCreateChecklistItem,
  adminUpdateChecklistItem,
  adminDeleteChecklistItem,
} from "@/app/actions";
import type { ChecklistItem, ChecklistItemInput } from "@/models/risk";
import { ACTIVITY_GROUPS, type GroupId } from "@/models/activity-group";
import { GROUP_THEME } from "@/lib/theme";
import { severityBadge } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const SEVERITY_OPTIONS = ["ปานกลาง", "สูง", "วิกฤต"] as const;

export function ChecklistAdmin({ initialItems }: { initialItems: ChecklistItem[] }) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [groupId, setGroupId] = useState<GroupId>(ACTIVITY_GROUPS[0].id);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<string>(SEVERITY_OPTIONS[0]);
  const [impact, setImpact] = useState("");
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = (defaultGroupId?: GroupId) => {
    setEditing(null);
    setGroupId(defaultGroupId ?? ACTIVITY_GROUPS[0].id);
    setCategory("");
    setTitle("");
    setSeverity(SEVERITY_OPTIONS[0]);
    setImpact("");
    setAction("");
    setFormOpen(true);
  };

  const openEdit = (item: ChecklistItem) => {
    setEditing(item);
    setGroupId(item.groupId);
    setCategory(item.category);
    setTitle(item.title);
    setSeverity(item.severity);
    setImpact(item.impact);
    setAction(item.action);
    setFormOpen(true);
  };

  const save = async () => {
    if (!category.trim() || !title.trim() || !impact.trim() || !action.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        // Moving an item to a different group leaves its old `order` behind,
        // which can collide with an existing item's order in the new group —
        // recompute it the same way the create path does.
        const targetGroupItems = items.filter((i) => i.groupId === groupId && i.id !== editing.id);
        const order =
          groupId === editing.groupId
            ? editing.order
            : targetGroupItems.length
            ? Math.max(...targetGroupItems.map((i) => i.order)) + 1
            : 1;
        const updated = await adminUpdateChecklistItem(editing.id, {
          groupId,
          order,
          category: category.trim(),
          title: title.trim(),
          severity,
          impact: impact.trim(),
          action: action.trim(),
        });
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        toast.success("แก้ไขรายการแล้ว");
      } else {
        const groupItems = items.filter((i) => i.groupId === groupId);
        const order = groupItems.length ? Math.max(...groupItems.map((i) => i.order)) + 1 : 1;
        const input: ChecklistItemInput = {
          groupId,
          order,
          category: category.trim(),
          title: title.trim(),
          severity,
          impact: impact.trim(),
          action: action.trim(),
        };
        const created = await adminCreateChecklistItem(input);
        setItems((prev) => [...prev, created].sort((a, b) => a.order - b.order));
        toast.success("เพิ่มรายการแล้ว");
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
      await adminDeleteChecklistItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("ลบรายการแล้ว");
    } catch {
      toast.error("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  return (
    <Card className="rounded-3xl shadow-xl overflow-hidden mt-6 py-0">
      <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-slate-800">เช็คลิสกิจกรรม (Checklist)</h2>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openCreate()}>
          <Plus className="w-4 h-4" />
          เพิ่มรายการใหม่
        </Button>
      </div>

      {ACTIVITY_GROUPS.map((group) => {
        const theme = GROUP_THEME[group.id];
        const GroupIcon = theme.icon;
        const groupItems = items.filter((i) => i.groupId === group.id);
        return (
          <div key={group.id} className="px-7 py-5 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div
                className={`w-7 h-7 rounded-lg ${theme.sectionIconBg} ${theme.sectionIconText} flex items-center justify-center shrink-0`}
              >
                <GroupIcon className="w-4 h-4" />
              </div>
              <h3 className={`text-sm font-bold ${theme.sectionTitle}`}>{group.label}</h3>
              <span className="text-xs text-slate-400">{groupItems.length} รายการ</span>
            </div>

            {groupItems.length ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>หมวดย่อย</TableHead>
                      <TableHead>หัวข้อ</TableHead>
                      <TableHead>ระดับความเสี่ยง</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-slate-500 text-[13px]">{item.category}</TableCell>
                        <TableCell className="font-medium text-slate-900">{item.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={severityBadge(item.severity)}>
                            {item.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-red-600 hover:text-red-700"
                                  />
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ลบรายการนี้หรือไม่?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    &quot;{item.title}&quot; จะถูกลบออกจากเช็คลิสอย่างถาวร
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => remove(item.id)}
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
              <div className="text-center py-6 text-slate-400 text-sm">ยังไม่มีรายการในหมวดนี้</div>
            )}
          </div>
        );
      })}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        {/* <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto"> */}
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}</DialogTitle>
            <DialogDescription>กำหนดหมวดกิจกรรมและรายละเอียดของเช็คลิส</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>กิจกรรม</Label>
              <Select value={groupId} onValueChange={(v) => setGroupId(v as GroupId)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_GROUPS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checklist-category">หมวดย่อย</Label>
              <Input id="checklist-category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checklist-title">หัวข้อเช็คลิส</Label>
              <Input id="checklist-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ระดับความเสี่ยง</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checklist-impact">ผลกระทบที่อาจเกิด</Label>
              <Textarea id="checklist-impact" value={impact} onChange={(e) => setImpact(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checklist-action">แนวทางแก้ไข (Action)</Label>
              <Textarea id="checklist-action" value={action} onChange={(e) => setAction(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={save}
              disabled={!category.trim() || !title.trim() || !impact.trim() || !action.trim() || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
