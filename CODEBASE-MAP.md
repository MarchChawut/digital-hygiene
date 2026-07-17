# CODEBASE-MAP

แผนที่โครงสร้างโค้ดของโปรเจกต์ **digital-hygiene** — แอปประเมิน "สุขอนามัยดิจิทัล"
(Digital Hygiene / Security Checklist) สำหรับให้ผู้ใช้ในองค์กรตรวจสอบความเสี่ยงทางไซเบอร์ส่วนบุคคล

---

## ภาพรวม (Overview)

| หัวข้อ | รายละเอียด |
| --- | --- |
| Framework | **Next.js 16.2.x** (App Router) |
| UI | **React 19** + **shadcn/ui** (Dialog/Select = Radix, ที่เหลือ = Base UI) |
| Styling | **Tailwind CSS v4** (CSS-first, `app/globals.css`) — self-hosted ฟอนต์ผ่าน `next/font` |
| ภาษา | **TypeScript** (strict) |
| Auth | **Auth.js v5 (NextAuth)** + **Google OAuth** + **Resend (email magic-link "Guest")** + Prisma adapter (**database sessions**, 1 ชม. idle expiry) |
| Data | **MariaDB 10** DB ชื่อ `digital-hygiene` ผ่าน **Prisma 7** + driver adapter `@prisma/adapter-mariadb` |
| Server logic | **Server Actions** (`app/actions.ts`) — ดึง identity จาก session |
| Data retention | ลบ `AssessmentRecord`/`SurveyResponse` อายุเกิน 30 วันอัตโนมัติทุกวัน (`src/instrumentation.ts` + `retention.service.ts`) |
| Package manager | **pnpm** |

แอปเป็น **full-stack**: ล็อกอินด้วย **Google** หรือ **Guest (ยืนยันตัวตนผ่านลิงก์ในอีเมล ส่งด้วย Resend)**
→ เลือกกอง/หน่วยงานครั้งเดียว → เข้าหน้าหลัก `app/page.tsx` (server) เรียก `auth()` แล้วส่ง session +
checklist items + survey questions ให้ client component ซึ่งเรียก Server Actions อ่าน/เขียนข้อมูลลง
MariaDB — **ไม่มีการเก็บ session ใน localStorage** (อยู่ใน DB/cookie ของ Auth.js) ข้อมูลที่บันทึก
(ผลประเมิน + แบบสำรวจ) **ถูกลบอัตโนมัติหลัง 30 วัน** และมีหน้า `/privacy` + `/deletion-instructions`
สาธารณะสำหรับนโยบายความเป็นส่วนตัว/คำขอลบข้อมูล

---

## โครงสร้างไฟล์ (File Structure)

```
nextjs-digital-hygiene/
├── src/                    # ⭐ โค้ดทั้งหมดอยู่ใต้ src/ (alias @/* → ./src/*)
│   ├── auth.ts             # Auth.js v5 — NextAuth(PrismaAdapter, database sessions, 1hr idle expiry) + session callback
│   ├── auth.config.ts      # ⭐ edge-safe: Google + Resend (Guest) providers, sign-in gate, error page → "/"
│   ├── instrumentation.ts  # ⭐ Next.js boot hook — schedule daily retention cleanup sweep (nodejs runtime only)
│   ├── app/
│   │   ├── layout.tsx      # Root layout — <html lang="th">, ฟอนต์ IBM Plex Sans Thai/Sans self-hosted ผ่าน next/font, <Toaster/>
│   │   ├── loading.tsx     # route-level loading state สำหรับ "/"
│   │   ├── page.tsx        # server component: auth() + listItems() + survey/retention state → ส่งให้ client
│   │   ├── privacy/page.tsx              # ⭐ หน้านโยบายความเป็นส่วนตัว (public, สำหรับ Facebook/แนวทาง compliance)
│   │   ├── deletion-instructions/page.tsx # ⭐ หน้าวิธีขอลบข้อมูล (public)
│   │   ├── admin/
│   │   │   ├── page.tsx    # ⭐ /admin — server guard: redirect ถ้าไม่ใช่ admin, โหลด records+survey+checklist แล้ว render AdminDashboard
│   │   │   └── loading.tsx # route-level loading state สำหรับ /admin
│   │   ├── actions.ts      # Server Actions (thin): setDivision / createRecord / clearRecords / retention / survey / checklist CRUD → เรียก services
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   └── globals.css     # Tailwind v4 (@import) + shadcn tokens (@theme) + hgFade + font-sans
│   ├── components/
│   │   ├── DigitalHygieneApp.tsx  # UI หน้าหลัก ("use client") — Google/Guest sign-in / division gate / แบบประเมิน (group-level checking)
│   │   ├── AdminDashboard.tsx     # UI หลังบ้าน ("use client") — records (แบ่งหน้า) + survey/checklist admin + retention sweep ปุ่ม manual
│   │   ├── ChecklistAdmin.tsx     # ⭐ CRUD รายการเช็คลิสต์ (26 ข้อ, มีฟิลด์ guide) — mount อยู่ใน AdminDashboard
│   │   ├── SurveyAdmin.tsx        # CRUD คำถามแบบสำรวจ (mount อยู่ใน AdminDashboard)
│   │   ├── SatisfactionSurveyDialog.tsx  # modal แบบสำรวจความพึงพอใจฝั่งผู้ใช้ (code-split, dynamic import)
│   │   ├── DataRetentionNoticeDialog.tsx # ⭐ modal แจ้งเตือนครั้งเดียวหลังล็อกอิน: ข้อมูลเก็บ 30 วันแล้วลบ (code-split)
│   │   ├── TopBar.tsx / BottomNav.tsx  # nav ที่แชร์กัน (BottomNav = แถบล่าง mobile, admin เท่านั้น)
│   │   └── ui/             # shadcn/ui components — dialog.tsx/select.tsx ใช้ Radix, ไฟล์อื่นใช้ Base UI
│   ├── models/             # ⭐ domain types/data — client-safe (ห้าม import server-only/prisma)
│   │   ├── assessment.ts   # AssessmentRecord, CreateRecordInput
│   │   ├── session.ts      # SessionUser
│   │   ├── division.ts     # DIVISIONS, Division
│   │   ├── activity-group.ts   # ACTIVITY_GROUPS (4 หมวดสี: cleanup/security/footprint/backup)
│   │   ├── risk.ts         # ChecklistItem (มี groupId + guide ต่อ item), ChecklistItemInput — ⭐ admin-editable ผ่าน checklist.service
│   │   └── survey.ts       # SurveyQuestion, SurveyQuestionType, SurveyAnswers
│   ├── services/           # ⭐ server-only business logic (prisma + models)
│   │   ├── record.service.ts   # listRecords / createRecord / clearAllRecords (+ row→model mapping)
│   │   ├── user.service.ts     # ⭐ updateUserDivision / hasSeenRetentionNotice / acknowledgeRetentionNotice
│   │   ├── survey.service.ts   # listQuestions (self-seed 5 คำถาม) / create,update,deleteQuestion / createResponse / hasResponded
│   │   ├── checklist.service.ts # ⭐ listItems (self-seed 26 รายการเริ่มต้น, 4 หมวด) / create,update,deleteItem
│   │   ├── retention.service.ts # ⭐ runRetentionCleanup — ลบ AssessmentRecord/SurveyResponse เก่ากว่า 30 วัน + VerificationToken หมดอายุ
│   │   └── auth.service.ts     # isAdmin / ADMIN_EMAILS (pure — ห้าม import @/auth)
│   ├── lib/
│   │   ├── prisma.ts       # ⭐ PrismaClient singleton + MariaDB adapter (connectTimeout/acquireTimeout ขยายไว้ รองรับ latency ผ่าน Tailscale)
│   │   ├── format.ts       # scoreFor(percent) — 0-100% safety bands / fmtTime / fmtDate / severityBadge / scorePill (client-safe)
│   │   ├── theme.ts        # GROUP_THEME — ไอคอน+สีต่อหมวด (client-safe presentation helper)
│   │   ├── utils.ts        # cn() (shadcn)
│   │   └── generated/prisma/   # Prisma Client ที่ generate (gitignored)
│   └── types/next-auth.d.ts    # augment Session.user (division, isAdmin, id)
├── prisma/
│   ├── schema.prisma       # User(+division,+retentionNoticeAcknowledgedAt)/Account/Session/VerificationToken +
│   │                       # AssessmentRecord + SurveyQuestion + SurveyResponse + ChecklistItem(+guide) (provider = mysql)
│   └── migrations/         # SQL migrations
├── prisma.config.ts        # Prisma 7 config — โหลด DATABASE_URL ผ่าน dotenv
├── components.json         # config ของ shadcn/ui
├── .env / .env.example     # DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAILS (.env ไม่ commit)
├── next.config.js          # reactStrictMode + outputFileTracingRoot
├── postcss.config.js       # @tailwindcss/postcss
└── tsconfig.json           # strict, path alias "@/*" → ./src/*
```

## Layered architecture (การแบ่งเลเยอร์)

`models → services → app(actions/routes) → components`

- **`src/models/`** — โครงสร้างข้อมูล + ค่าคงที่ **client-safe** (types, DIVISIONS, ChecklistItem) ห้าม import
  `server-only`/prisma (ไม่งั้น bundle ฝั่ง client จะพัง)
- **`src/services/`** — logic + การคุยกับ DB (**server-only**) รับ args ชัดเจน คืน model types
- **`src/app/actions.ts` + `src/app/admin/page.tsx`** — เลเยอร์ที่ resolve session (`auth()`) + ตรวจสิทธิ์
  แล้ว delegate ไป services
- **กฎกันวน (no import cycle):** ไฟล์ที่ `src/auth.ts` import ห้าม import `@/auth` → `auth.service.ts` เป็น
  pure (isAdmin/ADMIN_EMAILS), ส่วนการ resolve session อยู่ในเลเยอร์ actions/route เท่านั้น

---

## Data layer (Prisma 7 + MariaDB)

**โมเดล** `prisma/schema.prisma`:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? // ตั้งโดย adapter เมื่อ Guest (Resend magic-link) ยืนยันสำเร็จ; Google ไม่ตั้งค่านี้
  image         String?
  division      String?   // เลือกครั้งเดียวหลังล็อกอินครั้งแรก
  retentionNoticeAcknowledgedAt DateTime? // ⭐ ตั้งเมื่อผู้ใช้กด "รับทราบ" ใน DataRetentionNoticeDialog
  accounts      Account[]
  sessions      Session[]
}

model AssessmentRecord {
  id          String   @id @default(cuid())
  email       String
  division    String
  gaps        Int
  scoreLabel  String
  selectedIds Json      // MySQL/MariaDB ไม่มี scalar list → เก็บเป็น JSON
  createdAt   DateTime @default(now())
  @@index([email]); @@index([createdAt])
}

model SurveyQuestion {
  id        String   @id @default(cuid())
  order     Int      @default(0)
  text      String
  type      String   // "rating" | "text"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([order])
}

model SurveyResponse {
  id        String   @id @default(cuid())
  email     String
  answers   Json      // questionId -> คำตอบ (number สำหรับ rating, string สำหรับ text)
  createdAt DateTime @default(now())
  @@index([email]); @@index([createdAt])
}

model ChecklistItem {
  id        String   @id @default(cuid())
  order     Int      @default(0)
  groupId   String   // อ้างถึง ACTIVITY_GROUPS.id (cleanup/security/footprint/backup)
  category  String
  title     String   // checkbox label + result-card headline
  severity  String   // "ปานกลาง" | "สูง" | "วิกฤต"
  impact    String   @db.Text
  action    String   @db.Text
  guide     String   @default("") @db.Text  // ⭐ ขั้นตอนทำจริง admin กรอกได้ ผู้ใช้เปิดดูผ่าน "เปิดคู่มือ"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([order]); @@index([groupId])
}
```

- **provider = `mysql`** — MariaDB ใช้ตัวเชื่อมต่อเดียวกับ MySQL
- Prisma 7 ใช้ query compiler + **driver adapter** → `src/lib/prisma.ts` สร้าง `PrismaClient({ adapter: new PrismaMariaDb(...) })` แบบ singleton (กัน connection รั่วตอน hot-reload) พร้อม `connectTimeout`/`acquireTimeout` ที่ขยายไว้ เพราะ DB dev เข้าถึงผ่าน Tailscale VPN hop ที่บางครั้ง latency สูง (เคยถูกรายงานผิดเป็น "session expired")
- Prisma Client generate ไปที่ `src/lib/generated/prisma` (gitignored, output ตั้งใน `schema.prisma`) — รันใหม่ด้วย `pnpm dlx prisma generate`

**สคีมา** มีทั้งโมเดล Auth.js (`User`, `Account`, `Session`, `VerificationToken` — จำเป็นสำหรับทั้ง Google
OAuth และ Resend magic-link) และโมเดลโดเมนด้านบน

**Services** (`src/services/*`) ทำ DB จริง; **Server Actions** `src/app/actions.ts` เป็น wrapper บาง ๆ ที่
**ดึง identity จาก `auth()` เสมอ** (ไม่รับ email/division จาก client, มี retry 1 ครั้งถ้า `auth()` throw —
สัญญาณของ DB connection สะดุดชั่วคราว) แล้วเรียก service:

| Action | หน้าที่ | Service |
| --- | --- | --- |
| `setDivision(division)` | บันทึกกองของผู้ใช้ปัจจุบัน (validate กับ `DIVISIONS`); คืน `{ok:false, reason:"unauthenticated"}` แทนการ throw เมื่อ session หมดอายุ | `user.service.updateUserDivision` |
| `createRecord(input)` | บันทึกผลประเมิน (email/division จาก session); คืน error แบบ typed เช่นกัน | `record.service.createRecord` |
| `clearRecords()` | ลบทั้งหมด — **admin เท่านั้น** | `record.service.clearAllRecords` |
| `acknowledgeDataRetentionNotice()` | ⭐ บันทึกว่าผู้ใช้รับทราบ notice การเก็บข้อมูล 30 วันแล้ว | `user.service.acknowledgeRetentionNotice` |
| `runRetentionCleanupNow()` | ⭐ สั่งรัน sweep ลบข้อมูลเก่าทันที — **admin เท่านั้น** (ปกติรันอัตโนมัติทุกวันผ่าน `instrumentation.ts`) | `retention.service.runRetentionCleanup` |
| `submitSurveyResponse(answers)` | บันทึกคำตอบแบบสำรวจของผู้ใช้ปัจจุบัน | `survey.service.createResponse` |
| `adminCreateSurveyQuestion` / `adminUpdateSurveyQuestion` / `adminDeleteSurveyQuestion` | CRUD คำถาม — **admin เท่านั้น** | `survey.service.*` |
| `adminCreateChecklistItem` / `adminUpdateChecklistItem` / `adminDeleteChecklistItem` | CRUD เช็คลิสต์กิจกรรม (`ChecklistAdmin.tsx`) — **admin เท่านั้น** | `checklist.service.*` |

หน้า `/` (server, `app/page.tsx`) โหลด checklist items + (ถ้าล็อกอินแล้ว) survey questions /
`hasResponded` / `hasSeenRetentionNotice` ทั้งหมดแบบขนาน (`Promise.all`) ก่อน render ครั้งแรก — ไม่มี client
`useEffect` fetch หรือ dialog กะพริบหลัง hydrate. หน้า `/admin` (server) โหลด records + survey questions +
checklist items เองผ่าน service ตรง ๆ แล้วส่งเป็น `initialRecords` / `initialSurveyQuestions` /
`initialChecklistItems` ให้ `AdminDashboard`

> **ความปลอดภัย / การจำกัด admin:** อีเมลใน database session ถูกยืนยันจริงเสมอ (Google OAuth verified
> หรือ Guest ผ่านลิงก์ยืนยันที่คลิกแล้วเท่านั้น) การเช็ค admin (`services/auth.service.ts` / `ADMIN_EMAILS`)
> จึงเชื่อถือได้ **หลังบ้านเข้าได้แค่ 2 อีเมล** (`chawut.sa@gmail.com`, `kornwalairathwork@gmail.com`)
> บังคับ 3 จุด: (1) route `/admin` redirect ถ้าไม่ใช่ admin, (2) ลิงก์ไป `/admin` โชว์เฉพาะ admin,
> (3) action ฝั่ง admin (`clearRecords`, `runRetentionCleanupNow`, CRUD ต่าง ๆ) เช็คซ้ำฝั่ง server

### Data retention (การเก็บรักษาและลบข้อมูลอัตโนมัติ)
- **`src/instrumentation.ts`** — Next.js boot hook รันครั้งเดียวตอน long-lived Node server เริ่ม
  (`pnpm start`, ไม่ใช่ serverless) ตั้ง `setInterval` sweep รายวัน (+ รันทันที 1 ครั้งตอน boot) กัน interval
  ซ้ำตอน dev hot-reload ด้วย flag บน `globalThis` (pattern เดียวกับ `lib/prisma.ts`); คุมด้วย
  `NEXT_RUNTIME !== "nodejs"` เพราะไฟล์นี้ถูกโหลดใน edge runtime ด้วยแต่ retention service แตะ Prisma
  (Node-only)
- **`retention.service.ts`** — `runRetentionCleanup(cutoff)` ลบ `AssessmentRecord`/`SurveyResponse` ที่
  `createdAt` เก่ากว่า 30 วัน + `VerificationToken` ที่หมดอายุ (Auth.js ไม่เคยเก็บกวาดเองเมื่อ magic-link
  ไม่ถูกใช้); `cutoff` เป็น parameter (ไม่ hardcode ภายใน) เพื่อให้ทดสอบได้โดยไม่ต้องรอ 30 วันจริง
- ผู้ใช้เห็น **`DataRetentionNoticeDialog`** ครั้งเดียวหลังล็อกอินครั้งแรก (เช็คจาก
  `User.retentionNoticeAcknowledgedAt`) แจ้งว่าข้อมูลเก็บ 30 วันแล้วลบอัตโนมัติ
- Admin กด sweep ด้วยตนเองได้ใน `AdminDashboard` (ปุ่ม → `runRetentionCleanupNow`) สำหรับ operator
  visibility/testing — sweep อัตโนมัติทำงานอยู่แล้วทุกวัน

---

## Auth flow (Auth.js v5)

- **`auth.config.ts`** (edge-safe, ไม่มี Prisma) — 2 providers:
  - **Google** — `allowDangerousEmailAccountLinking: true` เพื่อให้บัญชี Guest ที่เคยยืนยันด้วยอีเมลเดียวกัน
    merge เข้า `User` row เดิมได้เมื่อภายหลังล็อกอินด้วย Google (Google ยืนยันความเป็นเจ้าของอีเมลเองอยู่แล้ว
    จึงไม่ "อันตราย" ในโมเดลภัยคุกคามของแอปนี้); ผ่าน `signIn` callback ที่จำกัดโดเมนตาม
    `ALLOWED_EMAIL_DOMAIN` (เว้นว่าง = ทุกบัญชี — **เฉพาะ Google**, Guest ยกเว้น)
  - **Resend** — ส่ง magic-link ไปยังอีเมลที่กรอก ("Guest" sign-in) ใครก็เข้าได้ด้วยอีเมลจริงที่คลิกยืนยัน
    โดยไม่ผ่าน domain gate
  - `pages: { signIn: "/", error: "/" }` — ส่งกลับหน้าเริ่มต้นของแอปเองแทนหน้า `/api/auth/error` เดิมของ
    Auth.js (ซึ่งไม่ recover เมื่อ refresh)
- **`auth.ts`** → `NextAuth({ adapter: PrismaAdapter(prisma), session:{strategy:"database", maxAge:1hr,
  updateAge:5min} })` — idle session หมดอายุใน 1 ชม. กัน stale tab/cookie ค้างเป็น logged-in เงียบ ๆ (ต้อง
  ล็อกอินใหม่ด้วย Google หรือ Guest); `session` callback แนบ `user.division` และ `user.isAdmin`; export
  `handlers/auth/signIn/signOut`
- `app/api/auth/[...nextauth]/route.ts` → route handler; `types/next-auth.d.ts` → augment ชนิดของ session
- env: `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXTAUTH_URL=http://localhost:3003`
  (redirect URI: `http://localhost:3003/api/auth/callback/google`)

## UI layer

**สี่หน้า/route:**
- **`/` → `DigitalHygieneApp.tsx`** — รับ `user`, `checklistItems`, `initialSurveyQuestions`,
  `initialAlreadyResponded`, `initialShowRetentionNotice` จาก `app/page.tsx` (server) render 1 ใน 3 สถานะ:
  1. **ยังไม่ล็อกอิน** → ปุ่ม **"เข้าสู่ระบบด้วย Google"** (`signIn("google")`) หรือกรอกอีเมลแล้วกด
     **"เข้าสู่ระบบด้วยอีเมล (Guest)"** (`signIn("resend", { email, redirect:false })` → แสดงสถานะ "ส่งลิงก์แล้ว")
  2. **ล็อกอินแล้วแต่ยังไม่เลือกกอง** (`division == null`) → **division gate**: `Select` → `setDivision()` → `router.refresh()`
  3. **แบบประเมิน** → checklist จัดเป็น **4 หมวดสี** ตาม `ACTIVITY_GROUPS` (cleanup/security/footprint/backup,
     ดู `lib/theme.ts`); **การติ๊กเป็นระดับหมวด** (checkbox เดียวต่อหมวด ไม่ใช่รายข้อ — รายการย่อยใน
     accordion เป็นข้อมูลอ้างอิง/guide เท่านั้น) แต้ม 100 คะแนนแบ่งเท่ากันตามจำนวนหมวดที่มีรายการ
     (`groupsWithItems`), ติ๊กครบหมวด = ได้เต็มคะแนนหมวดนั้น (`scoreFor(percent)` ใน `lib/format.ts`) →
     `createRecord` (เก็บ `gaps`/`selectedIds` = รายการในหมวดที่ยังไม่ติ๊ก ความหมายเดิมคงไว้) → ผลลัพธ์แสดงใน
     **`Dialog` (modal)** → ปุ่ม "ถัดไป: แบบสำรวจความพึงพอใจ" เปิด **`SatisfactionSurveyDialog`** ต่อทันที
     (เว้นแต่เคยตอบไปแล้ว); admin เห็นลิงก์ไป `/admin` (TopBar + BottomNav); แต่ละรายการมีปุ่ม "เปิดคู่มือ"
     เปิด `Dialog` แสดง `ChecklistItem.guide` (ถ้า admin กรอกไว้)
  - **`DataRetentionNoticeDialog`** (code-split, dynamic import) แสดงครั้งเดียวหลังล็อกอินถ้ายังไม่เคย
    รับทราบ (`initialShowRetentionNotice`)
- **`/privacy` → `privacy/page.tsx`** — หน้านโยบายความเป็นส่วนตัว (public, server component) — ข้อมูลที่
  เก็บ, ระยะเวลาเก็บ (30 วัน), ช่องทางขอลบข้อมูล
- **`/deletion-instructions` → `deletion-instructions/page.tsx`** — หน้าวิธีขอลบข้อมูลผู้ใช้ (public,
  สำหรับ Facebook App Review / นโยบายทั่วไป) ลิงก์กลับไป `/privacy`
- **`/admin` → `AdminDashboard.tsx`** — server page `admin/page.tsx` ตรวจสิทธิ์ก่อน แล้วส่ง `initialRecords`
  + `initialSurveyQuestions` + `initialChecklistItems` ให้ client render สถิติ + `Table` (**แบ่งหน้า/pagination**
  ฝั่ง client) + Export Excel + ล้างข้อมูล (`AlertDialog`) + ปุ่มรัน retention sweep ด้วยตนเอง + ส่วน
  **`SurveyAdmin`** (CRUD คำถามแบบสำรวจ) + **`ChecklistAdmin`** (CRUD รายการเช็คลิสต์ 26 ข้อ รวมฟิลด์ guide)
  — เพิ่ม/แก้ไขผ่าน `Dialog` form, ลบผ่าน `AlertDialog`

`TopBar` / `BottomNav` เป็น component แชร์ (`BottomNav` = แถบล่างบนมือถือ, โชว์เฉพาะ admin เพื่อสลับ `/`↔`/admin`)

### แบบสำรวจความพึงพอใจ (Satisfaction Survey)
- คำถาม admin แก้ไขได้ (`SurveyQuestion.type` = `"rating"` 1-5 หรือ `"text"` อิสระ) — `survey.service.listQuestions()`
  **self-seed** คำถามเริ่มต้น 5 ข้ออัตโนมัติถ้าตารางว่าง (ไม่ต้องรัน seed script แยก)
- ผู้ใช้ตอบผ่าน `SatisfactionSurveyDialog` — ปุ่มส่งจะ enable ก็ต่อเมื่อทุกคำถามประเภท rating ถูกตอบแล้ว
  (คำถามประเภท text เป็นตัวเลือก); คำตอบเก็บเป็น `SurveyResponse.answers` (Json, questionId→ค่า)
- ตอบได้ครั้งเดียวต่อผู้ใช้ในทางปฏิบัติ (ไม่ popup ซ้ำ) — เช็คจาก `hasSubmittedSurvey` (คำนวณตั้งแต่
  server-side ใน `app/page.tsx` แล้ว) ก่อน chain เปิด dialog
- คำตอบแบบสำรวจถูกลบอัตโนมัติพร้อม `AssessmentRecord` เมื่ออายุเกิน 30 วัน (ดู Data retention ด้านบน)

### Config / ค่าคงที่
| ชื่อ | ที่อยู่ |
| --- | --- |
| `DIVISIONS` | `src/models/division.ts` |
| `ACTIVITY_GROUPS` (4 หมวดสี, ไม่แก้ไขได้) | `src/models/activity-group.ts` |
| checklist items (DB-backed, self-seed 26 ข้อ, admin CRUD ผ่าน `ChecklistAdmin.tsx`) | `src/services/checklist.service.ts` |
| format helpers (`scoreFor(percent)` — 0-100% safety bands, `fmtTime`, …) | `src/lib/format.ts` |
| `ADMIN_EMAILS` / `isAdmin` | `src/services/auth.service.ts` + env |
| retention (`RETENTION_DAYS = 30`) | `src/services/retention.service.ts` |

หมวดความเสี่ยงเริ่มต้น (self-seed ตอนตาราง `ChecklistItem` ว่าง): 26 รายการรวม 4 หมวด — Digital Cleanup
(cleanup), Digital Auto Disconnect (security), Digital Footprint Cleanup (footprint), Digital Backup
(backup); 5 รายการแรกยังคง id เดิม (`Disconnect`/`MFA_FindDev`/`Footprint`/`Backup`/`Update`) เพื่อให้
`AssessmentRecord.selectedIds` เก่ายัง resolve เป็นชื่อได้ — ดูรายละเอียดใน `checklist.service.ts`

### Session
จัดการโดย **Auth.js (database sessions, idle expiry 1 ชม.)** — ไม่มี `localStorage`. `app/page.tsx` เรียก
`auth()` ส่ง `SessionUser` ให้ client. กอง/หน่วยงานเก็บที่ `User.division` (เลือกครั้งเดียว). session ที่
พังกลางทาง (เช่น หมดอายุระหว่าง action) จะ **บังคับ sign-out จริง** (`signOut({callbackUrl:"/"})`) แทนแค่
refresh เพื่อให้ผู้ใช้กลับไปหน้าล็อกอินที่ทำงานได้แน่นอน. Feedback ใช้ `AlertDialog` (ยืนยันลบ) + `sonner`
toast (`<Toaster/>` ใน `app/layout.tsx`)

---

## Styling: Tailwind v4 + shadcn tokens

- `app/globals.css` = `@import "tailwindcss"` + tokens จาก shadcn ใน `@theme inline` (สี/ radius) + `:root`/`.dark` CSS variables
- **`--font-sans`** = IBM Plex Sans Thai + IBM Plex Sans, **self-hosted ผ่าน `next/font/google`** (build-time,
  ไม่มี runtime request ไป fonts.googleapis.com) พร้อม size-adjusted fallback ลด layout shift
- animation `hgFade` + `.animate-hgFade` และพื้นหลัง `#f1f5f9` ยังคงอยู่
- `postcss.config.js` ใช้ `@tailwindcss/postcss` (ไม่มี `tailwind.config.js` แล้ว — v4 เป็น CSS-first, ไม่ใช้ autoprefixer)
- gated dialogs (`SatisfactionSurveyDialog`, `DataRetentionNoticeDialog`) **code-split** ด้วย `next/dynamic({ssr:false})`
  ไม่รวมอยู่ใน initial bundle เพราะผู้ใช้ครั้งแรกไม่จำเป็นต้องใช้ JS ของ dialog เหล่านี้ทันที

---

## Setup & Commands

```bash
pnpm install
cp .env.example .env          # DATABASE_URL + AUTH_SECRET + GOOGLE_CLIENT_ID/SECRET + RESEND_API_KEY + EMAIL_FROM + ADMIN_EMAILS
pnpm dlx prisma generate      # สร้าง Prisma Client
pnpm dlx prisma migrate deploy  # สร้างตารางบน MariaDB (หรือ migrate dev ตอน dev)
pnpm dev                      # dev server (Turbopack), http://localhost:3003
```
Google OAuth: สร้าง OAuth client ใน Google Cloud Console, redirect URI = `http://localhost:3003/api/auth/callback/google`
Resend (Guest login): ต้องมี `RESEND_API_KEY` — ถ้ายังไม่มีโดเมนที่ verify แล้ว ใช้ `onboarding@resend.dev`
ได้แต่ส่งได้เฉพาะอีเมลของเจ้าของบัญชี Resend เท่านั้น (สำหรับ local/test)

| คำสั่ง | ทำอะไร |
| --- | --- |
| `pnpm dev` | dev server (Turbopack), พอร์ต **3003** (ตรงกับ Google redirect URI) |
| `pnpm build` | production build (Turbopack) — ดูหมายเหตุ location |
| `pnpm build:webpack` | production build ด้วย Webpack (fallback สำหรับ `~/Downloads`) |
| `pnpm start` | รัน production build, พอร์ต **3006** (ตรงกับ Cloudflare Tunnel ingress ของ Synology host ที่ deploy จริง) |
| `pnpm lint` | ESLint |

### ทดสอบ DB แบบ local (ไม่มี Synology)
```bash
docker run --name dh-maria -e MARIADB_ROOT_PASSWORD=root \
  -e 'MARIADB_DATABASE=digital-hygiene' -p 3307:3306 -d mariadb:10
DATABASE_URL="mysql://root:root@127.0.0.1:3307/digital-hygiene" pnpm dlx prisma migrate dev
```

> **⚠️ location + build:** ถ้าโปรเจกต์อยู่ใน `~/Downloads` (macOS TCC) → `pnpm build` (Turbopack) จะล้มเหลว
> ตอนเก็บ page data เพราะต้อง resolve realpath ผ่านโฟลเดอร์แม่ที่อ่านไม่ได้ วิธีแก้: ย้ายโปรเจกต์ออกจาก
> `~/Downloads` (แนะนำ), ให้ Full Disk Access, หรือใช้ `pnpm build:webpack`
> ส่วน `pnpm dev` และ `prisma generate` ทำงานได้ปกติ
