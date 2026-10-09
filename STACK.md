# BayFlow — Locked Tech Stack 🔒

> Decided and frozen on **2026-10-09**. Do not swap libraries mid-build without a team agreement — every choice below is one we can *build fast* and *defend in the judges' review*. Versions verified against official docs on the lock date.

## Why these choices win

The judging rubric rewards: a **working state machine** (35%), **clean architecture + tenant isolation** (20%), **good UX** (15%), and **a live URL a stranger can run** (10%). That points to **one full-stack app, one deploy, type-safe end to end** — so we spend our hours on the booking lifecycle, not on gluing a separate frontend and backend together.

## The stack

| Layer | Choice | Version (lock date) | Why |
|---|---|---|---|
| Language | **TypeScript** (strict) | 5.x | Type safety is explicitly preferred by judges; shared types across client/server. |
| Framework | **Next.js (App Router)** | **16.x** | One repo = customer portal + shop POS + backend. Server Actions + Route Handlers. Deploys to Vercel in one click. |
| UI runtime | **React** | 19.x | Ships with Next 16. |
| Styling | **Tailwind CSS** | 4.x | Comes with `create-next-app`. Fast, consistent, responsive (mobile is graded). |
| Components | **shadcn/ui** + **lucide-react** | latest | Accessible, reusable components → clean dashboards fast. Owned in-repo (we can explain every line). |
| Database | **PostgreSQL** on **Neon** | PG 16 | Serverless, free tier, pooled connections, pairs perfectly with Vercel. |
| ORM | **Prisma** (driver adapter `@prisma/adapter-pg`) | latest | Type-safe queries, migrations, seeding. Schema is our data contract. |
| Auth | **Auth.js v5 (next-auth@5)** — Credentials + JWT session | 5.x | Vetted cookie/CSRF/session handling. **All role & tenant authorization is our own explicit layer** (`lib/rbac.ts`) so it is fully transparent to judges. |
| Password hashing | **bcryptjs** | latest | Pure JS — no native build pain on Windows or Vercel. |
| Validation | **Zod** | 3.x | One schema validates on client *and* server. Consistent error responses. |
| Client data / polling | **SWR** | 2.x | Lightweight polling for the notification bell + live status. (SSE/WebSockets is a bonus upgrade.) |
| Dates | **date-fns** | 3.x | Slot math, turnaround times. |
| Unit tests | **Vitest** | latest | **Prove the state machine** — rejects invalid transitions. High value for the 20% architecture score. |
| E2E test | **Playwright** | latest | One happy-path test: customer booking → COMPLETED. |
| Lint / format | **ESLint** (Next config) + **Prettier** | latest | "Linter and formatter configured" is in the rubric. |
| Package manager | **pnpm** | 10.x | Installed on the build machine; fast, disk-efficient. |
| Runtime | **Node** | **22 LTS** | Verified on build machine (v22.17). |
| Hosting (app) | **Vercel** | — | Live URL, preview deploys per push. Deploy early, deploy often. |
| Hosting (db) | **Neon** | — | Managed Postgres; `DATABASE_URL` (pooled) + `DIRECT_URL` (migrations). |

## Bonus stack (only after core is green — worth 10%)

| Feature | Choice | Notes |
|---|---|---|
| In-app calling | **WebRTC** (peer) or **Twilio Voice** | SA ↔ customer without sharing numbers; call log stored on booking. |
| AI Front Desk | **Claude (tool-calling)** + STT/TTS | Answers unanswered calls from *real* booking data via tools; creates an SA task + summary. Guardrailed to the caller's own data. |

## Hard rules (these cost points if broken)

1. **No secrets in git.** Only `.env.example` is committed. (`.gitignore` already enforces this.)
2. **Tenant isolation is server-side.** Every shop-scoped query filters by `shopId` derived from the session — never from client input. A Shop-A token must get 403/404 on Shop-B data.
3. **The state machine is the single source of truth.** No status is set by hand anywhere but through `lib/booking/stateMachine.ts`, which checks the transition *and* the actor's role, and writes an audit event.
4. **Next 16 async APIs.** `await cookies()`, `await headers()`, `await params`, `await searchParams` everywhere.
5. **Validate every input with Zod** at the server boundary before it touches the DB.

## Prerequisites (for the README later)

- Node **22+**, pnpm **10+**
- A Neon Postgres database (free)
- A Vercel account (free)
