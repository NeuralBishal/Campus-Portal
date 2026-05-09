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

## Recent fixes

- Replaced every `sql\`col = ANY(${arr})\`` in the API routes with `inArray(col, arr)` (Drizzle helper). This was crashing the faculty dashboard, faculty groups list, attendance lookup, performance reports, and admin groups list.
- Removed `query: { retry: false }` overrides from `useGetMe` calls (typing conflict with the orval-generated hook in TanStack v5).
- Removed the unused `Role` import from `@workspace/api-zod` in the Login page.
