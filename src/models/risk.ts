// Domain model — client-safe. Risk catalogue + the assessment task list.

export type Tone = "red" | "orange" | "amber";

export interface RiskInfo {
  category: string;
  title: string;
  severity: string;
  tone: Tone;
  impact: string;
  action: string;
}

export const RISK_DATABASE: Record<string, RiskInfo> = {
  DataCleanup: {
    category: "Digital Cleanup",
    title: "ลบข้อมูลสื่อสารและไฟล์ส่วนตัว",
    severity: "ปานกลาง",
    tone: "amber",
    impact: "พื้นที่จัดเก็บเต็ม เครื่องทำงานช้าลง และค้นหาข้อมูลสำคัญได้ยาก",
    action: "ลบไฟล์ขยะใน Downloads, ล้าง Cache แอป LINE, และลบประวัติเบราว์เซอร์/Cookies",
  },
  Disconnect: {
    category: "Auto Disconnect",
    title: "ปิดการเชื่อมต่อและศูนย์ควบคุมบนหน้าจอ",
    severity: "สูง",
    tone: "orange",
    impact: "เมื่อมือถือสูญหาย ผู้ไม่หวังดีสามารถตัดสัญญาณเน็ตเพื่อขัดขวางการตามหาเครื่อง (Find My) ได้ทันที",
    action: "ตั้งค่าปิดศูนย์ควบคุมขณะล็อกเครื่อง และปิดการเชื่อมต่ออัตโนมัติเมื่อไม่ใช้งาน",
  },
  MFA_FindDev: {
    category: "Security First",
    title: "ระบบยืนยันตัวตนและการติดตามอุปกรณ์",
    severity: "วิกฤต",
    tone: "red",
    impact: "หากรหัสผ่านหลุด แฮกเกอร์จะเข้าถึงบัญชีได้ทันที และหากเครื่องหายจะตามคืนหรือล้างข้อมูลไม่ได้",
    action: "เปิด MFA ในทุกบัญชีสำคัญ และตรวจสอบว่าฟีเจอร์ Find My ทำงานอยู่เสมอ",
  },
  Footprint: {
    category: "Footprint Cleanup",
    title: "เพิกถอนสิทธิ์แอปเก่าและตรวจสอบการล็อกอิน",
    severity: "วิกฤต",
    tone: "red",
    impact: "เสี่ยงต่อการถูกดักจับข้อมูล (Data Breach) และการสวมรอยบัญชีเพื่อทุจริตหรือหลอกลวง",
    action: "Deauthorize แอปที่ไม่ได้ใช้นานกว่า 3 เดือน และ Sign out ออกจากอุปกรณ์ที่ไม่รู้จักทันที",
  },
  Backup: {
    category: "Digital Backup",
    title: "การสำรองข้อมูลและจัดระเบียบไฟล์",
    severity: "สูง",
    tone: "orange",
    impact: "เมื่ออุปกรณ์เสียหายหรือถูก Ransomware ข้อมูลสำคัญและรูปภาพความทรงจำจะหายไปถาวร",
    action: "เปิดระบบสำรองข้อมูลอัตโนมัติ และหมั่นคัดแยกโฟลเดอร์งานตามโปรเจกต์ให้เป็นระเบียบ",
  },
  Update: {
    category: "OS & Apps Update",
    title: "อัปเดตระบบปฏิบัติการและแอปพลิเคชัน",
    severity: "สูง",
    tone: "orange",
    impact: "แฮกเกอร์สามารถใช้ช่องโหว่ (Vulnerability) ของซอฟต์แวร์เวอร์ชันเก่าในการเจาะระบบเครื่อง",
    action: "ตรวจสอบการอัปเดตใน Settings และ App Store/Play Store ให้เป็นปัจจุบันเสมอ",
  },
};

export const TASK_LIST = [
  { id: "DataCleanup", label: "ลบไฟล์ขยะ, LINE, และ Cache" },
  { id: "Disconnect", label: "ปิดศูนย์ควบคุมหน้าจอล็อก & Wi-Fi/BT" },
  { id: "MFA_FindDev", label: "เปิด MFA & ระบบค้นหาอุปกรณ์" },
  { id: "Footprint", label: "ลบแอปเก่า & Sign out อุปกรณ์อื่น" },
  { id: "Backup", label: "สำรองข้อมูลอัตโนมัติ & Local Backup" },
  { id: "Update", label: "อัปเดต OS & แอปพลิเคชัน" },
];
