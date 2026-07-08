import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
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
                ผู้ใช้เข้าสู่ระบบด้วยบัญชี Google หรือ Facebook เพื่อยืนยันตัวตนก่อนเริ่มทำแบบประเมิน
                และบันทึกผลลัพธ์ของตนเอง
              </p>
            </Section>

            <Section title="2. ข้อมูลที่จัดเก็บ">
              <p>เมื่อเข้าสู่ระบบและใช้งานแอป ระบบจะจัดเก็บข้อมูลดังนี้</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>ชื่อ, อีเมล และรูปโปรไฟล์ ที่ได้รับจากผู้ให้บริการล็อกอิน (Google หรือ Facebook)</li>
                <li>กอง/หน่วยงานที่ท่านเลือกไว้ในระบบ</li>
                <li>ผลการประเมินสุขอนามัยดิจิทัล (คะแนนและรายการความเสี่ยง)</li>
                <li>คำตอบแบบสอบถามความพึงพอใจ (หากท่านตอบแบบสอบถาม)</li>
                <li>
                  โทเคนยืนยันตัวตน (OAuth token) ที่ผู้ให้บริการล็อกอินออกให้ ใช้เพื่อคงสถานะการเข้าสู่ระบบเท่านั้น
                </li>
              </ul>
            </Section>

            <Section title="3. วัตถุประสงค์การใช้ข้อมูล">
              <p>
                ข้อมูลข้างต้นถูกใช้เพื่อยืนยันตัวตนผู้ใช้, บันทึกและแสดงผลการประเมินของท่าน,
                และนำคำตอบแบบสอบถามไปใช้ปรับปรุงคุณภาพของแอปเท่านั้น
              </p>
            </Section>

            <Section title="4. การจัดเก็บและการเปิดเผยข้อมูล">
              <p>
                ข้อมูลทั้งหมดจัดเก็บบนฐานข้อมูลของหน่วยงานเอง ไม่มีการขายหรือส่งต่อข้อมูลส่วนบุคคลให้บุคคลที่สาม
                ยกเว้นผู้ให้บริการล็อกอิน (Google และ Facebook) ซึ่งใช้สำหรับการยืนยันตัวตนเท่านั้น
              </p>
            </Section>

            <Section title="5. สิทธิ์ในการขอเข้าถึง แก้ไข หรือลบข้อมูล">
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

            <Section title="6. การเปลี่ยนแปลงนโยบาย">
              <p>
                นโยบายนี้อาจมีการปรับปรุงเป็นครั้งคราว หากมีข้อสงสัยเกี่ยวกับนโยบายนี้ กรุณาติดต่อ{" "}
                {CONTACT}
              </p>
              <p className="text-slate-400">ปรับปรุงล่าสุด: กรกฎาคม 2569</p>
            </Section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
