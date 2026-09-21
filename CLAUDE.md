# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm install
cp .env.example .env          # DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, ADMIN_EMAILS
pnpm exec prisma generate     # generate the Prisma client into src/lib/generated/prisma
pnpm exec prisma migrate deploy  # apply migrations to the DB (migrate dev while developing)
pnpm dev            # dev server (Turbopack), http://localhost:3003  (port fixed to match the Google redirect URI)
pnpm build          # production build (Turbopack) — see Build below
pnpm build:webpack  # production build with Webpack (fallback)
pnpm start          # serve the production build, http://localhost:3006 (port fixed to match this
                    # deployment's Cloudflare Tunnel ingress config on the Synology host)
pnpm lint           # ESLint (eslint .)
```

The DB is **MariaDB `digital-hygiene`** (hyphenated name — needs backticks in raw SQL). There are
**no unit tests**. To verify the DB/auth locally without the Synology host, run a MariaDB 10 container:
```bash
docker run --name dh-maria -e MARIADB_ROOT_PASSWORD=root \
  -e 'MARIADB_DATABASE=digital-hygiene' -p 3307:3306 -d mariadb:10
DATABASE_URL="mysql://root:root@127.0.0.1:3307/digital-hygiene" pnpm exec prisma migrate dev
```
`prisma generate` writes into `src/lib/generated/prisma` (gitignored) — regenerate after schema changes.
Use `pnpm exec prisma …` (the pinned local CLI), **not** `pnpm dlx prisma …` — `dlx` fetches the latest
Prisma, which no longer has the `migrate` command.

### Debugging local dev (production is live on the Synology host)
The dev DB (`100.125.86.64:3307`) is only reachable over **Tailscale** — before running `pnpm dev`,
check `tailscale status`; if it says "Tailscale is stopped", run `tailscale up` first. A
`DriverAdapterError: pool timeout ... (active=0 idle=0 ...)` means **zero** connections ever opened —
that's a network-reachability problem (Tailscale down, VPN hop dropped), not a Prisma/pool-size bug;
contrast with errors where `active`/`idle` is nonzero, which point at query/auth issues instead. If
Tailscale is unavailable, fall back to the local Docker MariaDB container documented above instead of
waiting it out.

**Restart `pnpm dev` after `prisma generate` / `prisma migrate` (any schema change).** `src/lib/prisma.ts` keeps the
client on `globalThis` so hot-reloads don't leak connections, which means a running dev server keeps the OLD generated
client: code using a new column then fails with `PrismaClientValidationError … Unknown argument \`<column>\``
(e.g. the storage pop-up's "ไม่สามารถบันทึกได้" toast) even though the DB has the column. The real error is in the
terminal / `.next/dev/logs/next-development.log`.

Never put the production `DATABASE_URL` (or any other prod secret) in the local `.env`, even
commented out — an accidental uncomment would make `pnpm dev` read/write the live prod DB. For a
one-off check against prod, pass it inline on the command instead, e.g. `DATABASE_URL="..." pnpm exec
prisma studio`.

### Auth (Auth.js v5 / NextAuth) — env required
Login is **Google OAuth** or **Guest** (passwordless magic-link email via Resend — anyone can sign in
with a real email address after clicking the verification link sent to it). Needed env vars (see
`.env.example`): `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`,
`EMAIL_FROM`, `NEXTAUTH_URL="http://localhost:3003"`, optional `ALLOWED_EMAIL_DOMAIN` (applies to
Google only — Guest sign-in is intentionally exempt). The Google OAuth client's Authorized redirect
URI must be `http://localhost:3003/api/auth/callback/google` (hence `pnpm dev` is pinned to port
3003). Provider is auto-checked at `GET /api/auth/providers`. Submitted assessment/survey data is
auto-deleted after 30 days by an in-process scheduler (`src/instrumentation.ts` → `src/services/retention.service.ts`).

### Build
`pnpm build` (Turbopack) works from the project's current location under `~/Documents`. It failed
when the project lived in `~/Downloads` (macOS TCC-protected: Turbopack resolves realpaths through
the protected parent during page-data collection) — if it ever moves back to a protected folder,
use `pnpm build:webpack`, or grant the terminal Full Disk Access. `pnpm dev` works regardless.
`next.config.js` pins `outputFileTracingRoot` to this project to stop Next from treating `~` as the
workspace root (a stray `~/package-lock.json` otherwise causes that).

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

**Routes** (each section is its own URL so it can be linked / QR-coded on its own):
- `/` (`src/app/page.tsx`) → signed in: `redirect("/cleanup")` (the first page); signed out: `redirect("/login")`.
- `/login` (`src/app/login/page.tsx`) — the only place the sign-in card (`SignInGate`) appears. Signed in →
  redirects to the sanitised `?callbackUrl=` or `/cleanup`. Auth.js's `pages.signIn/error` point here too, so
  failed sign-ins arrive as `/login?error=…` (toasted by `AuthErrorToast`, which strips only `error`).
- `src/app/(app)/` — route group for the 5 tabs, sharing `layout.tsx`: TopBar, and — once signed in with
  a division — `AppHero` + `SectionTabs` (a `next/link` navbar, sticky under the TopBar). Signed in without a
  division → only `DivisionGuard` (lazy `DivisionGate`). Signed out → the layout renders just `children`
  (no shell), and each page redirects to `/login`. Every page shows `TopBar` (DTC logo `public/DTC-Logo.png` +
  divider + wordmark; **keep it `h-16`** — `SectionTabs` sticks at `top-16`) and the shared `AppFooter` (organisation
  name, pinned to the viewport bottom via `mt-auto` in a `min-h-screen flex flex-col` page; `clearBottomNav` leaves
  room for the admin's mobile bottom bar).
  - `/cleanup`, `/security`, `/footprint`, `/backup` — four explicit route folders under `(app)/`, each a
    one-line page rendering the shared `GroupPage` (`(app)/GroupPage.tsx` → `GroupSection` with that
    group's items). **Not a dynamic `[group]` segment**: that also matched `/favicon.ico`, `/robots.txt`,
    `/foo` … and ran the whole layout (a session lookup, 2 DB queries) before the page could 404, and
    answered 200 instead of 404. Keep the folders in sync with `GROUP_IDS` (`src/models/activity-group.ts`).
  - `/survey` — the satisfaction survey (`SurveyPanel`); reachable any time.
- `/admin` (`src/app/admin/page.tsx`, server) → **route guard**: signed out → `/login?callbackUrl=/admin`;
  `redirect("/")` unless `isAdmin(session.email)`; loads records via `record.service.listRecords()` and renders `AdminDashboard`.
- `/privacy`, `/deletion-instructions` — static public pages. `icon.svg` and `robots.ts` are static too.
- **`src/proxy.ts`** (Next 16's `middleware`) — an early, render-free **307** for signed-out browser
  navigations to `/`, the 5 tabs and `/admin` → `/login?callbackUrl=…` (and `/` → `/cleanup` when a cookie
  exists). Without it the redirect runs inside a streamed render and the browser gets a 200 page with a
  `<meta refresh>` — it downloaded the whole app before being sent on (QR-scan path measured: Lighthouse 87 →
  94, FCP 1.66 → 1.06 s, 46 → 26 requests). It is an **optimisation, not authorisation**: it only checks that a
  session cookie *exists* (either name), never validates it — the pages' `getSession()` guards stay. It leaves
  POST/Server Actions, RSC/prefetch requests and non-HTML requests alone, and it must NOT redirect `/login`
  away (a stale cookie would loop). Its `Location` is built from `AUTH_URL` (the proxy runtime rejects
  relative URLs, and `request.url`/`Host`/`X-Forwarded-Host` aren't trustworthy behind the tunnel).

**Every `(app)` page must guard itself** (`getSession()` from `src/app/session.ts`): no session →
`redirect(loginPath("/<this page>"))`, session without a division → `return <DivisionGuard user=…/>`. A
client-side tab click re-renders only the page segment, not the layout, so a layout-only check isn't enough.
`loginPath()` puts the destination in `?callbackUrl=`, so a scanned section QR code still ends on that section
after login. **Every `callbackUrl` must go through `safeCallbackPath()`** (`src/lib/safe-redirect.ts`: same-site
paths only — no `//host`, backslashes, control chars, `/login` or `/api`), both before redirecting and before
handing it to `signIn`; it's what prevents open redirects and a login↔page redirect loop. Never `redirect("/")`
from an `(app)` page for a signed-out user — go to `/login`.

**Admin backoffice is restricted to two emails** (`chawut.sa@gmail.com`, `kornwalairathwork@gmail.com` —
`ADMIN_EMAILS` env, with the same pair as the built-in default). Enforced in 3 places: the `/admin` route
redirect, the `/admin` nav link visibility, and admin-only actions (`clearRecords`,
`adminCreateSurveyQuestion`/`adminUpdateSurveyQuestion`/`adminDeleteSurveyQuestion`).

**Sections are independent.** Checklist items come from the DB (`checklist.service.listItems()`, admin-editable;
each carries a `groupId` — see `src/models/activity-group.ts` for the 4 groups, colors/icons in
`src/lib/theme.ts`). `GroupSection.tsx` owns one group's state: category checkboxes (master checkbox
with indeterminate state + per-category accordion), the analyze button (never gated) and the result
`Dialog`. Scoring is per section (`src/lib/scoring.ts`: 100% = every category in that group checked).
Each analyze calls `createRecord({groupId, …})` → **one `AssessmentRecord` per submit**, with
`groupId` (NULL = a legacy record from before the split, which scored all groups together).
`createRecord` trusts nothing but the section id and WHICH items were left unchecked: it re-validates
`groupId`, drops ids outside the group, and **recomputes the score, `scoreLabel` and `gaps` itself**
(`lib/scoring.ts` + `scoreFor`) and throttles to 30 submits/hour/address (`{ok:false, reason:"rate_limited"}`).

**Storage (GB) is asked in two pop-ups, not in a section.** Self-reported device storage USED, kept on the
`User` row (`storageBeforeGb/At`, `storageAfterGb/At`; the session callback carries the two values, so no extra
query). (1) **"Before"** — `StorageBeforeDialog`, mounted by `(app)/EntryDialogs.tsx` in the layout while the user has
a division and has answered neither question: right after the division gate for a new user, on the next visit for
an existing one; after the one-time retention notice (never stacked on it) and never on `/survey`. (2) **"After"** —
`StorageAfterDialog` on `/survey`, only when every section with items has been submitted (`lib/completion.ts`,
re-checked on the server) and no answer yet; it then shows before → after → difference before the survey. Both have
"ไว้ทีหลัง" (hides until reload / the next `/survey` visit — nothing is stored). Both actions (`saveStorageBefore/After`)
refuse bad numbers (`lib/storage-gb.ts`: 0 – `MAX_GB` = 16 384 — a higher cap let ONE Guest account skew the admin's
average) and **write once** (`user.service.setStorage*Once`, race-safe like `setDivisionOnce`); "before" is also refused
once "after" exists (`too_late`, so neither value is chosen after seeing the other), and a refused/duplicate write is
reported (`already_set`), never as `ok`. A wrong entry is fixed by the admin's erasure tool. The 30-day retention sweep
ages each answer from its own timestamp; `record.service.listRecords` fills the pair into each address's latest Cleanup
record for `/admin` only when that record has no value of its own, and out-of-range legacy values are shown as "not
supplied" (the old per-record `AssessmentRecord.storage*Gb` columns are legacy and no longer written).

**Satisfaction survey:** `SurveyQuestion` rows are admin-editable (`SurveyAdmin.tsx`, mounted in
`AdminDashboard.tsx`) with a `type` of `"rating"` (1-5) or `"text"`. `survey.service.listQuestions()`
self-seeds 5 defaults the first time the table is empty — no separate seed script. Users answer at
`/survey` (`SurveyForm`). Separately, the `createRecord` result carries `surveyNudge`: true only on the
submit that completes the last section (`record.service.listCompletedGroupIds` = distinct non-null
groupIds for the user), the user hasn't answered, and questions exist — `GroupSection` then opens
`SurveyNudgeDialog` after the result dialog closes. It never nags again (skipping is final).

For a full domain-model + setup reference, see `CODEBASE-MAP.md`.

## Conventions

- **No import cycle:** nothing `src/auth.ts` imports may import `@/auth`. `services/auth.service.ts` is
  pure (`isAdmin`/`ADMIN_EMAILS`, no `@/auth`); session resolution lives only in the actions/route layer.
- `src/services/*`, `src/lib/prisma.ts`, `src/auth.ts` are server-side; never import them from a client
  component. Client code uses `signIn` from `next-auth/react` (only inside the lazy gates) and imports from
  `@/models/*` and `@/lib/format` (client-safe). Signing out from the signed-in UI goes through the
  `signOutAction` server action (see Performance conventions below).
- `src/auth.config.ts` must stay Prisma-free (edge-safe); the adapter is wired only in `src/auth.ts`.
- `src/lib/generated/**` is generated Prisma code — gitignored and excluded from ESLint. `prisma generate`
  output path is set in `prisma/schema.prisma` (`../src/lib/generated/prisma`).
- UI text and domain content are in **Thai**; code identifiers are in English.
- Tailwind is **v4**: styling tokens live in `app/globals.css` (`@theme`), `--font-sans` is IBM Plex
  Sans Thai (the only font — a second, unused family was dropped: ~40 KB preloaded on every page),
  and `postcss.config.js` uses `@tailwindcss/postcss`.
- **`next/dynamic(..., {ssr:false})` is not allowed in Server Components** — keep such imports in a client
  wrapper (see `RetentionNoticeGate.tsx`). `src/app/session.ts` (`getSession`, React-`cache()`d) is the one
  place the app layer resolves the session for pages/layouts; actions use `requireUser()`.
- **Security conventions** (from the pentest; the test scripts live outside the repo — don't undo):
  - **Identity = an exact, plain-ASCII e-mail.** `lib/signin-policy.ts` (pure, unit-tested with
    `node --experimental-strip-types`) rejects non-ASCII / look-alike / multi-address strings and Google's
    `email_verified === false`, and applies the optional `ALLOWED_EMAIL_DOMAIN` gate (Google only). The e-mail
    columns (`User.email`, `AssessmentRecord.email`, `SurveyResponse.email`, `AuditLog.actorEmail`,
    `VerificationToken.identifier`) are **`utf8mb4_bin`** (migration `…harden_identity_and_survey_uniqueness`;
    Prisma can't express collations, so it is raw SQL): the old case/accent-insensitive collation let a magic link for
    `chawut.sa@gmaîl.com` sign in as the admin row. `src/auth.ts`'s adapter lower-cases on lookup/create.
  - **`src/auth.ts` `signIn` MUST call `authConfig.callbacks.signIn` first** (it only adds the Prisma-dependent
    per-address link cap, 3 unexpired links) — a plain override silently disables the policy above. The Resend
    link lives 15 min. `auth.config.ts` must stay Prisma-free.
  - **The `session` callback builds its result from scratch.** Returning the input leaked the raw `sessionToken`
    (defeating HttpOnly) and the whole `User` row through `GET /api/auth/session`.
  - **The client is untrusted.** Survey answers go through `lib/survey-validation.ts` (real questions only,
    integer 1–5, text ≤ 1000 chars, XML-unsafe characters stripped); one response per address is a **DB unique
    index** (`SurveyResponse.email`), duplicates are ignored; `setDivision` writes only while the division is unset
    (`setDivisionOnce`); admin lists are bounded (`ADMIN_MAX_RECORDS`/`ADMIN_MAX_RESPONSES`) and the export's `esc()`
    uses the same `stripUnsafeText`.
  - **A wrong division pick is final for the user** (`setDivisionOnce`); an admin fixes it with `adminResetDivision`
    (UI: `DivisionReset.tsx` on `/admin`, audited) — the user sees the division gate again, saved records keep the old one.
  - **Erasure and retention.** `adminDeleteUserData` (admin only; UI in `UserDataDeletion.tsx`) removes an address's
    account, sessions, records, survey answer and pending links and de-identifies its audit rows; the daily sweep also
    deletes expired sessions. Google OAuth tokens are never stored (adapter `linkAccount`). Keep `/privacy` in sync.
  - **Headers** are set in `next.config.js` (`frame-ancestors 'none'`, nosniff, referrer/permissions policy, HSTS,
    no `X-Powered-By`). A full `script-src` CSP needs a per-request nonce — not done.
  - **Not code — deployment.** Rate limiting (Cloudflare rule on `POST /api/auth/signin/*`, ~5/min/IP, plus
    Turnstile on the Guest form) and `AUTH_URL="https://…"` in production's env must be set by the operator; the
    in-app link cap only bounds one address at a time.
- **Performance conventions** (measured — Lighthouse mobile, login-ed `/cleanup`: 89 → 94, first-load JS
  229 → 198 KB gz, DB queries per page load / tab switch 4 → 2; QR-scan path 87 → 94). Don't undo these:
  - **Keep the root `src/app/loading.tsx`.** Removing it looked free in the lab (DB ≈ 0 ms) but with a DB 60 ms
    away (Tailscale-like) TTFB went 5 → 255 ms and FCP 784 → 872 ms: that boundary streams the shell while the
    layout waits for its session lookup. (Removing it is also NOT what gives real 307/404 — explicit routes and
    `src/proxy.ts` do.)
  - **`DivisionGuard.tsx` is a client component on purpose**, and `DivisionGate` is a `next/dynamic` import
    inside it. `next/dynamic` in a *Server Component* did NOT keep it out of the layout's chunk set (measured:
    0 KB saved); a client-side `dynamic()` does. The sign-in card lives on its own `/login` route, so its JS
    (and `next-auth/react`) never reaches the section tabs — don't import `SignInGate`, `DivisionGate`,
    `next-auth/react` or Radix Select statically from `(app)/layout.tsx` or another `(app)` server file. Check with
    the chunk list of a signed-in `/cleanup` after `pnpm build`.
  - **The one-time retention notice flag is on the session** (`session.user.retentionNoticeSeen`, set in the
    `auth.ts` session callback from the `User` row it already has) — the layout does no extra DB query.
  - **`listItems()` / `listQuestions()` are cached in-process for 60 s** (`src/lib/cached-loader.ts`) — they're
    read on every section page view but change only when an admin edits them. Every write path
    (`create/update/deleteItem`, `create/update/deleteQuestion`) must call `invalidate()`; the arrays are
    frozen/`readonly` and shared. Per-process only: with several server processes an edit can take up to the
    TTL to show on the others. Never cache per-user data (session, `hasResponded`, `listCompletedGroupIds`).
  - **`signOutAction` does not redirect** (a redirecting server action makes the client-side promise reject,
    which a caller's try/catch misreads as failure): it just clears the session, and the caller navigates with
    `window.location.assign`. A mid-section session expiry returns to the same tab with `?error=SessionExpired`
    (shown by `AuthErrorToast`, since a toast raised before the reload would be wiped). Auth.js logs its own
    `[auth][error] SignOutError` in that case (the DB session row is already gone) — harmless.
- **Capacity (measured on a Mac, production build, 200 simulated users doing the whole journey — page loads, both
  storage answers, 4 section submits, survey — with sessions pre-seeded; NOT Google/Resend sign-in):** 0 errors in
  every scenario. DB on the same host (how production runs): everything ≤ 13 ms p95 when arrivals are spread over a
  minute, first page ≈ 0.4–0.8 s p95 when all 200 hit at once; ≈ 3 ms CPU per request (single Node process, ~560 MB RSS).
  DB ~60 ms away (dev over Tailscale): ≈ 1–3 s per request when spread over a minute, 3–10 s p95 when all at once — the
  pool (`connectionLimit: 10`) × round-trip time is the limit, so keep the DB on the app's host. The retention sweep runs its
  statements one after another for the same reason (it also runs at every start).
- **`react-hooks/set-state-in-effect` is enforced** — don't `setState` in an effect to load client-only
  data; use `useSyncExternalStore` (or derive it from props).
- **`Dialog`/`AlertDialog` content never appears in raw SSR HTML (curl)**, even with `open` forced true —
  both Radix (`Dialog`) and Base UI (`AlertDialog`) portal their popups client-side after hydration, so
  they only render in a real browser. To verify modal content, use **headless Chrome**
  (`google-chrome --headless=new --disable-gpu --dump-dom` / `--screenshot`, not just `curl`), which runs
  real client JS.
