"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Config                                                            */
/* ------------------------------------------------------------------ */

const ADMIN_EMAILS = ["kornwalairathwork@gmail.com"];

const DIVISIONS = [
  "กองบังคับการ",
  "กองระบบเครือข่ายสารสนเทศ และความปลอดภัย",
  "กองสนับสนุนสารสนเทศ และการสื่อสาร",
  "กองศึกษา วิจัย และพัฒนา",
  "กองบริการปฏิบัติการสารสนเทศ",
];

type Tone = "red" | "orange" | "amber";

interface RiskInfo {
  category: string;
  title: string;
  severity: string;
  tone: Tone;
  impact: string;
  action: string;
}

const RISK_DATABASE: Record<string, RiskInfo> = {
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

const TASK_LIST = [
  { id: "DataCleanup", label: "ลบไฟล์ขยะ, LINE, และ Cache" },
  { id: "Disconnect", label: "ปิดศูนย์ควบคุมหน้าจอล็อก & Wi-Fi/BT" },
  { id: "MFA_FindDev", label: "เปิด MFA & ระบบค้นหาอุปกรณ์" },
  { id: "Footprint", label: "ลบแอปเก่า & Sign out อุปกรณ์อื่น" },
  { id: "Backup", label: "สำรองข้อมูลอัตโนมัติ & Local Backup" },
  { id: "Update", label: "อัปเดต OS & แอปพลิเคชัน" },
];

interface AssessmentRecord {
  id: string;
  email: string;
  division: string;
  ts: number;
  gaps: number;
  scoreLabel: string;
  selectedIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const LS_RECORDS = "dh_records_v1";
const LS_USER = "dh_current_user";
const LS_DIVISION = "dh_current_division";

const isAdmin = (email: string) => ADMIN_EMAILS.includes((email || "").trim().toLowerCase());

function scoreFor(count: number) {
  if (count === 0) return { label: "ปลอดภัย", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (count <= 2) return { label: "ความเสี่ยงต่ำ", text: "text-amber-600", bg: "bg-amber-50" };
  if (count <= 4) return { label: "ความเสี่ยงสูง", text: "text-orange-600", bg: "bg-orange-50" };
  return { label: "วิกฤต", text: "text-red-600", bg: "bg-red-50" };
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const severityBadge = (severity: string) =>
  severity === "วิกฤต"
    ? "border-red-200 text-red-600 bg-red-50"
    : severity === "สูง"
    ? "border-orange-200 text-orange-600 bg-orange-50"
    : "border-amber-200 text-amber-600 bg-amber-50";

const scorePill = (label: string) => {
  switch (label) {
    case "ปลอดภัย":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "ความเสี่ยงต่ำ":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "ความเสี่ยงสูง":
      return "text-orange-600 bg-orange-50 border-orange-200";
    default:
      return "text-red-600 bg-red-50 border-red-200";
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type View = "login" | "app" | "admin";

export default function DigitalHygieneApp() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [division, setDivision] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [divisionDraft, setDivisionDraft] = useState("");
  const [error, setError] = useState("");
  const [records, setRecords] = useState<AssessmentRecord[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /* ---- bootstrap from localStorage ---- */
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(LS_RECORDS) || "[]");
      setRecords(Array.isArray(r) ? r : []);
    } catch {}
    const u = localStorage.getItem(LS_USER) || "";
    const d = localStorage.getItem(LS_DIVISION) || "";
    setEmail(u);
    setDivision(d);
    setDivisionDraft(d);
    setView(u ? "app" : "login");
  }, []);

  const persist = (next: AssessmentRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(LS_RECORDS, JSON.stringify(next));
    } catch {}
  };

  /* ---- auth ---- */
  const login = () => {
    const e = emailDraft.trim().toLowerCase();
    const d = divisionDraft.trim();
    if (!e) return setError("กรุณากรอกอีเมล");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setError("รูปแบบอีเมลไม่ถูกต้อง");
    if (!d) return setError("กรุณาเลือกกอง / หน่วยงาน");
    try {
      localStorage.setItem(LS_USER, e);
      localStorage.setItem(LS_DIVISION, d);
    } catch {}
    setEmail(e);
    setDivision(d);
    setError("");
    setSelectedIds([]);
    setShowResult(false);
    setView("app");
  };

  const logout = () => {
    try {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_DIVISION);
    } catch {}
    setEmail("");
    setEmailDraft("");
    setDivision("");
    setDivisionDraft("");
    setSelectedIds([]);
    setShowResult(false);
    setView("login");
  };

  const goAdmin = () => {
    if (isAdmin(email)) setView("admin");
  };

  const clearData = () => {
    if (records.length && !window.confirm("ต้องการล้างข้อมูลการประเมินทั้งหมดหรือไม่? การกระทำนี้ย้อนกลับไม่ได้")) return;
    try {
      localStorage.removeItem(LS_RECORDS);
    } catch {}
    setRecords([]);
  };

  const exportExcel = () => {
    if (!records.length) {
      window.alert("ยังไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const esc = (s: unknown) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const head = ["ลำดับ", "อีเมลผู้ใช้", "กอง / หน่วยงาน", "วันที่/เวลา", "จำนวนช่องโหว่", "ระดับความเสี่ยง", "รายการช่องโหว่"];
    const body = records
      .map((r, i) => {
        const items = (r.selectedIds || []).map((id) => RISK_DATABASE[id]?.title ?? id).join(" · ");
        const cells = [i + 1, r.email, r.division || "-", fmtTime(r.ts), `${r.gaps}/6`, r.scoreLabel, items];
        return "<tr>" + cells.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
      })
      .join("");
    const table =
      '<table border="1"><thead><tr>' +
      head.map((h) => `<th style="background:#2563eb;color:#fff">${esc(h)}</th>`).join("") +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table>";
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>' +
      table +
      "</body></html>";
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const a = document.createElement("a");
    a.href = url;
    a.download = `digital-hygiene-backoffice-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  /* ---- assessment ---- */
  const toggleTask = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    setShowResult(false);
  };

  const runAnalysis = () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const ids = selectedIds;
      const rec: AssessmentRecord = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        email,
        division,
        ts: Date.now(),
        gaps: ids.length,
        scoreLabel: scoreFor(ids.length).label,
        selectedIds: [...ids],
      };
      persist([rec, ...records]);
      setIsAnalyzing(false);
      setShowResult(true);
    }, 800);
  };

  const score = useMemo(() => scoreFor(selectedIds.length), [selectedIds]);

  /* ---- admin derived data ---- */
  const users = useMemo(() => {
    const map: Record<string, { email: string; division: string; count: number; first: number }> = {};
    [...records].reverse().forEach((r) => {
      if (!map[r.email]) map[r.email] = { email: r.email, division: r.division, count: 0, first: r.ts };
      map[r.email].count += 1;
      if (r.ts < map[r.email].first) map[r.email].first = r.ts;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [records]);

  const critical = records.filter((r) => r.scoreLabel === "วิกฤต").length;
  const avgGaps = records.length ? (records.reduce((a, r) => a + r.gaps, 0) / records.length).toFixed(1) : "0";

  const admin = isAdmin(email);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-lg">🛡</div>
            <span className="font-extrabold text-lg tracking-tight text-blue-600">DIGITAL HYGIENE</span>
          </div>
          {view !== "login" ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-sm text-slate-500">{email}</span>
              <button
                onClick={() => setView("app")}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition ${
                  view === "app" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                แบบประเมิน
              </button>
              {admin && (
                <button
                  onClick={goAdmin}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition ${
                    view === "admin" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  ระบบหลังบ้าน
                </button>
              )}
              <button onClick={logout} className="px-3.5 py-2 rounded-lg text-sm font-semibold border border-red-100 bg-white text-red-600">
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest">
              Safety First
            </span>
          )}
        </div>
      </nav>

      {/* ============ LOGIN ============ */}
      {view === "login" && (
        <main className="max-w-md mx-auto px-5 pt-16 pb-10">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-9">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">🔐</div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-5 mb-2">เข้าสู่ระบบ</h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-7">
                กรอกอีเมลของคุณเพื่อเริ่มการประเมินสุขอนามัยดิจิทัล และบันทึกผลลัพธ์เข้าสู่ระบบ
              </p>

              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">อีเมล</label>
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => {
                  setEmailDraft(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && login()}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 text-[15px] rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 outline-none focus:border-blue-400"
              />

              <label className="block text-xs font-bold text-slate-600 mt-4 mb-2 uppercase tracking-wider">กอง / หน่วยงาน</label>
              <select
                value={divisionDraft}
                onChange={(e) => {
                  setDivisionDraft(e.target.value);
                  setError("");
                }}
                className={`w-full px-4 py-3.5 text-[15px] rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 outline-none focus:border-blue-400 ${
                  divisionDraft ? "text-slate-900" : "text-slate-400"
                }`}
              >
                <option value="">— เลือกกอง —</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d} className="text-slate-900">
                    {d}
                  </option>
                ))}
              </select>

              {error && <p className="text-red-600 text-sm mt-2.5 font-medium">{error}</p>}

              <button
                onClick={login}
                className="w-full mt-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 transition"
              >
                เข้าสู่ระบบ →
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ============ APP ============ */}
      {view === "app" && (
        <main className="max-w-4xl mx-auto px-5 py-14">
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
              ล้างเครื่องให้ใส <span className="text-blue-600">ใส่ใจภูมิคุ้มกันดิจิทัล</span>
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
              วิเคราะห์ช่องโหว่และความเสี่ยงทางไซเบอร์ส่วนบุคคล ผ่านคู่มือรณรงค์กิจกรรมสุขอนามัยดิจิทัลยุคใหม่
            </p>
          </section>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-9">
              <div className="mb-7">
                <h2 className="text-xl font-bold text-slate-800 mb-1.5">📋 รายการตรวจสอบ (Risk Checklist)</h2>
                <p className="text-sm text-slate-500">
                  เลือกกิจกรรมที่คุณ <span className="text-red-500 font-bold">&quot;ยังไม่ได้ทำ&quot;</span> เพื่อให้ระบบประเมินผลกระทบที่อาจเกิดขึ้น
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-9">
                {TASK_LIST.map((task) => {
                  const sel = selectedIds.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-center text-left p-4 rounded-2xl border-2 transition ${
                        sel ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-3.5 shrink-0 transition ${
                          sel ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                        }`}
                      >
                        {sel && <span className="text-white text-xs">✔</span>}
                      </div>
                      <span className={`text-sm font-medium ${sel ? "text-blue-900" : "text-slate-600"}`}>{task.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition text-white font-bold rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                {isAnalyzing ? "กำลังประมวลผลความเสี่ยง…" : "✨ เริ่มการวิเคราะห์ทันที"}
              </button>
            </div>

            {showResult && (
              <div className={`border-t border-slate-100 p-9 ${score.bg}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-7 pb-6 border-b border-slate-200/60">
                  <div>
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1.5">ผลการประเมินโดยรวม</h3>
                    <div className={`text-3xl font-extrabold ${score.text}`}>{score.label}</div>
                  </div>
                  <div className="mt-4 md:mt-0 text-sm text-slate-600 md:text-right">
                    พบช่องโหว่สะสม <span className="font-bold text-slate-900">{selectedIds.length}</span> จาก 6 มาตรการหลัก
                  </div>
                </div>

                {selectedIds.length === 0 ? (
                  <div className="text-center py-9">
                    <span className="text-5xl mb-3.5 block">🎉</span>
                    <p className="text-slate-700 font-bold text-lg">ยอดเยี่ยม! คุณมีสุขอนามัยดิจิทัลที่ดีเยี่ยม</p>
                    <p className="text-slate-500 text-sm mt-1.5">ไม่มีความเสี่ยงที่น่ากังวลในขณะนี้ ขอให้รักษามาตรฐานนี้ไว้ครับ</p>
                  </div>
                ) : (
                  <div className="space-y-4.5 flex flex-col gap-4.5">
                    {selectedIds.map((id) => {
                      const data = RISK_DATABASE[id];
                      return (
                        <div key={id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 animate-hgFade">
                          <div className="flex items-center justify-between mb-3.5">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tight">
                              {data.category}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${severityBadge(data.severity)}`}>
                              ความเสี่ยง{data.severity}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 mb-4 text-lg leading-snug">{data.title}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[13px]">
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                              <p className="text-red-600 font-bold mb-1.5">💥 ผลกระทบที่อาจเกิด</p>
                              <p className="text-slate-600 leading-relaxed">{data.impact}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                              <p className="text-blue-700 font-bold mb-1.5">✅ แนวทางแก้ไข (Action)</p>
                              <p className="text-blue-900 leading-relaxed">{data.action}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-center">
            {[
              { icon: "🧹", title: "Clean Up", body: "ลบข้อมูลขยะและแอปพลิเคชันที่ไม่ได้ใช้งาน เพื่อความเร็วและความปลอดภัย" },
              { icon: "🔐", title: "Safety First", body: "ตั้งค่ารหัสผ่านที่ซับซ้อน เปิด MFA และระบบติดตามอุปกรณ์ให้พร้อมใช้งาน" },
              { icon: "☁️", title: "Always Backup", body: "สำรองข้อมูลสำคัญสม่ำเสมอ ทั้งบนระบบคลาวด์และอุปกรณ์จัดเก็บข้อมูลส่วนตัว" },
            ].map((c) => (
              <div key={c.title} className="p-5">
                <div className="text-3xl mb-3.5">{c.icon}</div>
                <h5 className="font-bold text-slate-900 mb-2">{c.title}</h5>
                <p className="text-[13px] text-slate-500 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </section>

          <footer className="py-12 mt-6 border-t border-slate-200 text-center">
            <p className="text-slate-400 text-sm">© Digital Hygiene &amp; Safety First Initiative</p>
            <p className="text-slate-300 text-[11px] mt-1.5">Digital wellness self-assessment for cyber awareness</p>
          </footer>
        </main>
      )}

      {/* ============ ADMIN / BACK OFFICE ============ */}
      {view === "admin" && admin && (
        <main className="max-w-4xl mx-auto px-5 pt-11 pb-10">
          <div className="flex flex-wrap gap-4 items-end justify-between mb-7">
            <div>
              <div className="inline-block text-[11px] font-extrabold tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                ADMIN · BACK OFFICE
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-2.5 mb-1">ระบบหลังบ้าน</h1>
              <p className="text-slate-500 text-sm">ภาพรวมผู้ใช้งานและผลการประเมินความเสี่ยงที่บันทึกไว้ในระบบ</p>
            </div>
            <div className="flex gap-2.5 flex-wrap">
              <button
                onClick={exportExcel}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] shadow-lg shadow-blue-200 transition"
              >
                ⬇ Export Excel
              </button>
              <button
                onClick={clearData}
                className="px-4 py-2.5 rounded-2xl border border-red-200 bg-white text-red-600 font-semibold text-[13px]"
              >
                ล้างข้อมูลทั้งหมด
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "ผู้ใช้งาน", value: String(users.length), cls: "text-blue-600" },
              { label: "การประเมิน", value: String(records.length), cls: "text-slate-900" },
              { label: "ระดับวิกฤต", value: String(critical), cls: critical ? "text-red-600" : "text-slate-900" },
              { label: "ช่องโหว่เฉลี่ย", value: avgGaps, cls: "text-slate-900" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">{s.label}</div>
                <div className={`text-3xl font-extrabold ${s.cls}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Submissions */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-slate-800">บันทึกการประเมิน (Submissions)</h2>
              <span className="text-sm text-slate-400">{records.length} รายการ</span>
            </div>

            {records.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      <th className="px-5 py-3">อีเมลผู้ใช้</th>
                      <th className="px-5 py-3">กอง / หน่วยงาน</th>
                      <th className="px-5 py-3">เวลา</th>
                      <th className="px-5 py-3">ช่องโหว่</th>
                      <th className="px-5 py-3">ระดับความเสี่ยง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{r.email}</td>
                        <td className="px-5 py-3.5 text-slate-600 text-[13px]">{r.division || "-"}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-[13px]">{fmtTime(r.ts)}</td>
                        <td className="px-5 py-3.5 text-slate-700 font-semibold">
                          {r.gaps}
                          <span className="text-slate-400">/6</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${scorePill(r.scoreLabel)}`}>
                            {r.scoreLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-14 px-5">
                <div className="text-4xl mb-3">🗂️</div>
                <p className="text-slate-700 font-semibold">ยังไม่มีข้อมูลการประเมิน</p>
                <p className="text-slate-400 text-[13px] mt-1.5">
                  เมื่อผู้ใช้เข้าประเมินและกด &quot;เริ่มการวิเคราะห์&quot; ผลลัพธ์จะปรากฏที่นี่
                </p>
              </div>
            )}
          </div>

          {/* Users */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mt-6">
            <div className="px-7 py-6 border-b border-slate-100">
              <h2 className="text-[17px] font-bold text-slate-800">ผู้ใช้งานในระบบ (Users)</h2>
            </div>
            {users.length ? (
              <div className="p-4">
                {users.map((u) => (
                  <div key={u.email} className="flex items-center justify-between gap-3 px-3 py-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[15px] shrink-0">
                        {(u.email[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{u.email}</div>
                        <div className="text-xs text-slate-400">
                          {u.division || "-"} · เข้าใช้ครั้งแรก {fmtDate(u.first)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-bold text-slate-700">{u.count} ครั้ง</div>
                      <div className="text-[11px] text-slate-400">ประเมิน</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีผู้ใช้งาน</div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
