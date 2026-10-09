# BayFlow — Task Tracker 📋

> **This file is our source of truth for who's doing what.** It lives in the repo, so both devices stay in sync through git, and every change is recorded in git history. Claude also updates this file as it completes work.

**How to use**
1. Grab a task → set its **Status** to `◐ Doing` and put your initial in **Owner** (`Z` = Zohaib, `T` = Teammate, `AI` = Claude).
2. Finish it → set **Status** to `☑ Done` and add a dated line to the **Activity Log** at the bottom.
3. Stuck → set `⊘ Blocked` and write why in **Notes**.
4. Commit the tracker change with your code (or on its own): `git commit -m "track: P1-2 done"`.

**Status legend:** `☐ Todo` · `◐ Doing` · `☑ Done` · `⊘ Blocked`
**Owners:** `Z` Zohaib · `T` Teammate · `AI` Claude · `—` unassigned

**Current focus:** ▶ **Core product is complete and tested (unit + Playwright E2E). Next: deploy to Vercel (P0-5/6), delete the 3 duplicate shops from the old seed, then the bonus track (P7).**
**Last updated:** 2026-10-09 (by AI)

---

## Progress at a glance

| Phase | Theme | Tasks done | Status |
|---|---|---|---|
| 0 | Foundation & first deploy | 4 / 6 | ⊘ only the Vercel + GitHub deploy left (needs Zohaib's accounts) |
| 1 | Auth & multi-tenancy | 6 / 6 | ☑ |
| 2 | Public portal & booking creation | 4 / 4 | ☑ |
| 3 | State machine end-to-end | 5 / 5 | ☑ |
| 4 | Inventory & procurement | 3 / 3 | ☑ |
| 5 | QC loop, notifications, dashboards | 4 / 4 | ☑ |
| 6 | Seed, docs, hardening, deploy | 4 / 5 | ◐ final live deploy + smoke test left |
| 7 | Bonus (calling / AI Front Desk) | 0 / 4 | ☐ unlocked — core is green |

---

## Phase 0 — Foundation & first deploy  (both)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P0-1 | Scaffold Next 16 app + Tailwind 4 + ESLint | AI | ☑ | Next 16.4, React 19.3, TS strict, App Router, `src/`, `@/*` |
| P0-2 | Init shadcn/ui + base components | AI | ☑ | base-nova (Base UI); + textarea, native-select |
| P0-3 | Prisma schema + client + `db.ts` + seed | AI | ☑ | Prisma pinned 6.19.3; Neon migrated (2 migrations) + seeded |
| P0-4 | Auth.js v5 (credentials + JWT) + login | AI | ☑ | session lifetime from `AUTH_SESSION_DAYS`; emails case-insensitive |
| P0-5 | **Deploy to Vercel → live URL** | Z | ⊘ | needs Zohaib's Vercel account — see README "Deployment" (set function region = Neon region) |
| P0-6 | Public GitHub repo + auto-deploy on push | Z | ⊘ | Zohaib pushes (Claude commits locally only) |

## Phase 1 — Auth & multi-tenancy  (Z lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P1-0 | Brand + design system | AI | ☑ | graphite + signal-amber; **light + dark** palettes, one-click toggle (follows OS until clicked, persisted) |
| P1-1 | Owner signup + login (customer + staff) + role routing | AI | ☑ | `/dashboard` routes staff → POS, customers → account; `proxy.ts` keeps deep links |
| P1-2 | Membership + `rbac.ts` | AI | ☑ | `requireShopAccess`, `requireBookingAccess`, `canViewBooking`; techs see only assigned jobs |
| P1-3 | Owner: create shop; add/edit/deactivate team | AI | ☑ | `/pos/new`, `/pos/[shop]/team` (temp password; reuses existing accounts) |
| P1-4 | Multiple shops + switcher; service catalogue CRUD | AI | ☑ | switcher in sidebar; `/pos/[shop]/services`, `/settings` (hours, slot length, bays) |
| P1-5 | **Tenant isolation test**: Shop-A ⇒ 403/404 on Shop-B | AI | ☑ | `e2e/security.spec.ts` |

## Phase 2 — Public portal & booking creation  (T lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P2-1 | Landing + shop grid + search/city filter | AI | ☑ | ratings, descriptions, next opening from working hours |
| P2-2 | Booking wizard | AI | ☑ | services → live slots → details/vehicle → review; animated; sticky summary |
| P2-3 | Only available slots; capacity enforced | AI | ☑ | slots from working hours (shop time); atomic claim — tested with concurrent bookings |
| P2-4 | Create `PENDING`; create/reuse customer account | AI | ☑ | signs the new customer in; wrong password for an existing email → clear error |

## Phase 3 — State machine end-to-end  (Z + T)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P3-1 | `state-machine.ts` | AI | ☑ | 21 actions, party-based guards, 34 Vitest tests |
| P3-2 | `transition()` + audit log | AI | ☑ | compare-and-set status update + BookingEvent in the same transaction |
| P3-3 | Estimate + SA edit + send | AI | ☑ | parts from inventory, live totals, revision bumps on SA edits |
| P3-4 | Customer approve/reject; revise or cancel | AI | ☑ | rejected version + reason kept; return-to-technician option |
| P3-5 | Role dashboards | AI | ☑ | advisor lanes, technician bay, parts desk, QC queue, owner overview, job page action panel |

## Phase 4 — Inventory & procurement  (Z lead)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P4-1 | Inventory table + required-vs-available | AI | ☑ | on shelf / reserved / on order / reorder; stock ledger |
| P4-2 | Purchase orders: create / receive / partial | AI | ☑ | booking POs + restock POs; partial delivery keeps `PARTS_ORDERED` |
| P4-3 | Allocate; cancel releases parts | AI | ☑ | tested: stock returns exactly on cancel |

## Phase 5 — QC loop, notifications, dashboards  (Z + T)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P5-1 | QC queue with first-to-pick lock | AI | ☑ | tested with two inspectors claiming at once |
| P5-2 | Pass → ready; fail → Issue + loop | AI | ☑ | QC checklist; issue shown to the technician |
| P5-3 | Notification bell + unread + polling | AI | ☑ | all brief §5.4 events + more; click-through links |
| P5-4 | Parts & QC dashboards; owner overview | AI | ☑ | owner: stats, bookings by stage, team, inventory, QC pass rate |

## Phase 6 — Seed, docs, hardening, final deploy  (both)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P6-1 | Seed: ≥3 shops, teams, services, inventory, demo bookings | AI | ☑ | 5 shops / 2 owners; 5 Lahore bookings at different stages; idempotent "reset demo" |
| P6-2 | README complete | AI | ☑ | prereqs, env table, db, run, tests, demo accounts, walkthrough, architecture, API, deploy |
| P6-3 | Vitest for the state machine | AI | ☑ | `pnpm test` |
| P6-4 | Playwright: lifecycle + tenant isolation + more | AI | ☑ | `pnpm test:e2e` (installed Chrome) — lifecycle, security, owner, public specs |
| P6-5 | Final deploy + smoke test on live URL | Z | ☐ | `E2E_BASE_URL=<live> pnpm test:e2e` |

## Phase 7 — BONUS  (core is green — unlocked)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P7-1 | In-app calling SA ↔ customer + call log | — | ☐ | LiveKit recommended; `CallLog` model ready |
| P7-2 | AI Front Desk: Claude tool calling over caller's own bookings | — | ☐ | narrow tools; guardrailed |
| P7-3 | AI call summary + SA task (mark done) | — | ☐ | `AiTask` model ready |
| P7-4 | Stretch: invoice, vehicle history, owner analytics | AI | ☑ | printable invoice/job sheet (`/invoice/[id]`, print-safe in dark mode), service history per plate on the job page, revenue + avg turnaround + QC pass rate. SSE live updates still open |

## Housekeeping

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| H-1 | Delete the 3 duplicate shops from the old (non-idempotent) seed | Z | ☐ | they have no bookings; see the command in the session notes / ask Claude |
| H-2 | Rotate the Neon password + `AUTH_SECRET` before the repo goes public | Z | ☐ | they were shared in chat and sit in `docs/Requirement.txt` (now git-ignored) |

---

## Activity Log  (newest first — append dated lines here for the record)

- **2026-10-09 (AI):** Extras from brief §8.3: printable invoice/job sheet (customer + staff, access-checked, light palette when printing), vehicle service history by plate, owner revenue + average turnaround. Covered by the lifecycle E2E (35 unit tests now). Full run from a fresh seed earlier: Vitest 34/34, Playwright 29/29.
- **2026-10-09 (AI):** Core product built and tested. State machine (21 actions, party guards) + RBAC/tenant isolation + workflow services (transactions, compare-and-set, audit log, stock ledger); schema migration `workflow_core`; idempotent seed driving demo bookings through the real services. UI: POS shell (switcher, role nav, bell), role overviews, job page with role-aware action panel + estimate editor, bookings list, QC queue, inventory, POs, team, services, settings, create shop; customer wizard + portal; light/dark toggle; landing search/filter. REST API with 401/403/404/409/422. Tests: Vitest 34 + Playwright (Chrome) lifecycle/security/owner/public — found and fixed a concurrent first-booking slot race (500 → 409), a wizard default-day issue and lost deep links after login. ▶ Next: deploy (P0-5/6), H-1/H-2, bonus.
- **2026-10-09 (AI):** Shipped the brand + first UI: design system, cinematic landing with live shop directory, login + owner signup. `pnpm build` green.
- **2026-10-09 (AI):** Neon connected, migrated and seeded. Demo password `password123`.
- **2026-10-09 (AI):** Phase 0 code done — Next 16.4 scaffold, Prisma schema, Auth.js v5, shadcn/ui.
- **2026-10-09 (AI):** Repo cleaned, `.gitignore`, stack locked (`STACK.md`), plan (`PLAN.md`), this tracker.
