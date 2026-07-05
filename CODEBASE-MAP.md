# CODEBASE-MAP

แผนที่โครงสร้างโค้ดของโปรเจกต์ **digital-hygiene** — แอปประเมิน "สุขอนามัยดิจิทัล"
(Digital Hygiene / Security Checklist) สำหรับให้ผู้ใช้ในองค์กรตรวจสอบความเสี่ยงทางไซเบอร์ส่วนบุคคล

---

## ภาพรวม (Overview)

| หัวข้อ | รายละเอียด |
| --- | --- |
| Framework | **Next.js 16.2.x** (App Router) |
| UI | **React 19** + **shadcn/ui** (Dialog/Select = Radix, ที่เหลือ = Base UI) |
| Styling | **Tailwind CSS v4** (CSS-first, `app/globals.css`) |
| ภาษา | **TypeScript** (strict) |
| Auth | **Auth.js v5 (NextAuth)** + Google OAuth + Prisma adapter (**database sessions**) |
| Data | **MariaDB 10** DB ชื่อ `digital-hygiene` ผ่าน **Prisma 7** + driver adapter `@prisma/adapter-mariadb` |
| Server logic | **Server Actions** (`app/actions.ts`) — ดึง identity จาก session |
| Package manager | **pnpm** |

แอปเป็น **full-stack**: ล็อกอินด้วย **Google** (Auth.js) → เลือกกอง/หน่วยงานครั้งเดียว → เข้าหน้าหลัก
`app/page.tsx` (server) เรียก `auth()` แล้วส่ง session ให้ client component ซึ่งเรียก Server Actions
อ่าน/เขียนข้อมูลลง MariaDB — **ไม่มีการเก็บ session ใน localStorage อีกต่อไป** (ย้ายไป DB/cookie ของ Auth.js)

---

## โครงสร้างไฟล์ (File Structure)

```
nextjs-digital-hygiene/
├── src/                    # ⭐ โค้ดทั้งหมดอยู่ใต้ src/ (alias @/* → ./src/*)
│   ├── auth.ts             # Auth.js v5 — NextAuth(PrismaAdapter, database sessions) + session callback
│   ├── auth.config.ts      # Google provider + signIn domain gate (edge-safe, ไม่มี Prisma)
│   ├── app/
│   │   ├── layout.tsx      # Root layout — <html lang="th">, ฟอนต์ IBM Plex Sans Thai, <Toaster/>
│   │   ├── page.tsx        # server component: auth() → ส่ง SessionUser ให้ client
│   │   ├── admin/page.tsx  # ⭐ /admin — server guard: redirect ถ้าไม่ใช่ admin, โหลด records แล้ว render AdminDashboard
│   │   ├── actions.ts      # Server Actions (thin): setDivision / createRecord / clearRecords → เรียก services
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   └── globals.css     # Tailwind v4 (@import) + shadcn tokens (@theme) + hgFade + font-sans
│   ├── components/
│   │   ├── DigitalHygieneApp.tsx  # UI หน้าหลัก ("use client") — sign-in / division gate / แบบประเมิน
│   │   ├── AdminDashboard.tsx     # UI หลังบ้าน ("use client") — รับ initialRecords + initialSurveyQuestions
│   │   ├── SurveyAdmin.tsx        # ⭐ CRUD คำถามแบบสำรวจ (mount อยู่ใน AdminDashboard)
│   │   ├── SatisfactionSurveyDialog.tsx  # ⭐ modal แบบสำรวจความพึงพอใจฝั่งผู้ใช้
│   │   ├── TopBar.tsx / BottomNav.tsx  # nav ที่แชร์กัน (BottomNav = แถบล่าง mobile, admin เท่านั้น)
│   │   └── ui/             # shadcn/ui components — dialog.tsx/select.tsx ใช้ Radix, ไฟล์อื่นใช้ Base UI
│   ├── models/             # ⭐ domain types/data — client-safe (ห้าม import server-only/prisma)
│   │   ├── assessment.ts   # AssessmentRecord, CreateRecordInput
│   │   ├── session.ts      # SessionUser
│   │   ├── division.ts     # DIVISIONS, Division
│   │   ├── activity-group.ts   # ACTIVITY_GROUPS (4 หมวดสี: cleanup/security/footprint/backup)
│   │   ├── risk.ts         # ChecklistItem (มี groupId ต่อ item), ChecklistItemInput — ⭐ admin-editable ผ่าน checklist.service
│   │   └── survey.ts       # SurveyQuestion, SurveyQuestionType, SurveyAnswers
│   ├── services/           # ⭐ server-only business logic (prisma + models)
│   │   ├── record.service.ts   # listRecords / createRecord / clearAllRecords (+ row→model mapping)
│   │   ├── user.service.ts     # updateUserDivision
│   │   ├── survey.service.ts   # ⭐ listQuestions (self-seed 5 คำถาม) / create,update,deleteQuestion / createResponse / hasResponded
│   │   └── auth.service.ts     # isAdmin / ADMIN_EMAILS (pure — ห้าม import @/auth)
│   ├── lib/
│   │   ├── prisma.ts       # PrismaClient singleton + MariaDB adapter
│   │   ├── format.ts       # scoreFor / fmtTime / fmtDate / severityBadge / scorePill (client-safe)
│   │   ├── theme.ts        # ⭐ GROUP_THEME — ไอคอน+สีต่อหมวด (client-safe presentation helper)
│   │   ├── utils.ts        # cn() (shadcn)
│   │   └── generated/prisma/   # Prisma Client ที่ generate (gitignored)
│   └── types/next-auth.d.ts    # augment Session.user (division, isAdmin, id)
├── prisma/
│   ├── schema.prisma       # User/Account/Session/VerificationToken + AssessmentRecord +
│   │                       # SurveyQuestion + SurveyResponse (provider = mysql)
│   └── migrations/         # SQL migrations
├── prisma.config.ts        # Prisma 7 config — โหลด DATABASE_URL ผ่าน dotenv
├── components.json         # config ของ shadcn/ui
├── .env / .env.example     # DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, ADMIN_EMAILS (.env ไม่ commit)
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
  @@index([email])
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
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([order]); @@index([groupId])
}
```

- **provider = `mysql`** — MariaDB ใช้ตัวเชื่อมต่อเดียวกับ MySQL
- Prisma 7 ใช้ query compiler + **driver adapter** → `src/lib/prisma.ts` สร้าง `PrismaClient({ adapter: new PrismaMariaDb(DATABASE_URL) })` แบบ singleton (กัน connection รั่วตอน hot-reload)
- Prisma Client generate ไปที่ `src/lib/generated/prisma` (gitignored, output ตั้งใน `schema.prisma`) — รันใหม่ด้วย `pnpm dlx prisma generate`

**สคีมา** มีทั้งโมเดล Auth.js (`User` เพิ่มฟิลด์ `division String?`, `Account`, `Session`,
`VerificationToken`) และโมเดลโดเมน `AssessmentRecord` ด้านบน

**Services** (`src/services/*`) ทำ DB จริง; **Server Actions** `src/app/actions.ts` เป็น wrapper บาง ๆ ที่
**ดึง identity จาก `auth()` เสมอ** (ไม่รับ email/division จาก client) แล้วเรียก service:
| Action | หน้าที่ | Service |
| --- | --- | --- |
| `setDivision(division)` | บันทึกกองของผู้ใช้ปัจจุบัน (validate กับ `DIVISIONS`) | `user.service.updateUserDivision` |
| `createRecord(input)` | บันทึกผลประเมิน (email/division จาก session) | `record.service.createRecord` |
| `clearRecords()` | ลบทั้งหมด — **admin เท่านั้น** | `record.service.clearAllRecords` |
| `getSurveyQuestions()` | คืนคำถามแบบสำรวจ (ผู้ใช้ที่ล็อกอินแล้วเรียกได้) | `survey.service.listQuestions` |
| `submitSurveyResponse(answers)` | บันทึกคำตอบแบบสำรวจของผู้ใช้ปัจจุบัน | `survey.service.createResponse` |
| `hasSubmittedSurvey()` | เช็คว่าผู้ใช้เคยตอบแบบสำรวจแล้วหรือยัง | `survey.service.hasResponded` |
| `adminCreateSurveyQuestion` / `adminUpdateSurveyQuestion` / `adminDeleteSurveyQuestion` | CRUD คำถาม — **admin เท่านั้น** | `survey.service.*` |
| `adminCreateChecklistItem` / `adminUpdateChecklistItem` / `adminDeleteChecklistItem` | CRUD เช็คลิสกิจกรรม (`ChecklistAdmin.tsx`) — **admin เท่านั้น** | `checklist.service.*` |

หน้า `/` (server) โหลด checklist items เองผ่าน `checklist.service.listItems()` (ไม่ต้องมี client fetch —
ไม่มี action `getChecklistItems`). หน้า `/admin` (server) โหลด records + survey questions + checklist
items เองผ่าน `record.service.listRecords()` + `survey.service.listQuestions()` +
`checklist.service.listItems()` แล้วส่งเป็น `initialRecords` / `initialSurveyQuestions` /
`initialChecklistItems` ให้ `AdminDashboard` (ไม่ต้องมี action `getRecords`)

> **ความปลอดภัย / การจำกัด admin:** เป็น **Google OAuth จริง** → อีเมลใน session ถูกยืนยัน การเช็ค admin
> (`services/auth.service.ts` / `ADMIN_EMAILS`) จึงเชื่อถือได้ **หลังบ้านเข้าได้แค่ 2 อีเมล**
> (`chawut.sa@gmail.com`, `kornwalairathwork@gmail.com`) บังคับ 3 จุด: (1) route `/admin` redirect ถ้าไม่ใช่ admin,
> (2) ลิงก์ไป `/admin` โชว์เฉพาะ admin, (3) `clearRecords` เช็คซ้ำฝั่ง server

---

## Auth flow (Auth.js v5)

- `auth.config.ts` (edge-safe) → provider Google + `signIn` callback จำกัดโดเมนตาม `ALLOWED_EMAIL_DOMAIN` (เว้นว่าง = ทุกบัญชี)
- `auth.ts` → `NextAuth({ adapter: PrismaAdapter(prisma), session:{strategy:"database"} })` + `session` callback
  แนบ `user.division` และ `user.isAdmin`; export `handlers/auth/signIn/signOut`
- `app/api/auth/[...nextauth]/route.ts` → route handler; `types/next-auth.d.ts` → augment ชนิดของ session
- env: `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `NEXTAUTH_URL=http://localhost:3003`
  (redirect URI: `http://localhost:3003/api/auth/callback/google`)

## UI layer

**สองหน้าแยกเป็นคนละ route:**
- **`/` → `DigitalHygieneApp.tsx`** — รับ prop `user: SessionUser | null` จาก `app/page.tsx` (server) render 1 ใน 3 สถานะ:
  1. **ยังไม่ล็อกอิน** → ปุ่ม **"เข้าสู่ระบบด้วย Google"** (`signIn("google")`)
  2. **ล็อกอินแล้วแต่ยังไม่เลือกกอง** (`division == null`) → **division gate**: `Select` → `setDivision()` → `router.refresh()`
  3. **แบบประเมิน** → checklist จัดเป็น **4 หมวดสี** ตาม `ACTIVITY_GROUPS` (cleanup/security/footprint/backup,
     ดู `lib/theme.ts`); ปุ่ม "เริ่มการวิเคราะห์" **ล็อกไว้จนกว่าจะติ๊กอย่างน้อย 1 ข้อในทุกหมวด** (ดู `groupComplete` /
     `allGroupsComplete` ในไฟล์) → `createRecord` → ผลลัพธ์แสดงใน **`Dialog` (modal)** แทนบล็อก inline เดิม →
     ปุ่ม "ถัดไป: แบบสำรวจความพึงพอใจ" เปิด **`SatisfactionSurveyDialog`** ต่อทันที (เว้นแต่เคยตอบไปแล้ว —
     เช็คจาก `hasSubmittedSurvey()`); admin เห็นลิงก์ไป `/admin` (TopBar + BottomNav)
- **`/admin` → `AdminDashboard.tsx`** — server page `admin/page.tsx` ตรวจสิทธิ์ก่อน แล้วส่ง `initialRecords`
  (จาก `record.service.listRecords()`) + `initialSurveyQuestions` (จาก `survey.service.listQuestions()`)
  ให้ client render สถิติ + `Table` + Export Excel + ล้างข้อมูล (`AlertDialog`) + ส่วน **`SurveyAdmin`**
  (CRUD คำถามแบบสำรวจ — เพิ่ม/แก้ไขผ่าน `Dialog` form, ลบผ่าน `AlertDialog`)

`TopBar` / `BottomNav` เป็น component แชร์ (`BottomNav` = แถบล่างบนมือถือ, โชว์เฉพาะ admin เพื่อสลับ `/`↔`/admin`)

### แบบสำรวจความพึงพอใจ (Satisfaction Survey)
- คำถาม admin แก้ไขได้ (`SurveyQuestion.type` = `"rating"` 1-5 หรือ `"text"` อิสระ) — `survey.service.listQuestions()`
  **self-seed** คำถามเริ่มต้น 5 ข้ออัตโนมัติถ้าตารางว่าง (ไม่ต้องรัน seed script แยก)
- ผู้ใช้ตอบผ่าน `SatisfactionSurveyDialog` — ปุ่มส่งจะ enable ก็ต่อเมื่อทุกคำถามประเภท rating ถูกตอบแล้ว
  (คำถามประเภท text เป็นตัวเลือก); คำตอบเก็บเป็น `SurveyResponse.answers` (Json, questionId→ค่า)
- ตอบได้ครั้งเดียวต่อผู้ใช้ในทางปฏิบัติ (ไม่ popup ซ้ำ) — เช็คจาก `hasSubmittedSurvey()` ก่อน chain เปิด dialog

### Config / ค่าคงที่
| ชื่อ | ที่อยู่ |
| --- | --- |
| `DIVISIONS` | `src/models/division.ts` |
| `ACTIVITY_GROUPS` (4 หมวดสี, ไม่แก้ไขได้) | `src/models/activity-group.ts` |
| checklist items (DB-backed, admin CRUD ผ่าน `ChecklistAdmin.tsx`) | `src/services/checklist.service.ts` |
| format helpers (`scoreFor(percent)` — 0-100% safety bands, `fmtTime`, …) | `src/lib/format.ts` |
| `ADMIN_EMAILS` / `isAdmin` | `src/services/auth.service.ts` + env |

หมวดความเสี่ยง (ค่าเริ่มต้นที่ self-seed ตอนตาราง `ChecklistItem` ว่าง): `Disconnect` · `MFA_FindDev` ·
`Footprint` · `Backup` · `Update` (คงไว้เหมือนเดิม) + 10 รายการใหม่ในหมวด `cleanup` (Digital Cleanup) —
ดูรายละเอียดใน `checklist.service.ts`

### Session
จัดการโดย **Auth.js (database sessions)** — ไม่มี `localStorage`. `app/page.tsx` เรียก `auth()` ส่ง `SessionUser`
ให้ client. กอง/หน่วยงานเก็บที่ `User.division` (เลือกครั้งเดียว). Feedback ใช้ `AlertDialog` (ยืนยันลบ) +
`sonner` toast (`<Toaster/>` ใน `app/layout.tsx`)

---

## Styling: Tailwind v4 + shadcn tokens

- `app/globals.css` = `@import "tailwindcss"` + tokens จาก shadcn ใน `@theme inline` (สี/ radius) + `:root`/`.dark` CSS variables
- **`--font-sans`** ถูกตั้งเป็น IBM Plex Sans Thai (โหลดจาก Google Fonts ใน `layout.tsx`)
- animation `hgFade` + `.animate-hgFade` และพื้นหลัง `#f1f5f9` ยังคงอยู่
- `postcss.config.js` ใช้ `@tailwindcss/postcss` (ไม่มี `tailwind.config.js` แล้ว — v4 เป็น CSS-first, ไม่ใช้ autoprefixer)

---

## Setup & Commands

```bash
pnpm install
cp .env.example .env          # DATABASE_URL + AUTH_SECRET + GOOGLE_CLIENT_ID/SECRET + ADMIN_EMAILS
pnpm dlx prisma generate      # สร้าง Prisma Client
pnpm dlx prisma migrate deploy  # สร้างตารางบน MariaDB (หรือ migrate dev ตอน dev)
pnpm dev                      # dev server (Turbopack), http://localhost:3003
```
Google OAuth: สร้าง OAuth client ใน Google Cloud Console, redirect URI = `http://localhost:3003/api/auth/callback/google`

| คำสั่ง | ทำอะไร |
| --- | --- |
| `pnpm dev` | dev server (Turbopack) |
| `pnpm build` | production build (Turbopack) — ดูหมายเหตุ location |
| `pnpm build:webpack` | production build ด้วย Webpack (fallback สำหรับ `~/Downloads`) |
| `pnpm start` | รัน production build |
| `pnpm lint` | ESLint |

### ทดสอบ DB แบบ local (ไม่มี Synology)
```bash
docker run --name dh-maria -e MARIADB_ROOT_PASSWORD=root \
  -e 'MARIADB_DATABASE=digital-hygiene' -p 3307:3306 -d mariadb:10
DATABASE_URL="mysql://root:root@127.0.0.1:3307/digital-hygiene" pnpm dlx prisma migrate dev
```

> **⚠️ location + build:** โปรเจกต์อยู่ใน `~/Downloads` (macOS TCC) → `pnpm build` (Turbopack) ล้มเหลว
> ตอนเก็บ page data เพราะต้อง resolve realpath ผ่านโฟลเดอร์แม่ที่อ่านไม่ได้ วิธีแก้: ย้ายโปรเจกต์ออกจาก
> `~/Downloads` (แนะนำ), ให้ Full Disk Access, หรือใช้ `pnpm build:webpack`
> ส่วน `pnpm dev` และ `prisma generate` ทำงานได้ปกติ
