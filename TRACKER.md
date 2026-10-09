# BayFlow — Task Tracker 📋

> **This file is our source of truth for who's doing what.** It lives in the repo, so both devices stay in sync through git, and every change is recorded in git history. Claude also updates this file as it completes work.

**How to use**
1. Grab a task → set its **Status** to `◐ Doing` and put your initial in **Owner** (`Z` = Zohaib, `T` = Teammate, `AI` = Claude).
2. Finish it → set **Status** to `☑ Done` and add a dated line to the **Activity Log** at the bottom.
3. Stuck → set `⊘ Blocked` and write why in **Notes**.
4. Commit the tracker change with your code (or on its own): `git commit -m "track: P1-2 done"`.

**Status legend:** `☐ Todo` · `◐ Doing` · `☑ Done` · `⊘ Blocked`
**Owners:** `Z` Zohaib · `T` Teammate · `AI` Claude · `—` unassigned

**Current focus:** ▶ **Phase 1 — brand/design system + cinematic landing (real shop data) + auth UI shipped. Next: RBAC guards, role routing, owner shop/team management.**
**Last updated:** 2026-10-09 (by AI) — design system, landing page, login + owner signup; build green. (Env now lives in `.env`, not `.env.local`.)

---

## Progress at a glance

| Phase | Theme | Tasks done | Status |
|---|---|---|---|
| 0 | Foundation & first deploy | 5 / 6 | ▶ DB live + seeded; Vercel/GitHub deploy (P0-5/6) left |
| 1 | Auth & multi-tenancy | 1 / 5 | ◐ design system + auth UI done; RBAC/shop mgmt next |
| 2 | Public portal & booking creation | ~1 / 4 | ◐ landing + shop directory live |
| 3 | State machine end-to-end | 0 / 5 | ☐ |
| 4 | Inventory & procurement | 0 / 3 | ☐ |
| 5 | QC loop, notifications, dashboards | 0 / 4 | ☐ |
| 6 | Seed, docs, hardening, deploy | 0 / 5 | ☐ |
| 7 | Bonus (calling / AI Front Desk) | 0 / 4 | 🔒 locked until core green |

---

## Phase 0 — Foundation & first deploy  (both)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P0-1 | Scaffold Next 16 app + Tailwind 4 + ESLint | AI | ☑ | Next 16.4.0, React 19.3, TS, App Router, Turbopack, src/, `@/*` |
| P0-2 | Init shadcn/ui + base components | AI | ☑ | base-nova style; button/input/label/card/badge/table/dialog/dropdown/select/sonner/separator/tabs |
| P0-3 | Prisma schema + client + `db.ts` singleton + seed | AI | ☑ | full data model; **Prisma pinned to 6.19.3** (v7 dropped `url` from schema). ✓ migrated + seeded to **Neon** (3 shops, 14 users, 168 slots). Env uses `.env` (Prisma reads it; Next too) |
| P0-4 | Auth.js v5 skeleton (credentials + JWT) + login shell | AI | ☑ | `src/lib/auth.ts`, `/api/auth/[...]`, `/login`, type augmentation |
| P0-5 | **Deploy to Vercel → live URL** | Z | ⊘ | needs Zohaib's Vercel + Neon accounts (see handoff) |
| P0-6 | Public GitHub repo + Vercel auto-deploy on push | Z | ⊘ | gh CLI not installed — create repo on github.com |

**Done when:** live URL loads, DB connects, one test user can log in.
**⚠ Note:** `next build` passes; **Neon DB is live + seeded**. Only remaining P0 item is the Vercel/GitHub deploy (P0-5/6), which needs Zohaib's accounts.

## Phase 1 — Auth & multi-tenancy  (Z lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P1-1 | User model + owner signup + login (customer + staff login) | AI | ◐ | login works for all roles (credentials+JWT); owner signup built (`/signup`); polished auth UI. **Remaining:** post-login role-based routing |
| P1-0 | Brand + design system (theme, Archivo display font, motion, shadcn) | AI | ☑ | graphite + signal-amber, dark-first; `motion` installed; globals.css tokens |
| P1-2 | `Membership` model + `rbac.ts` (`requireRole`, `scopeToShop`) | — | ☐ | role per shop |
| P1-3 | Owner: create shop; add/edit/deactivate team members | — | ☐ | |
| P1-4 | Owner: multiple shops + shop switcher; service catalog CRUD | — | ☐ | |
| P1-5 | **Tenant isolation test**: Shop-A token ⇒ 403/404 on Shop-B | — | ☐ | graded (10%) |

**Done when:** Shop-A staff cannot touch Shop-B data; owner runs 2 shops with separate teams.

## Phase 2 — Public portal & booking creation  (T lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P2-1 | Landing page: hero + shop grid (name, city, services) + search/city filter | AI | ◐ | cinematic hero w/ animated pipeline instrument, shop directory from live DB, lifecycle section, responsive. **Remaining:** search/city filter, rating |
| P2-2 | Booking wizard: shop → services/problems → slot → details → review | — | ☐ | multi-select + free text |
| P2-3 | Slot picker shows only available slots; capacity enforced (txn/unique) | — | ☐ | no double-booking |
| P2-4 | Create booking `PENDING`; create/reuse customer account | — | ☐ | |

**Done when:** a visitor books on the live URL and it appears on the SA dashboard.

## Phase 3 — State machine end-to-end  (Z + T)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P3-1 | `stateMachine.ts` (statuses, transitions, owning role) | — | ☐ | single source of truth |
| P3-2 | `transition()` with role guards + BookingEvent audit log | — | ☐ | reject invalid transitions |
| P3-3 | Estimate (items, labor, revision) + SA edit + send to customer | — | ☐ | |
| P3-4 | Customer approve/reject; reject → revise or cancel path | — | ☐ | |
| P3-5 | SA dashboard + Technician dashboard (inspect/estimate/repair/sendQC) | — | ☐ | |

**Done when:** customer→COMPLETED runs live; estimate-reject path works; invalid transitions blocked.

## Phase 4 — Inventory & procurement  (Z lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P4-1 | Inventory table (SKU, qty, reorder, cost); required-vs-available view | — | ☐ | |
| P4-2 | Purchase orders: create / receive (stock +) / partial delivery | — | ☐ | ORDERED/PARTIAL/RECEIVED |
| P4-3 | Allocate to booking (stock −); cancel before IN_REPAIR releases parts | — | ☐ | |

**Done when:** worked-example parts flow works and stock counts are correct.

## Phase 5 — QC loop, notifications, dashboards  (Z + T)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P5-1 | QC queue with first-to-pick lock (`qcInspectorId`) | — | ☐ | two can't pick same job |
| P5-2 | QC pass → READY_FOR_PICKUP; fail → Issue + loop to tech | — | ☐ | graded path |
| P5-3 | Notification bell + unread count + SWR polling | — | ☐ | min events per brief §5.4 |
| P5-4 | Parts & QC dashboards; Owner overview + per-shop summary | — | ☐ | role-scoped views only |

**Done when:** QC-fail loop works live; every role sees only their work; bell updates.

## Phase 6 — Seed, docs, hardening, final deploy  (both)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P6-1 | `seed.ts`: ≥3 shops, full team per role, services, inventory, slots, demo customer+booking | — | ☐ | judges test instantly |
| P6-2 | README complete (prereqs, install, env, migrate+seed, run, **demo accounts**, architecture) | — | ☐ | |
| P6-3 | Vitest for state machine (invalid transitions rejected) | — | ☐ | architecture score |
| P6-4 | Playwright happy-path (booking → COMPLETED) + tenant-isolation test | — | ☐ | |
| P6-5 | Final deploy + smoke-test full flow on live URL | — | ☐ | Definition of Done in PLAN.md |

**Done when:** a stranger runs it from the README; Definition of Done all green on live URL.

## Phase 7 — BONUS 🔒  (only after core is green)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P7-1 | In-app calling (WebRTC/Twilio) SA ↔ customer + call log | — | ☐ | |
| P7-2 | AI Front Desk: Claude tool-calling over caller's own bookings | — | ☐ | guardrailed to own data |
| P7-3 | AI call summary + SA task (mark done) | — | ☐ | |
| P7-4 | Stretch: owner analytics / invoice PDF / SSE live updates | — | ☐ | |

---

## Activity Log  (newest first — append dated lines here for the record)

- **2026-10-09 (AI):** Shipped the brand + first UI. Design system ("service bay, instrumented": graphite + signal-amber, dark-first, Archivo expanded display font, `motion` for animation) in `globals.css`/`layout.tsx`. Built: cinematic **landing page** (`/`) with an animated repair-pipeline hero + shop directory from live DB + lifecycle timeline + owner CTA; polished **login** (`/login`, demo-account quick-fill) and **owner signup** (`/signup`, server action). `/book/[shopId]` placeholder. Switched off Next 16 `cacheComponents` for predictable dynamic rendering. `pnpm build` green (routes: /, /login, /signup, /book/[shopId], /api/auth). Not committed (user commits). ▶ Next: RBAC (`rbac.ts`), role-based post-login routing, owner shop/team management, then role dashboards.
- **2026-10-09 (AI):** Neon connected. Standardized env on `.env` (Prisma CLI reads `.env`, not `.env.local`). Ran `prisma migrate dev --name init` → tables created on Neon; `db:seed` → 3 shops / 14 users / 12 memberships / 12 services / 168 slots / 12 inventory / 1 vehicle. Verified via live count query. Demo password `password123`. ▶ Next: Phase 1, and Zohaib to do Vercel+GitHub (P0-5/6).
- **2026-10-09 (AI):** Phase 0 code done — scaffolded Next 16.4 app (TS/Tailwind4/App Router/src), full Prisma schema + client + `db.ts` + idempotent `seed.ts` (3 shops, teams, inventory, slots, demo customer), Auth.js v5 credentials skeleton + `/login`, shadcn/ui (12 components). Pinned Prisma to 6.19.3 (v7 removed `url` from schema). `pnpm build` passes. ▶ Next (Zohaib): create Neon DB + Vercel project for P0-5/P0-6, then Phase 1.
- **2026-10-09 (AI):** Repo cleaned (CTF track removed, brief → `docs/`), `.gitignore` added, stack locked (`STACK.md`), build plan written (`PLAN.md`), this tracker created. ▶ Next: P0-1 scaffold.
