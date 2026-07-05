# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm install
cp .env.example .env          # DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, ADMIN_EMAILS
pnpm dlx prisma generate      # generate the Prisma client into lib/generated/prisma
pnpm dlx prisma migrate deploy  # apply migrations to the DB (migrate dev while developing)
pnpm dev            # dev server (Turbopack), http://localhost:3003  (port fixed to match the Google redirect URI)
pnpm build          # production build (Turbopack) — see caveat below
pnpm build:webpack  # production build with Webpack (fallback)
pnpm start          # serve the production build
pnpm lint           # ESLint (eslint .)
```

The DB is **MariaDB `digital-hygiene`** (hyphenated name — needs backticks in raw SQL). There are
**no unit tests**. To verify the DB/auth locally without the Synology host, run a MariaDB 10 container:
```bash
docker run --name dh-maria -e MARIADB_ROOT_PASSWORD=root \
  -e 'MARIADB_DATABASE=digital-hygiene' -p 3307:3306 -d mariadb:10
DATABASE_URL="mysql://root:root@127.0.0.1:3307/digital-hygiene" pnpm dlx prisma migrate dev
```
`prisma generate` writes into `lib/generated/prisma` (gitignored) — regenerate after schema changes.

### Auth (Auth.js v5 / NextAuth) — env required
Login is **Google OAuth**. Needed env vars (see `.env.example`): `AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL="http://localhost:3003"`, optional `ALLOWED_EMAIL_DOMAIN`.
The Google OAuth client's Authorized redirect URI must be `http://localhost:3003/api/auth/callback/google`
(hence `pnpm dev` is pinned to port 3003). Provider is auto-checked at `GET /api/auth/providers`.

### Build caveat (important)
This project currently lives in `~/Downloads`, a macOS TCC-protected folder. `pnpm build`
(Turbopack) fails there during page-data collection because Turbopack resolves realpaths through
the protected parent directory. Workarounds, in order of preference:
1. Move the project out of `~/Downloads` — then `pnpm build` works.
2. Grant the terminal Full Disk Access (System Settings → Privacy & Security).
3. Use `pnpm build:webpack`, which works even inside `~/Downloads`.

`pnpm dev` (Turbopack) works fine regardless of location. `next.config.js` pins
`outputFileTracingRoot` to this project to stop Next from treating `~` as the workspace root
(a stray `~/package-lock.json` otherwise causes that).

## Architecture

**Full-stack** Next.js 16 (App Router) + React 19 + TypeScript, **all code under `src/`** (alias
`@/*` → `./src/*`). UI is **shadcn/ui** on **mixed primitives**: `Dialog` + `Select` are **Radix**
(`@radix-ui/react-dialog`/`-select`, `asChild` composition); the rest (`AlertDialog`, `Checkbox`,
`Accordion`, …) are **Base UI** (`@base-ui/react`, `render` prop, not `asChild`) — check which library
a `ui/*` file imports before assuming its API. Styling is **Tailwind CSS v4** (CSS-first — no
`tailwind.config.js`). Data lives in **MariaDB 10** (DB name `digital-hygiene`) via **Prisma 7** +
`@prisma/adapter-mariadb`.

**Layered:** `models → services → app(actions/routes) → components`.
- `src/models/*` — domain types + constant data (`assessment`, `session`, `division`, `risk`).
  **Client-safe: must not import `server-only`/prisma** (would poison the client bundle at build time).
- `src/services/*` — server-only logic + DB access (`record.service`, `user.service`, `auth.service`),
  explicit args, return model types.
- `src/app/actions.ts` (thin `"use server"` wrappers) + `src/app/admin/page.tsx` resolve the session
  (`auth()`) and authorize, then delegate to services.
- `src/lib/*` — infra: `prisma.ts`, `format.ts` (client-safe presentational helpers), `utils.ts`.

**Auth is real** (Auth.js v5 + Google + Prisma adapter, **database sessions**), so the email is trusted.
Wiring: `src/auth.config.ts` (edge-safe: Google provider + optional domain gate) → `src/auth.ts`
(`PrismaAdapter`, `session.strategy="database"`, session callback attaching `user.division`+`user.isAdmin`)
→ `src/app/api/auth/[...nextauth]/route.ts`. Session types augmented in `src/types/next-auth.d.ts`.

**Two routes:**
- `/` (`src/app/page.tsx`, server) → passes `SessionUser | null` to `DigitalHygieneApp.tsx` → three
  states: not signed in → Google sign-in; `division == null` → division-select gate (`setDivision`); else
  the assessment (`createRecord`).
- `/admin` (`src/app/admin/page.tsx`, server) → **route guard**: `redirect("/")` unless
  `isAdmin(session.email)`; loads records via `record.service.listRecords()` and renders `AdminDashboard`.

**Admin backoffice is restricted to two emails** (`chawut.sa@gmail.com`, `kornwalairathwork@gmail.com` —
`ADMIN_EMAILS` env, with the same pair as the built-in default). Enforced in 3 places: the `/admin` route
redirect, the `/admin` nav link visibility, and admin-only actions (`clearRecords`,
`adminCreateSurveyQuestion`/`adminUpdateSurveyQuestion`/`adminDeleteSurveyQuestion`).

**Checklist grouping + gating:** the 6 `RISK_DATABASE` entries each carry a `groupId` (see
`src/models/activity-group.ts` for the 4 groups: cleanup/security/footprint/backup) rendered as themed
sections in `DigitalHygieneApp.tsx` (colors/icons in `src/lib/theme.ts`). The "เริ่มการวิเคราะห์" button is
disabled until every group has at least one checked item (`groupComplete`/`allGroupsComplete`); the
analysis result renders in a `Dialog` (not inline), chaining into `SatisfactionSurveyDialog` afterward
unless the user already has a `SurveyResponse` (`hasSubmittedSurvey`).

**Satisfaction survey:** `SurveyQuestion` rows are admin-editable (`SurveyAdmin.tsx`, mounted in
`AdminDashboard.tsx`) with a `type` of `"rating"` (1-5) or `"text"`. `survey.service.listQuestions()`
self-seeds 5 defaults the first time the table is empty — no separate seed script.

For a full domain-model + setup reference, see `CODEBASE-MAP.md`.

## Conventions

- **No import cycle:** nothing `src/auth.ts` imports may import `@/auth`. `services/auth.service.ts` is
  pure (`isAdmin`/`ADMIN_EMAILS`, no `@/auth`); session resolution lives only in the actions/route layer.
- `src/services/*`, `src/lib/prisma.ts`, `src/auth.ts` are server-side; never import them from a client
  component. Client code uses `signIn`/`signOut` from `next-auth/react` and imports from `@/models/*` and
  `@/lib/format` (client-safe).
- `src/auth.config.ts` must stay Prisma-free (edge-safe); the adapter is wired only in `src/auth.ts`.
- `src/lib/generated/**` is generated Prisma code — gitignored and excluded from ESLint. `prisma generate`
  output path is set in `prisma/schema.prisma` (`../src/lib/generated/prisma`).
- UI text and domain content are in **Thai**; code identifiers are in English.
- Tailwind is **v4**: styling tokens live in `app/globals.css` (`@theme`), `--font-sans` is IBM Plex
  Sans Thai, and `postcss.config.js` uses `@tailwindcss/postcss`.
- **`Dialog`/`AlertDialog` content never appears in raw SSR HTML (curl)**, even with `open` forced true —
  both Radix (`Dialog`) and Base UI (`AlertDialog`) portal their popups client-side after hydration, so
  they only render in a real browser. To verify modal content, use **headless Chrome**
  (`google-chrome --headless=new --disable-gpu --dump-dom` / `--screenshot`, not just `curl`), which runs
  real client JS.
