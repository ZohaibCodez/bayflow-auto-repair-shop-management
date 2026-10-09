# BayFlow — Task Tracker 📋

> **This file is our source of truth for who's doing what.** It lives in the repo, so both devices stay in sync through git, and every change is recorded in git history. Claude also updates this file as it completes work.

**How to use**
1. Grab a task → set its **Status** to `◐ Doing` and put your initial in **Owner** (`Z` = Zohaib, `T` = Teammate, `AI` = Claude).
2. Finish it → set **Status** to `☑ Done` and add a dated line to the **Activity Log** at the bottom.
3. Stuck → set `⊘ Blocked` and write why in **Notes**.
4. Commit the tracker change with your code (or on its own): `git commit -m "track: P1-2 done"`.

**Status legend:** `☐ Todo` · `◐ Doing` · `☑ Done` · `⊘ Blocked`
**Owners:** `Z` Zohaib · `T` Teammate · `AI` Claude · `—` unassigned

**Current focus:** ▶ **Phase 0 — Foundation & first deploy**
**Last updated:** 2026-10-09 (by AI) — foundation docs + tracker created.

---

## Progress at a glance

| Phase | Theme | Tasks done | Status |
|---|---|---|---|
| 0 | Foundation & first deploy | 0 / 6 | ▶ active |
| 1 | Auth & multi-tenancy | 0 / 5 | ☐ |
| 2 | Public portal & booking creation | 0 / 4 | ☐ |
| 3 | State machine end-to-end | 0 / 5 | ☐ |
| 4 | Inventory & procurement | 0 / 3 | ☐ |
| 5 | QC loop, notifications, dashboards | 0 / 4 | ☐ |
| 6 | Seed, docs, hardening, deploy | 0 / 5 | ☐ |
| 7 | Bonus (calling / AI Front Desk) | 0 / 4 | 🔒 locked until core green |

---

## Phase 0 — Foundation & first deploy  (both)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P0-1 | Scaffold Next 16 app (`pnpm create next-app@latest`) + Tailwind + ESLint/Prettier | — | ☐ | TS, App Router, Turbopack, `@/*` alias |
| P0-2 | Init shadcn/ui + base components (button, input, card, table, dialog, badge) | — | ☐ | |
| P0-3 | Prisma init + Neon DB; `db.ts` singleton (adapter-pg); `.env.local` | — | ☐ | DATABASE_URL + DIRECT_URL |
| P0-4 | Auth.js v5 skeleton (credentials + JWT); login/logout shell | — | ☐ | |
| P0-5 | **Deploy empty app to Vercel → live URL** | — | ☐ | do this before features; paste URL in README |
| P0-6 | Connect GitHub repo (public) + Vercel auto-deploy on push to `main` | — | ☐ | gh CLI not installed — create repo on github.com |

**Done when:** live URL loads, DB connects, one test user can log in.

## Phase 1 — Auth & multi-tenancy  (Z lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P1-1 | User model + owner signup + login (customer + staff login) | — | ☐ | reuse account if email exists |
| P1-2 | `Membership` model + `rbac.ts` (`requireRole`, `scopeToShop`) | — | ☐ | role per shop |
| P1-3 | Owner: create shop; add/edit/deactivate team members | — | ☐ | |
| P1-4 | Owner: multiple shops + shop switcher; service catalog CRUD | — | ☐ | |
| P1-5 | **Tenant isolation test**: Shop-A token ⇒ 403/404 on Shop-B | — | ☐ | graded (10%) |

**Done when:** Shop-A staff cannot touch Shop-B data; owner runs 2 shops with separate teams.

## Phase 2 — Public portal & booking creation  (T lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P2-1 | Landing page: hero + shop grid (name, city, services) + search/city filter | — | ☐ | mobile responsive |
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

- **2026-10-09 (AI):** Repo cleaned (CTF track removed, brief → `docs/`), `.gitignore` added, stack locked (`STACK.md`), build plan written (`PLAN.md`), this tracker created. Foundation committed. ▶ Next: P0-1 scaffold.
