import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVITY_GROUPS } from "@/models/activity-group";
import type { ChecklistItem, ChecklistItemInput } from "@/models/risk";

function assertValidGroupId(groupId: string | undefined): void {
  if (groupId !== undefined && !ACTIVITY_GROUPS.some((g) => g.id === groupId)) {
    throw new Error(`Invalid groupId: ${groupId}`);
  }
}

// Default items inserted once, the first time the table is empty. Five items
// reuse the historical ids (Disconnect, MFA_FindDev, Footprint, Backup, Update)
// pinned to their closest successors so pre-existing AssessmentRecord.selectedIds
// still resolve to a title; the rest get auto-generated cuids.
const DEFAULT_ITEMS: (ChecklistItemInput & { id?: string })[] = [
  /* ---------- 1) Digital Cleanup — 25 คะแนน ---------- */
  {
    order: 1,
    groupId: "cleanup",
    category: "ลบข้อมูลสื่อสาร",
    title: "ลบข้อมูล LINE ที่ไม่จำเป็น (รายชื่อ, แชท, รูป, วิดีโอ, Notes)",
    severity: "ปานกลาง",
    impact: "ข้อมูลแชทและรายชื่อผู้ติดต่อเก่าใน LINE เสี่ยงรั่วไหลหากอุปกรณ์สูญหายหรือถูกแฮก",
    action: "ลบรายชื่อ แชท รูปภาพ วิดีโอ และ Notes ใน LINE ที่ไม่จำเป็นออกเป็นประจำ",
    guide: "",
  },
  {
    order: 2,
    groupId: "cleanup",
    category: "ลบข้อมูลสื่อสาร",
    title: "ลบอีเมลที่ไม่จำเป็น + ล้างโฟลเดอร์ขยะ",
    severity: "ปานกลาง",
    impact: "อีเมลเก่าที่มีข้อมูลสำคัญ เช่น รหัสผ่านหรือเอกสารลับ เสี่ยงถูกเข้าถึงหากบัญชีถูกเจาะ",
    action: "ลบอีเมลที่ไม่ใช้งานและล้างโฟลเดอร์ถังขยะ (Trash) ให้ว่างอยู่เสมอ",
    guide: "",
  },
  {
    order: 3,
    groupId: "cleanup",
    category: "ลบไฟล์และข้อมูลส่วนตัว",
    title: "ลบข้อความ/รูปภาพ/วิดีโอที่ไม่จำเป็น + ล้างถังขยะ",
    severity: "ปานกลาง",
    impact: "ไฟล์ส่วนตัวที่ยังไม่ลบถาวรอาจถูกกู้คืนและนำไปใช้ในทางที่ไม่เหมาะสม",
    action: "ลบไฟล์สื่อที่ไม่ใช้งาน แล้วล้างถังขยะ (Recycle Bin) เพื่อลบถาวร",
    guide: "",
  },
  {
    order: 4,
    groupId: "cleanup",
    category: "ลบไฟล์และข้อมูลส่วนตัว",
    title: "ลบไฟล์เอกสาร Downloads/Notes + ล้างถังขยะ",
    severity: "ปานกลาง",
    impact: "ไฟล์เอกสารสำคัญใน Downloads อาจมีข้อมูลอ่อนไหวที่ไม่ได้เข้ารหัสไว้",
    action: "คัดแยกและลบไฟล์เอกสารใน Downloads และแอป Notes ที่ไม่ใช้งาน แล้วล้างถังขยะ",
    guide: "",
  },
  {
    order: 5,
    groupId: "cleanup",
    category: "ลบบัญชีผู้ใช้และตัดการเชื่อมต่อ",
    title: "ลบบัญชีผู้ใช้/อีเมลที่ไม่ได้ใช้งาน",
    severity: "สูง",
    impact: "บัญชีที่ถูกทิ้งร้างมักเป็นเป้าหมายแรกที่แฮกเกอร์ใช้เจาะเข้าระบบ",
    action: "ตรวจสอบและปิด/ลบบัญชีหรืออีเมลที่ไม่ได้ใช้งานแล้วออกจากทุกระบบ",
    guide: "",
  },
  {
    order: 6,
    groupId: "cleanup",
    category: "ลบบัญชีผู้ใช้และตัดการเชื่อมต่อ",
    title: "ลบ/ปิดการเชื่อมต่อ Wi-Fi, Bluetooth ที่ไม่จำเป็น",
    severity: "สูง",
    impact: "การเปิด Wi-Fi/Bluetooth ค้างไว้ เสี่ยงถูกอุปกรณ์แปลกปลอมเชื่อมต่อโดยไม่รู้ตัว",
    action: "ลบเครือข่าย Wi-Fi ที่ไม่ใช้ และปิด Wi-Fi/Bluetooth เมื่อไม่ได้ใช้งาน",
    guide: "",
  },
  {
    order: 7,
    groupId: "cleanup",
    category: "ลบแอปพลิเคชันและประวัติเว็บเบราว์เซอร์",
    title: "ถอนการติดตั้งแอปที่ไม่ได้ใช้งาน",
    severity: "ปานกลาง",
    impact: "แอปเก่าที่ไม่ได้อัปเดตมักมีช่องโหว่ด้านความปลอดภัยที่ยังไม่ถูกปิด",
    action: "ตรวจสอบและถอนการติดตั้งแอปที่ไม่ได้ใช้งานออกจากเครื่อง",
    guide: "",
  },
  {
    order: 8,
    groupId: "cleanup",
    category: "ลบแอปพลิเคชันและประวัติเว็บเบราว์เซอร์",
    title: "ล้าง Cache ของแอปพลิเคชัน",
    severity: "ปานกลาง",
    impact: "Cache ที่สะสมนานอาจเก็บข้อมูล session หรือรหัสผ่านที่ผู้อื่นดึงออกมาได้",
    action: "ล้าง Cache ของแอปที่ใช้งานบ่อยเป็นประจำเพื่อคืนพื้นที่และลดความเสี่ยง",
    guide: "",
  },
  {
    order: 9,
    groupId: "cleanup",
    category: "ลบแอปพลิเคชันและประวัติเว็บเบราว์เซอร์",
    title: "ล้างประวัติ Browser และ Cookies",
    severity: "สูง",
    impact: "ประวัติและ Cookies ที่ค้างอยู่เปิดช่องให้ผู้อื่นเข้าถึงบัญชีที่ล็อกอินค้างไว้",
    action: "ล้างประวัติการใช้งาน (History) และ Cookies ในเบราว์เซอร์เป็นประจำ",
    guide: "",
  },
  {
    order: 10,
    groupId: "cleanup",
    category: "ลบแอปพลิเคชันและประวัติเว็บเบราว์เซอร์",
    title: "ลบ Extensions + ปิดแท็บที่ไม่ใช้งาน",
    severity: "ปานกลาง",
    impact: "Extension ที่ไม่ได้ใช้อาจแอบเก็บหรือส่งข้อมูลการใช้งานของคุณออกไป",
    action: "ลบ Extensions ที่ไม่ใช้หรือไม่น่าเชื่อถือ และปิดแท็บที่ไม่ได้ใช้งาน",
    guide: "",
  },

  /* ---------- 2) Auto Disconnect & Account Security — 25 คะแนน ---------- */
  {
    id: "Disconnect",
    order: 11,
    groupId: "security",
    category: "ตั้งค่าความปลอดภัยของบัญชีและการเชื่อมต่อ",
    title: "ปิดศูนย์ควบคุมบนหน้าจอล็อก (Control Center)",
    severity: "สูง",
    impact:
      "ผู้อื่นสามารถปิด Wi-Fi หรือเปิดโหมดเครื่องบินได้โดยไม่ต้องปลดล็อกเครื่อง ขัดขวางการตามหาเครื่องที่สูญหาย",
    action: "ตั้งค่าปิดการเข้าถึงศูนย์ควบคุมขณะหน้าจอล็อกอยู่",
    guide: "",
  },
  {
    order: 12,
    groupId: "security",
    category: "ตั้งค่าความปลอดภัยของบัญชีและการเชื่อมต่อ",
    title: "ตั้งค่า LINE เพื่อความปลอดภัย",
    severity: "สูง",
    impact: "บัญชี LINE ที่ไม่ได้ตั้งค่าป้องกันเสี่ยงถูกขโมยผ่านการเชื่อมต่ออุปกรณ์ใหม่โดยไม่รู้ตัว",
    action: "ปิดการอนุญาตล็อกอินจากอุปกรณ์อื่น และเปิดการล็อกแอปด้วยรหัสผ่านใน LINE",
    guide: "",
  },
  {
    order: 13,
    groupId: "security",
    category: "ตั้งค่าความปลอดภัยของบัญชีและการเชื่อมต่อ",
    title: "ตั้งค่า Bluetooth และ Wi-Fi ให้ปลอดภัย",
    severity: "สูง",
    impact: "การเชื่อมต่อที่ไม่ปลอดภัยเปิดช่องให้ผู้ไม่หวังดีดักข้อมูลหรือแอบเชื่อมต่อเครื่อง",
    action: "ปิดการเชื่อมต่ออัตโนมัติกับเครือข่ายสาธารณะ และตั้ง Bluetooth ให้ไม่ถูกค้นพบ",
    guide: "",
  },
  {
    order: 14,
    groupId: "security",
    category: "ตั้งค่าความปลอดภัยของบัญชีและการเชื่อมต่อ",
    title: "เปิดใช้งานฟีเจอร์ค้นหาอุปกรณ์ (Find My Device)",
    severity: "สูง",
    impact: "หากอุปกรณ์สูญหาย จะไม่สามารถระบุตำแหน่งหรือลบข้อมูลจากระยะไกลได้ทันที",
    action: "เปิดใช้งาน Find My (iOS) หรือ Find My Device (Android) และตรวจสอบว่าทำงานอยู่เสมอ",
    guide: "",
  },
  {
    id: "MFA_FindDev",
    order: 15,
    groupId: "security",
    category: "ตั้งค่าความปลอดภัยของบัญชีและการเชื่อมต่อ",
    title: "เปิดใช้งาน MFA (Multi-Factor Authentication)",
    severity: "วิกฤต",
    impact: "บัญชีที่ไม่มี MFA เสี่ยงถูกเข้าถึงทันทีเพียงแค่รหัสผ่านรั่วไหลครั้งเดียว",
    action: "เปิด MFA ในทุกบัญชีสำคัญ เช่น อีเมล ธนาคาร และโซเชียลมีเดีย",
    guide: "",
  },
  {
    order: 16,
    groupId: "security",
    category: "ตั้งค่าความปลอดภัยของบัญชีและการเชื่อมต่อ",
    title: "ใช้รหัสผ่านต่างกันในแต่ละบัญชี + ไม่แชร์รหัสผ่าน",
    severity: "วิกฤต",
    impact: "การใช้รหัสผ่านซ้ำ หากบัญชีหนึ่งรั่วไหล บัญชีอื่นทั้งหมดจะถูกเจาะตามไปด้วย",
    action: "ตั้งรหัสผ่านไม่ซ้ำกันในแต่ละบัญชี และไม่บอกรหัสผ่านแก่ผู้อื่น",
    guide: "",
  },

  /* ---------- 3) Digital Footprint Cleanup — 25 คะแนน ---------- */
  {
    order: 17,
    groupId: "footprint",
    category: "เพิกถอนสิทธิ์แอปเก่าและตรวจสอบอุปกรณ์แปลกปลอม",
    title: "ลบแอปที่ไม่รู้จัก/ไม่ได้ใช้งานออกจาก Google Account",
    severity: "สูง",
    impact: "แอปเก่าที่ยังเชื่อมต่ออยู่อาจเข้าถึงอีเมล ไฟล์ และข้อมูลส่วนตัวโดยที่คุณไม่รู้ตัว",
    action: "ตรวจสอบ Third-party access ใน Google Account แล้วลบแอปที่ไม่รู้จักหรือไม่ได้ใช้",
    guide: "",
  },
  {
    order: 18,
    groupId: "footprint",
    category: "เพิกถอนสิทธิ์แอปเก่าและตรวจสอบอุปกรณ์แปลกปลอม",
    title: "ตรวจสอบ Authorized apps ใน LINE + Deauthorize",
    severity: "สูง",
    impact: "แอปที่ยังมีสิทธิ์ใน LINE อาจอ่านหรือส่งข้อความแทนคุณได้",
    action: "เข้า Settings → Account → Authorized apps ใน LINE แล้ว Deauthorize แอปที่ไม่ต้องการ",
    guide: "",
  },
  {
    order: 19,
    groupId: "footprint",
    category: "เพิกถอนสิทธิ์แอปเก่าและตรวจสอบอุปกรณ์แปลกปลอม",
    title: "ลบแอป/บริการที่เข้าถึงข้อมูลเกินจำเป็นใน Microsoft Account",
    severity: "สูง",
    impact: "บริการที่เชื่อมต่อมากเกินไปเพิ่มพื้นผิวการโจมตี (attack surface) ของบัญชี",
    action: "ตรวจสอบ App permissions ใน Microsoft Account แล้วลบแอป/บริการที่ไม่จำเป็น",
    guide: "",
  },
  {
    order: 20,
    groupId: "footprint",
    category: "เพิกถอนสิทธิ์แอปเก่าและตรวจสอบอุปกรณ์แปลกปลอม",
    title: "ยกเลิกรับข่าวสาร (Unsubscribe) อีเมลที่ไม่ต้องการ",
    severity: "ปานกลาง",
    impact: "อีเมลขยะที่สะสมเพิ่มความเสี่ยงฟิชชิ่งและบดบังอีเมลสำคัญจนพลาดได้ง่าย",
    action: "กด Unsubscribe จดหมายข่าวที่ไม่อ่าน และรายงานอีเมลขยะเป็น Spam",
    guide: "",
  },
  {
    id: "Footprint",
    order: 21,
    groupId: "footprint",
    category: "เพิกถอนสิทธิ์แอปเก่าและตรวจสอบอุปกรณ์แปลกปลอม",
    title:
      "ตรวจสอบอุปกรณ์ที่ล็อกอิน + Sign out อุปกรณ์แปลก (Google / Facebook & Instagram / LINE / Apple ID / Microsoft / Android)",
    severity: "วิกฤต",
    impact: "อุปกรณ์แปลกที่ยังล็อกอินค้างอยู่สามารถเข้าถึงบัญชีของคุณได้ตลอดเวลาโดยไม่รู้ตัว",
    action: "ตรวจสอบรายการอุปกรณ์ที่ล็อกอินในทุกบัญชีสำคัญ และ Sign out อุปกรณ์ที่ไม่รู้จักทันที",
    guide: "",
  },

  /* ---------- 4) Digital Backup — 25 คะแนน ---------- */
  {
    id: "Backup",
    order: 22,
    groupId: "backup",
    category: "สำรองข้อมูลและอัปเดตระบบ",
    title: "เปิด Auto-Backup (iCloud / Google One)",
    severity: "สูง",
    impact: "หากอุปกรณ์เสียหรือหาย ข้อมูลทั้งหมดอาจสูญหายถาวรโดยไม่มีสำเนา",
    action: "เปิดใช้งาน iCloud Backup หรือ Google One Backup ให้สำรองข้อมูลอัตโนมัติ",
    guide: "",
  },
  {
    order: 23,
    groupId: "backup",
    category: "สำรองข้อมูลและอัปเดตระบบ",
    title: "จัดระเบียบไฟล์งาน (แยกโฟลเดอร์ตามโปรเจกต์)",
    severity: "ปานกลาง",
    impact: "ไฟล์งานที่ไม่จัดระเบียบเสี่ยงหาไฟล์สำคัญไม่เจอหรือทำงานซ้ำซ้อนในเวลาคับขัน",
    action: "แยกโฟลเดอร์งานตามโปรเจกต์/ประเภทงานให้เป็นระเบียบอย่างสม่ำเสมอ",
    guide: "",
  },
  {
    id: "Update",
    order: 24,
    groupId: "backup",
    category: "สำรองข้อมูลและอัปเดตระบบ",
    title: "อัปเดตระบบปฏิบัติการ (OS)",
    severity: "สูง",
    impact: "ระบบปฏิบัติการเก่าที่ไม่อัปเดตมีช่องโหว่ด้านความปลอดภัยที่รู้จักและถูกโจมตีได้ง่าย",
    action: "ตรวจสอบและติดตั้งอัปเดต OS ใน Settings ให้เป็นเวอร์ชันล่าสุดเสมอ",
    guide: "",
  },
  {
    order: 25,
    groupId: "backup",
    category: "สำรองข้อมูลและอัปเดตระบบ",
    title: "อัปเดตแอปพลิเคชัน",
    severity: "สูง",
    impact: "แอปเวอร์ชันเก่าอาจถูกโจมตีผ่านช่องโหว่ที่เวอร์ชันใหม่ได้แก้ไขไปแล้ว",
    action: "อัปเดตแอปผ่าน App Store / Play Store ให้เป็นปัจจุบัน",
    guide: "",
  },
  {
    order: 26,
    groupId: "backup",
    category: "สำรองข้อมูลและอัปเดตระบบ",
    title: "ทำ Local Backup & Restore (PC/Mac/External Drive)",
    severity: "ปานกลาง",
    impact: "ไม่มีสำเนาข้อมูลสำรองในเครื่อง หมายความว่าไม่มีแผนสองหากบริการ Cloud ล่มหรือบัญชีถูกล็อก",
    action: "สำรองข้อมูลลง PC/Mac หรือ External Drive เป็นระยะ และทดสอบการกู้คืน",
    guide: "",
  },
];

function toModel(row: {
  id: string;
  order: number;
  groupId: string;
  category: string;
  title: string;
  severity: string;
  impact: string;
  action: string;
  guide: string;
}): ChecklistItem {
  return {
    id: row.id,
    order: row.order,
    groupId: row.groupId as ChecklistItem["groupId"],
    category: row.category,
    title: row.title,
    severity: row.severity,
    impact: row.impact,
    action: row.action,
    guide: row.guide,
  };
}

// Re-seeds if an admin empties the catalogue entirely — same self-seed
// contract as survey.service.ts's ensureDefaultQuestions.
async function ensureDefaultItems(): Promise<void> {
  const count = await prisma.checklistItem.count();
  if (count === 0) {
    await prisma.checklistItem.createMany({ data: DEFAULT_ITEMS });
  }
}

export async function listItems(): Promise<ChecklistItem[]> {
  await ensureDefaultItems();
  const rows = await prisma.checklistItem.findMany({ orderBy: { order: "asc" } });
  return rows.map(toModel);
}

export async function createItem(input: ChecklistItemInput): Promise<ChecklistItem> {
  assertValidGroupId(input.groupId);
  const row = await prisma.checklistItem.create({ data: input });
  return toModel(row);
}

export async function updateItem(
  id: string,
  input: Partial<ChecklistItemInput>
): Promise<ChecklistItem> {
  assertValidGroupId(input.groupId);
  const row = await prisma.checklistItem.update({ where: { id }, data: input });
  return toModel(row);
}

export async function deleteItem(id: string): Promise<void> {
  await prisma.checklistItem.delete({ where: { id } });
}
