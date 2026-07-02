# Digital Hygiene — Next.js

แอปประเมินสุขอนามัยดิจิทัล (Security Checklist) พร้อมระบบ Login, ระบบหลังบ้าน (Admin) และ Export Excel

## รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## โครงสร้าง

- `app/layout.tsx` — โครง HTML + ฟอนต์ IBM Plex Sans Thai
- `app/page.tsx` — หน้าแรก
- `components/DigitalHygieneApp.tsx` — ทั้งแอป (login, แบบประเมิน, ระบบหลังบ้าน)
- `app/globals.css` — Tailwind + keyframes

## หมายเหตุ

- ข้อมูลถูกเก็บใน **localStorage** ของเบราว์เซอร์ (เป็น demo ไม่มี backend จริง)
- บัญชีแอดมิน: แก้ไขได้ที่ตัวแปร `ADMIN_EMAILS` ใน `components/DigitalHygieneApp.tsx` (ปัจจุบันคือ `kornwalairathwork@gmail.com`)
- รายชื่อกอง: แก้ไขที่ตัวแปร `DIVISIONS`
- หากต้องการเก็บข้อมูลรวมศูนย์จริง แนะนำเปลี่ยน localStorage เป็น API + ฐานข้อมูล (เช่น Next.js Route Handlers + Postgres/Prisma) และย้ายการตรวจสิทธิ์แอดมินไปฝั่ง server

## Build

```bash
npm run build && npm start
```
