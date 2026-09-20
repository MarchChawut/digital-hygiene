import { ShieldCheck, Lock, Wifi, CloudUpload } from "lucide-react";

// Shared header shown above the section tabs on every section page.
export function AppHero({ division }: { division: string }) {
  return (
    <section className="max-w-4xl mx-auto w-full px-5 pt-8 pb-6 sm:pt-14 sm:pb-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 px-6 py-10 sm:px-10 sm:py-14 text-center shadow-xl">
        <div
          className="absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 text-white opacity-10 pointer-events-none"
          aria-hidden
        >
          <ShieldCheck className="w-16 h-16 sm:w-24 sm:h-24" />
          <Lock className="w-16 h-16 sm:w-24 sm:h-24" />
          <Wifi className="w-16 h-16 sm:w-24 sm:h-24" />
          <CloudUpload className="w-16 h-16 sm:w-24 sm:h-24" />
        </div>
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            ล้างเครื่องให้ใส <br/><span className="text-sky-300">ใส่ใจภูมิคุ้มกันดิจิทัล</span>
          </h1>
          <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            วิเคราะห์ช่องโหว่และความเสี่ยงทางไซเบอร์ <br/> ผ่านกิจกรรมโครงการ Digital Hygiene & Safety First
          </p>
          <p className="text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent mt-3">กอง/หน่วยงาน: {division}</p>
        </div>
      </div>
    </section>
  );
}
