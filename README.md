# Digital Hygiene — Next.js

แอปประเมินสุขอนามัยดิจิทัล (Security Checklist) พร้อม **Login ด้วย Google**, ระบบหลังบ้าน (Admin) และ Export Excel

Stack: **Next.js 16 (App Router) · React 19 · shadcn/ui · Tailwind CSS v4 · Auth.js v5 (Google) · Prisma 7 · MariaDB 10**

## รันโปรเจกต์

```bash
pnpm install
cp .env.example .env            # ตั้งค่า DB + Google OAuth (ดูด้านล่าง)
pnpm dlx prisma generate        # สร้าง Prisma Client
pnpm dlx prisma migrate deploy  # สร้างตารางบน MariaDB
pnpm dev                        # http://localhost:3003
```

เปิด http://localhost:3003 (พอร์ตถูกตั้งไว้ที่ **3003** ให้ตรงกับ Google redirect URI)

### 1) ฐานข้อมูล (MariaDB — DB ชื่อ `digital-hygiene`)

ตั้งค่า `DATABASE_URL` ใน `.env` (MariaDB ใช้ scheme `mysql://`; ชื่อ DB มีขีดกลาง):

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3307/digital-hygiene"
```

สร้าง database `digital-hygiene` + user บน MariaDB 10, เปิดพอร์ต และอนุญาตให้ user เชื่อมต่อจากเครื่องที่รันแอป
แล้วรัน `pnpm dlx prisma migrate deploy` เพื่อสร้างตาราง

ทดสอบแบบ local ด้วย Docker:
```bash
docker run --name dh-maria -e MARIADB_ROOT_PASSWORD=root \
  -e 'MARIADB_DATABASE=digital-hygiene' -p 3307:3306 -d mariadb:10
DATABASE_URL="mysql://root:root@127.0.0.1:3307/digital-hygiene" pnpm dlx prisma migrate dev
```

### 2) Google OAuth (Auth.js v5)

สร้าง OAuth client (ประเภท "Web application") ใน Google Cloud Console → APIs & Services → Credentials
โดยตั้ง **Authorized redirect URI** = `http://localhost:3003/api/auth/callback/google` แล้วใส่ค่าใน `.env`:

```
AUTH_SECRET="<openssl rand -base64 33>"
NEXTAUTH_URL="http://localhost:3003"
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"
# ไม่บังคับ: จำกัดเฉพาะโดเมนองค์กร (เว้นว่าง = ทุก Google account)
# ALLOWED_EMAIL_DOMAIN="thaimooc.ac.th"
ADMIN_EMAILS="admin@example.com"   # อีเมล admin (เทียบกับอีเมล Google ที่ยืนยันแล้ว)
```

ตรวจสอบว่า provider พร้อม: `GET http://localhost:3003/api/auth/providers` ต้องมี `google`

## Flow การใช้งาน

1. เข้าเว็บ → กด **"เข้าสู่ระบบด้วย Google"**
2. ครั้งแรกหลังล็อกอิน → **เลือกกอง/หน่วยงาน** (บันทึกลง `User.division`) ก่อนเข้าหน้าหลัก
3. ทำแบบประเมิน → ผลลัพธ์ถูกบันทึกลง MariaDB; admin ดูรวมทั้งหมด/Export/ล้างข้อมูลได้

## โครงสร้าง

- `auth.ts` / `auth.config.ts` — Auth.js v5 (Google + Prisma adapter, database sessions)
- `app/api/auth/[...nextauth]/route.ts` — auth route handler
- `app/page.tsx` — server component: `auth()` → ส่ง `SessionUser` ให้ client
- `app/actions.ts` — Server Actions (setDivision / createRecord / getRecords / clearRecords) — ดึง identity จาก session
- `components/DigitalHygieneApp.tsx` — UI: sign-in / division gate / แบบประเมิน / ระบบหลังบ้าน (shadcn/ui)
- `lib/prisma.ts`, `lib/auth.ts`, `lib/divisions.ts` — Prisma client, admin check, รายชื่อกอง
- `prisma/schema.prisma` — `User`/`Account`/`Session`/`VerificationToken` + `AssessmentRecord`

ดูรายละเอียดสถาปัตยกรรมทั้งหมดใน [`CODEBASE-MAP.md`](./CODEBASE-MAP.md)

## หมายเหตุ

- **การล็อกอินเป็น Google OAuth จริง** → อีเมลถูกยืนยัน จึงใช้เช็ค admin ฝั่ง server ได้อย่างปลอดภัย
- กอง/หน่วยงานถูกเก็บที่ `User.division` (เลือกครั้งเดียวหลังล็อกอินครั้งแรก)
- บัญชีแอดมิน: แก้ที่ `ADMIN_EMAILS` ใน `.env`
- รายชื่อกอง: แก้ที่ `lib/divisions.ts`

## Build

```bash
pnpm build && pnpm start
```

> หมายเหตุ: หากโปรเจกต์อยู่ใน `~/Downloads` (macOS TCC) ให้ใช้ `pnpm build:webpack` แทน `pnpm build`
