# BayFlow — Locked Tech Stack 🔒

> Decided and frozen on **2026-10-09**. Don't swap libraries mid-build without a team agreement — every choice below is one we can *build fast* and *defend in the judges' review*. Versions are the ones actually installed (see `package.json`).

## Why these choices win

The rubric rewards a **working state machine** (35%), **clean architecture + tenant isolation** (20%), **good UX** (15%) and **a live URL a stranger can run** (10%). That points to **one full-stack app, one deploy, type-safe end to end** — so the hours go into the booking lifecycle, not into gluing a separate frontend and backend together. (We considered a separate NestJS API: it adds a second deployment, CORS and token plumbing, and earns no extra points. The brief says the stack is free choice.)

## The stack

| Layer | Choice | Version | Why |
|---|---|---|---|
| Language | **TypeScript** (strict) | 5.9 | Type safety is explicitly preferred by judges; shared types client ↔ server. |
| Framework | **Next.js (App Router)** | **16.4** | Customer portal + shop POS + backend API in one repo/deploy. Server Actions for the UI, Route Handlers for the REST API. |
| UI runtime | **React** | 19.3 | Ships with Next 16. |
| Styling | **Tailwind CSS** | 4.x | Fast, consistent, responsive (mobile is graded). Light + dark palettes as CSS variables. |
| Components | **shadcn/ui** (Base UI, `base-nova`) + **lucide-react** | latest | Accessible, owned in-repo components. |
| Theme | **next-themes** | 0.4 | Follows the OS until the user toggles; choice persisted in localStorage. |
| Motion | **motion** | 14 | Hero + wizard step transitions; respects reduced-motion. |
| Database | **PostgreSQL** on **Neon** | PG 16 | Relational + transactional (bookings, stock). Pooled + direct URLs. |
| ORM | **Prisma** (`prisma-client-js`) | **6.19.3 (pinned)** | Typed queries, migrations, interactive transactions. Pinned: Prisma 7 removes `url` from the schema. Raw SQL only for the two race-critical statements (slot claim). |
| Auth | **Auth.js v5** (`next-auth@5` beta) — Credentials + JWT | 5.0.0-beta | Vetted cookie/CSRF/session handling. **All role & tenant authorization is our own explicit layer** (`lib/rbac.ts`). |
| Password hashing | **bcryptjs** | 3.x | Pure JS — no native build issues on Windows or Vercel. |
| Validation | **Zod** | **4.x** | Every server input parsed at the boundary; errors become 422s / form messages. |
| Client data | **SWR** | 2.x | Polls the notification bell (15 s) and the wizard's live availability. |
| Unit tests | **Vitest** | 5.x | Proves the state machine and slot logic. |
| E2E tests | **Playwright** with the installed **Google Chrome** (`channel: "chrome"`) | 1.64 | Full lifecycle across roles, tenant isolation, races, UX. |
| Lint / format | **ESLint** (Next config) + **Prettier** | 9 / 3 | "Linter and formatter configured" is in the rubric. |
| Package manager | **pnpm** | 10.x | |
| Runtime | **Node** | **22 LTS** | |
| Hosting | **Vercel** (app) + **Neon** (db) | — | Live URL, preview deploys. Keep the function region next to the DB region. |

## Bonus stack (only after core is green — worth 10%)

| Feature | Choice | Notes |
|---|---|---|
| In-app calling | **LiveKit** (WebRTC rooms) — or Twilio Voice | Browser ↔ browser, no phone numbers; call log stored on the booking. LiveKit's Agents framework also hosts the AI agent. |
| AI Front Desk | **Claude** (tool calling) + STT/TTS | Answers unanswered calls from *real* booking data through narrow tools (`get_my_booking_status`, `create_callback_task`, …), guardrailed to the caller's own bookings; leaves a summary + SA task. The agent worker needs a long-running host (not Vercel functions). |

## Hard rules (these cost points if broken)

1. **No secrets in git.** Only `.env.example` is committed (`.gitignore` enforces `.env*`).
2. **Tenant isolation is server-side.** A `shopId` may arrive from the URL (the shop switcher needs it) but is **never trusted**: every shop-scoped page, action and API route proves membership/ownership with `requireShopAccess` / `requireBookingAccess`, and shop-owned rows are always loaded with `where: { id, shopId }`. A Shop-A session gets **403/404** on Shop-B.
3. **The state machine is the single source of truth.** Only `server/services/transition.ts` writes `Booking.status`, after `authorize()` (transition + role) and with a compare-and-set update + audit event.
4. **Next 16 conventions.** `await params` / `searchParams` / `cookies()` / `headers()`; `proxy.ts` (not middleware) — and proxy is only an optimistic redirect, never authorization.
5. **Validate every input with Zod** at the server boundary before it touches the DB.
6. **Race-sensitive writes are atomic** (slot capacity, QC claim, stock) — never read-then-write.

## Prerequisites

- Node **22+**, pnpm **10+**
- A Neon Postgres database (free) or local PostgreSQL 15+
- Google Chrome (E2E tests only)
- A Vercel account (free) for the live URL
