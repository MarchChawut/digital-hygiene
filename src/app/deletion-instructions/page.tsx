import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "วิธีขอลบข้อมูลผู้ใช้ | Digital Hygiene",
  description: "ขั้นตอนการขอลบข้อมูลส่วนบุคคลออกจากระบบ Digital Hygiene",
};

const CONTACT =
  "กองการศึกษา วิจัย และพัฒนา ศูนย์เทคโนโลยีดิจิทัล โทร 02 281 7999 ต่อ 4058-9 หรือ อีเมล chawut.sa@gmail.com";

export default function DeletionInstructionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar />
      <main className="max-w-2xl mx-auto w-full px-5 py-10 sm:py-16">
        <Card className="rounded-3xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold">วิธีขอลบข้อมูลผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-slate-700">
            <p>
              หากท่านต้องการขอลบข้อมูลส่วนบุคคลที่เกี่ยวข้องกับบัญชีของท่านออกจากระบบ Digital
              Hygiene (ไม่ว่าจะเข้าสู่ระบบด้วย Google หรือ Facebook) กรุณาติดต่อ:
            </p>
            <p className="font-semibold">{CONTACT}</p>
            <p>
              เมื่อได้รับคำร้องขอและยืนยันตัวตนผู้ร้องขอแล้ว ระบบจะดำเนินการลบข้อมูลที่เกี่ยวข้องกับ
              อีเมลของท่านทั้งหมด ได้แก่:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>บัญชีผู้ใช้ (ชื่อ, อีเมล, รูปโปรไฟล์, กอง/หน่วยงานที่เลือกไว้)</li>
              <li>ผลการประเมินสุขอนามัยดิจิทัลที่บันทึกไว้</li>
              <li>คำตอบแบบสอบถามความพึงพอใจ (หากเคยตอบ)</li>
            </ul>
            <p>การลบข้อมูลจะดำเนินการภายในระยะเวลาอันสมควรหลังได้รับคำร้องขอ</p>
            <p className="text-slate-400">
              อ่านนโยบายความเป็นส่วนตัวฉบับเต็มได้ที่{" "}
              <Link href="/privacy" className="underline hover:text-slate-600">
                นโยบายความเป็นส่วนตัว
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
