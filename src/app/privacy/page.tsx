import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { AppFooter } from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | Digital Hygiene",
  description: "นโยบายความเป็นส่วนตัวและแนวทางการขอลบข้อมูลของแอป Digital Hygiene",
};

const CONTACT =
  "กองการศึกษา วิจัย และพัฒนา ศูนย์เทคโนโลยีดิจิทัล โทร 02 281 7999 ต่อ 4058-9 หรือ อีเมล chawut.sa@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-slate-700 space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar />
      <main className="max-w-2xl mx-auto w-full px-5 py-10 sm:py-16">
        <Card className="rounded-3xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold">นโยบายความเป็นส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section title="1. บทนำ">
              <p>
                Digital Hygiene เป็นแอปสำหรับประเมินสุขอนามัยดิจิทัลและความเสี่ยงทางไซเบอร์ส่วนบุคคล
                ผู้ใช้เข้าสู่ระบบด้วยบัญชี Google หรือด้วยอีเมล (Guest) เพื่อยืนยันตัวตนก่อนเริ่มทำแบบประเมิน
                และบันทึกผลลัพธ์ของตนเอง
              </p>
            </Section>

            <Section title="2. ข้อมูลที่จัดเก็บ">
              <p>เมื่อเข้าสู่ระบบและใช้งานแอป ระบบจะจัดเก็บข้อมูลดังนี้</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>ชื่อ, อีเมล และรูปโปรไฟล์ ที่ได้รับจากผู้ให้บริการล็อกอิน (Google หรือ Guest ผ่านอีเมล)</li>
                <li>กอง/หน่วยงานที่ท่านเลือกไว้ในระบบ</li>
                <li>ผลการประเมินสุขอนามัยดิจิทัล (คะแนนและรายการความเสี่ยง)</li>
                <li>พื้นที่จัดเก็บของอุปกรณ์ก่อนและหลังทำกิจกรรม (ตัวเลข GB ที่ท่านกรอกเอง)</li>
                <li>คำตอบแบบสอบถามความพึงพอใจ (หากท่านตอบแบบสอบถาม)</li>
                <li>
                  รหัสเซสชันการเข้าสู่ระบบ (อายุ 1 ชั่วโมงนับจากการใช้งานล่าสุด) และบันทึกการเข้าสู่ระบบ (อีเมลและเวลา)
                  เพื่อรักษาความปลอดภัยและตรวจสอบย้อนหลัง ระบบไม่เก็บโทเคนของ Google
                </li>
              </ul>
            </Section>

            <Section title="3. ระยะเวลาการเก็บรักษาและการลบข้อมูล">
              <p>
                ผลการประเมินสุขอนามัยดิจิทัล ค่าพื้นที่จัดเก็บที่ท่านกรอก และคำตอบแบบสอบถามความพึงพอใจของท่านจะถูกเก็บไว้เป็นเวลา
                30 วันนับจากวันที่บันทึก หลังจากนั้นระบบจะลบข้อมูลดังกล่าวโดยอัตโนมัติ
                โดยไม่กระทบต่อบัญชีผู้ใช้ของท่าน
              </p>
              <p>
                บันทึกการเข้าสู่ระบบและการดำเนินการของผู้ดูแลระบบ (บันทึกตรวจสอบ) เก็บไว้ 90 วัน และเซสชันที่หมดอายุจะถูกลบโดยอัตโนมัติ
                ส่วนบัญชีผู้ใช้ (ชื่อ, อีเมล, รูปโปรไฟล์, กอง/หน่วยงาน) จะเก็บไว้จนกว่าท่านร้องขอให้ลบตามหัวข้อ 6
              </p>
            </Section>

            <Section title="4. วัตถุประสงค์การใช้ข้อมูล">
              <p>
                ข้อมูลข้างต้นถูกใช้เพื่อยืนยันตัวตนผู้ใช้, บันทึกและแสดงผลการประเมินของท่าน,
                และนำคำตอบแบบสอบถามไปใช้ปรับปรุงคุณภาพของแอปเท่านั้น
              </p>
            </Section>

            <Section title="5. การจัดเก็บและการเปิดเผยข้อมูล">
              <p>
                ข้อมูลทั้งหมดจัดเก็บบนฐานข้อมูลของหน่วยงานเอง ไม่มีการขายหรือส่งต่อข้อมูลส่วนบุคคลให้บุคคลที่สาม
                ยกเว้นผู้ให้บริการล็อกอิน (Google) และผู้ให้บริการส่งอีเมลยืนยันตัวตน (Resend)
                ซึ่งใช้สำหรับการยืนยันตัวตนเท่านั้น
              </p>
            </Section>

            <Section title="6. สิทธิ์ในการขอเข้าถึง แก้ไข หรือลบข้อมูล">
              <div id="data-deletion" className="scroll-mt-20 space-y-2">
                <p>
                  ท่านสามารถขอเข้าถึง แก้ไข หรือขอลบข้อมูลส่วนบุคคลของท่านออกจากระบบได้ โดยติดต่อ:
                </p>
                <p className="font-semibold">{CONTACT}</p>
                <p>
                  เมื่อได้รับคำร้องขอและยืนยันตัวตนผู้ร้องขอแล้ว ระบบจะดำเนินการลบข้อมูลที่เกี่ยวข้อง
                  (บัญชีผู้ใช้ ผลการประเมิน และคำตอบแบบสอบถามที่ผูกกับอีเมลนั้น) ภายในระยะเวลาอันสมควร
                </p>
              </div>
            </Section>

            <Section title="7. การเปลี่ยนแปลงนโยบาย">
              <p>
                นโยบายนี้อาจมีการปรับปรุงเป็นครั้งคราว หากมีข้อสงสัยเกี่ยวกับนโยบายนี้ กรุณาติดต่อ{" "}
                {CONTACT}
              </p>
              <p className="text-slate-400">ปรับปรุงล่าสุด: กันยายน 2569</p>
            </Section>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
