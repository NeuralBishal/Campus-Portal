# Campus Portal

A unified academic operations console for students, faculty, and admins.

## Stack

- **Monorepo** managed by pnpm (see `pnpm-workspace.yaml`).
- **Backend** — `artifacts/api-server` (Express + TypeScript + Drizzle ORM + Postgres).
- **Frontend** — `artifacts/campus-portal` (React + Vite + wouter + TanStack Query + shadcn-ui + Tailwind + Recharts + Framer Motion).
- **API contract** — OpenAPI 3 spec at `lib/api-spec/openapi.yaml`. Codegen produces:
  - `lib/api-zod` — request/response zod schemas + types.
  - `lib/api-client-react` — Orval-generated TanStack Query hooks (`useGetMe`, `useLogin`, `useCreateGroup`, etc.).
- **Database** — Postgres via `DATABASE_URL`. Schema lives in `lib/db/src/schema.ts`. Use `pnpm --filter @workspace/db run push` to apply.

## Roles & flow

Three login surfaces — `/login/student`, `/login/faculty`, `/login/admin`.

- **Admin** (`/admin/*`) — uploads two **publicly shared** Google Sheets URLs (one for students, one for faculty); the server auto-syncs every 5 minutes (CSV export pulled via `?format=csv&gid=…`). Admin also manages other admins, security policy, and reviews the audit log. Admin sees all faculties, students, and groups.
- **Faculty** (`/faculty/*`) — creates project domains, accepts groups (capacity 3 groups per faculty), marks attendance per session, sends emails (delivered as student notifications), records performance scores (weekly / monthly / semester reports with averages, top performer, attendance correlation chart).
- **Student** (`/student/*`) — forms a single group of up to 4 members under one chosen faculty + domain; sees attendance, performance trajectory, and notifications.

## Auth & sessions

- Cookie name `campus_session` (HttpOnly, SameSite=None, Secure). Lifetime is configured by **AdminSecurity** (`sessionTimeoutMinutes`, default 120).
- First-time users (`mustChangePassword=true`) are forced to `/change-password` by the `AuthGuard`.
- Initial passwords come from the Google Sheet's `initialPassword` column. Default seed admin is `admin@campus.edu / admin123`. Seeded faculty use their faculty ID as the password (`FAC101`, `FAC102`, `FAC103`); seeded students use their roll number (`CS2101`, `CS2102`, …).

## Important conventions

- Never shadow `inArray` with raw `sql\`… = ANY(${arr})\`` — drizzle-pg flattens arrays into a single string parameter and the query crashes. Use `inArray(col, arr)` from `drizzle-orm`.
- Frontend mutation pattern:
  ```ts
  const m = useUpdateSheetsConfig();
  m.mutate({ data: { studentSheetUrl, facultySheetUrl } }, {
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetSheetsConfigQueryKey() }),
    onError: (err: any) => toast.error(err?.message),
  });
  ```
- Frontend reads `useGetMe()` with no options — passing `{ query: { retry: false } }` collides with the orval typing because TanStack v5 requires `queryKey`. Default queries already have `retry: false` (set on the global QueryClient).
- Lucide icons everywhere. **No emojis.**
- Reusable building blocks: `@/components/PageHeader`, `@/components/EmptyState`, `@/components/AuthGuard`, `@/components/layout/{AuthLayout, DashboardLayout}`.

## Workflows

- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev` (binds `PORT`, default 8080).
- `artifacts/campus-portal: web` — `pnpm --filter @workspace/campus-portal run dev` (Vite, binds `PORT`).
- `artifacts/mockup-sandbox: Component Preview Server` — only used during design exploration.

## Superadmin Portal

- Hidden shield button (top-right of `/`) opens `/superadmin`.
- Registration & login use **WebAuthn** (`@simplewebauthn/server` on the API, `@simplewebauthn/browser` on the client) with `userVerification: "required"` so only biometric/PIN authenticators are accepted.
- After **5** failed fingerprint attempts (counter is in-memory, keyed by email), an email + phone fallback unlocks (no OTP — straight credential match against `superadminsTable`).
- Dashboard at `/superadmin/dashboard` lets a superadmin upload an Excel/CSV of admins (`name`, `email`, optional `password`), create admins manually, and delete admins.
- Tables: `superadminsTable`, `webauthnCredentialsTable` (publicKey stored base64). Sessions reuse `campus_session` cookie with role `"superadmin"`.
- Superadmin endpoints are called via raw `fetch` (`src/lib/superadminApi.ts`); only `Role` enum was extended in OpenAPI to keep `useGetMe` typing correct. WebAuthn options are too deeply nested for orval typing to be useful.

## Scale hardening

- **Indexes** added on `students.groupId`, `students.department`, `domains.facultyId`, `groups.facultyId/domainId/createdAt`, `performance(studentId,recordedAt)`, `performance(facultyId,recordedAt)`, `email_logs(facultyId,sentAt)`, `notifications(recipientType,recipientId,createdAt)`, `audit_logs.createdAt`, `audit_logs.actorId`, `sessions.expiresAt`. Apply with `pnpm --filter @workspace/db run push`.
- **Login rate limiting** via `artifacts/api-server/src/middlewares/rateLimit.ts` (in-memory token buckets, `.unref()` cleanup). 20 attempts / 15min per IP+identifier on `/auth/login`, `/superadmin/login/options`, `/superadmin/login/fallback`. 5 attempts / hour per IP on `/auth/register-admin` and `/superadmin/register/options`. Returns 429 with `Retry-After`.
- **Session purge** runs `purgeExpiredSessions()` on startup and every 30 min via `setInterval(...).unref()` in `artifacts/api-server/src/index.ts`.
- **Pagination on big admin lists** is intentionally NOT done yet — would require changing the OpenAPI spec + every admin table component. Server still hard-caps `audit-logs` at 200 and the other lists are bounded by college roster size (a few thousand rows is fine post-indexes).

## Single-service deploy (Render, Railway, Fly, etc.) — RECOMMENDED

The Express backend now also serves the built React frontend from disk, so the whole app runs as **one web service** with no cross-origin/cookie pain. This is the recommended deploy mode.

- `artifacts/api-server/src/lib/staticFiles.ts` mounts `STATIC_DIR` (or auto-detects `artifacts/campus-portal/dist`). Adds SPA fallback: any non-`/api` GET returns `index.html`. No-op when the dir is missing (so local dev with separate Vite still works).
- `app.set("trust proxy", true)` so rate limiter and IP logs respect Render's proxy headers.
- `render.yaml` at repo root is a one-click Render Blueprint:
  - **Build**: `pnpm install && build campus-portal && build api-server`
  - **Start**: `pnpm --filter @workspace/api-server run start`
  - **Health check**: `/api/healthz`
  - **Env**: `NODE_ENV=production`, `STATIC_DIR=artifacts/campus-portal/dist`, auto-generated `SESSION_SECRET`, manual `DATABASE_URL`.
- Cookies stay `SameSite=Lax` in single-origin mode. `isCrossSite()` in `lib/cookies.ts` only flips to `SameSite=None; Secure` when `ALLOWED_ORIGINS` is set or `COOKIE_CROSS_SITE=true` is set — not just because `NODE_ENV=production`. This avoids the CSRF risk of permissive `SameSite=None` cookies on a same-origin deploy.
- CORS in production rejects all cross-origin requests unless `ALLOWED_ORIGINS` is set. Same-origin requests (no `Origin` header) always pass.
- Frontend leaves `VITE_API_URL` unset → uses relative `/api/*` → hits the same origin.

**To deploy on Render via Blueprint:**
1. Push repo to GitHub
2. Render Dashboard → New → Blueprint → connect repo
3. Add the `DATABASE_URL` secret (use Render Postgres or Neon)
4. Deploy. Health check at `/api/healthz` confirms it's up.

## Cross-origin / external hosting (Vercel etc.)

The frontend can be deployed to Vercel/Netlify with the API hosted elsewhere (Render, Railway, Replit Autoscale).

- **Frontend → API URL**: set `VITE_API_URL=https://your-api.example.com` in the Vercel project. When unset, the client uses relative `/api` (works on Replit where everything is behind one proxy). Wired in `artifacts/campus-portal/src/lib/initApi.ts` (orval hooks via `setBaseUrl`) and `artifacts/campus-portal/src/lib/superadminApi.ts` (raw fetch).
- **Credentials**: `lib/api-client-react/src/custom-fetch.ts` defaults `credentials: "include"` so cookies cross sites. Run `pnpm run typecheck:libs` after editing.
- **Cookies**: `artifacts/api-server/src/lib/cookies.ts` returns `SameSite=None; Secure` when `NODE_ENV=production`, otherwise `SameSite=Lax; Secure=false` (so dev works over plain http on Replit). All session set/clear sites use these helpers — never hand-roll cookie options.
- **CORS**: `artifacts/api-server/src/app.ts` reads `ALLOWED_ORIGINS` (comma-separated). Empty = reflect any origin (dev). For production set e.g. `ALLOWED_ORIGINS=https://campus-portal.vercel.app`.
- **Vercel build** (`artifacts/campus-portal/vercel.json`): pnpm monorepo build from artifact root: `cd ../.. && pnpm install --frozen-lockfile=false && pnpm --filter @workspace/campus-portal build`. Output `dist`. SPA rewrite `/(.*) -> /index.html` so wouter routes work on hard reload. In Vercel UI set **Root Directory** to `artifacts/campus-portal`.

## Recent fixes

- Replaced every `sql\`col = ANY(${arr})\`` in the API routes with `inArray(col, arr)` (Drizzle helper). This was crashing the faculty dashboard, faculty groups list, attendance lookup, performance reports, and admin groups list.
- Removed `query: { retry: false }` overrides from `useGetMe` calls (typing conflict with the orval-generated hook in TanStack v5).
- Removed the unused `Role` import from `@workspace/api-zod` in the Login page.
