# BayFlow — Build Plan & Sprint Roadmap

**Event:** LoopVerse 3.0 — Web Dev (Virtual) · **Goal:** win the Web Dev track.
**Team:** 2 devs — **A = Zohaib** · **B = Teammate** (+ Claude as a pair).
**Golden rule from the brief:** *a smaller, correct, deployed product beats a large broken one.* Core first, deploy early, bonus last.

---

## 0. How we score points (build to this, not to taste)

| Criterion | Weight | Where we earn it |
|---|---:|---|
| Core flow completeness | **35%** | The booking lifecycle working end-to-end **on the live URL**, incl. QC-fail loop + estimate-reject path. |
| Architecture & code quality | **20%** | Explicit state machine, per-transition role guards, audit log, Zod validation, clean folders, tests. |
| Product & UX | **15%** | Landing + booking wizard + role dashboards that each show only that role's work; mobile; light/dark. |
| Deployment & docs | **10%** | Live URL + README + `.env.example` + seed script + demo accounts. |
| Multi-tenancy & security | **10%** | Owner→many shops, per-shop teams, server-side tenant isolation (Shop A session ⇒ 403/404 on Shop B). |
| Bonus (calling / AI Front Desk) | **10%** | Only counts **if core works**. |

---

## 1. Architecture (one Next.js app, three surfaces) — as built

```
src/
├─ app/
│  ├─ page.tsx, book/[shopId]/        # public: landing + directory, booking wizard
│  ├─ account/                        # customer: bookings, estimate approve/reject, pick-up
│  ├─ pos/[shopId]/                   # POS: overview (per role), bookings, job page, qc,
│  │                                  #      inventory, purchase-orders, team, services, settings
│  ├─ pos/new/                        # create a shop
│  └─ api/                            # REST route handlers (JSON, proper status codes)
├─ lib/
│  ├─ booking/state-machine.ts        # ★ SINGLE SOURCE OF TRUTH: actions, transitions, who may act
│  ├─ booking/status-meta.ts          # display only: tones, phases, customer copy
│  ├─ rbac.ts                         # ★ requireUser / requireShopAccess / requireBookingAccess
│  ├─ slots.ts, time.ts               # slots from working hours, shop time (Asia/Karachi)
│  └─ errors.ts, api.ts, page-guard.ts
├─ server/
│  ├─ services/                       # domain logic, explicit Actor, no Next imports (seed reuses it)
│  │  ├─ transition.ts                # ★ the only writer of Booking.status (guard + CAS + audit)
│  │  ├─ workflow.ts, parts.ts, bookings.ts, shops.ts, common.ts
│  ├─ actions/                        # server actions: auth → service → refresh()
│  └─ queries/                        # read models for pages
├─ components/                        # booking/, pos/, marketing/, theme/, ui/ (shadcn)
└─ proxy.ts                           # optimistic login redirect (keeps deep links)
prisma/  schema.prisma · migrations/ · seed.ts (idempotent demo reset)
e2e/     Playwright specs (Chrome)
```

**Non-negotiables:** a `shopId` may come from the URL (the shop switcher needs it) but is **never trusted** — every request proves membership/ownership server-side and shop rows are always loaded with `where: { id, shopId }`. Status changes only through `transition()`. Every input parsed by Zod at the boundary.

---

## 2. Data model (Prisma) — as built

- **User** — email (unique), passwordHash, name, phone. Customers and staff are both Users; "staff" via Membership, "owner" via `Shop.ownerId`, "customer" by having bookings.
- **Shop** (tenant) — name, address, city, phone, description, rating (placeholder), workingHours (json per weekday), slotDurationMin, slotCapacity, ownerId.
- **Membership** — userId, shopId, role `SERVICE_ADVISOR|TECHNICIAN|QC|PARTS`, active. Unique (user, shop, role). *Role is per shop.*
- **Service** — shopId, name, description, durationMin, basePrice?, active.
- **Slot** — shopId, startsAt, capacity, bookedCount. **Unique(shopId, startsAt)**. Created lazily on first booking; capacity claimed atomically.
- **Vehicle** — customerId, plate, make, model, year, color?, mileage?.
- **Booking** — **code** (human ref, unique), shopId, customerId, vehicleId, slotId, **status** (15 lifecycle statuses + CANCELLED), serviceNames (snapshot), problems, notes, assignedTechId, partsPersonId, qcInspectorId.
- **BookingEvent** (audit log) — fromStatus, toStatus, actorId, actorRole, note, createdAt.
- **Estimate** — revision, status `DRAFT|SENT|APPROVED|REJECTED`, createdBy, sentAt, respondedAt, customerNote. One row per version (rejected versions kept).
- **EstimateItem** — kind `PART|LABOR`, name, qty, unitCost, **inventoryItemId** (PART lines → shortages computed automatically).
- **InventoryItem** — shopId, sku (unique per shop), name, qtyOnHand (free on the shelf), reorderLevel, unitCost.
- **PurchaseOrder / POItem** — status `ORDERED|PARTIALLY_RECEIVED|RECEIVED`, optional bookingId, supplier; qtyOrdered/qtyReceived per line.
- **PartAllocation** — bookingId × inventoryItemId, qty, status `RESERVED|ALLOCATED|RELEASED`.
- **StockMovement** (ledger) — delta, reason `RECEIVE|RESERVE|RELEASE|ADJUST`, booking/PO, actor.
- **Issue** — QC failures: title, description, createdBy, resolved, resolvedAt.
- **Notification** — userId, bookingId?, type, message, href, read.
- *(Bonus, schema ready)* **CallLog** (shopId, bookingId?) · **AiTask** (shopId, bookingId?, callLogId?, summary, intent, sentiment, done).

Money is whole PKR integers.

---

## 3. The booking state machine (the heart — 35%) — as built

`lib/booking/state-machine.ts`: `TRANSITIONS[action] = { from: Status[], to: Status, by: Party[] }`. Parties are relative to the booking: **ADVISOR** (SA of the shop, or the Owner for support), **ASSIGNED_TECH**, **ASSIGNED_PARTS**, **ANY_QC**, **CLAIMED_QC** (who picked it), **CUSTOMER** (the booking's own). Anything not in the table is rejected (409 wrong status, 403 wrong role).

| # | Status | Waiting on | Action → Next |
|--:|---|---|---|
| 1 | `PENDING` | Advisor | confirm → `CONFIRMED` · decline → `CANCELLED` |
| 2 | `CONFIRMED` | Advisor | assignTechnician → `ASSIGNED` (confirm + assign can be one step) |
| 3 | `ASSIGNED` | Technician (assigned) | startInspection → `INSPECTING` |
| 4 | `INSPECTING` | Technician (assigned) | submitEstimate → `ESTIMATE_REVIEW` |
| 5 | `ESTIMATE_REVIEW` | Advisor | sendEstimate → `AWAITING_CUSTOMER` (edits bump the revision) · returnToTechnician → `INSPECTING` |
| 6 | `AWAITING_CUSTOMER` | Customer | approveEstimate → `ESTIMATE_APPROVED` · rejectEstimate → `ESTIMATE_REJECTED` (time-stamped) |
| — | `ESTIMATE_REJECTED` | Advisor | reviseEstimate → `ESTIMATE_REVIEW` (new version) · returnToTechnician → `INSPECTING` · cancel |
| 7 | `ESTIMATE_APPROVED` | Advisor | assignParts → `PARTS_PENDING` |
| 8 | `PARTS_PENDING` | Parts (assigned) | check stock: reserve shelf stock; nothing missing → markPartsReady → `PARTS_READY`; else PO + orderParts → `PARTS_ORDERED` |
| 9 | `PARTS_ORDERED` | Parts (assigned) | receive delivery (partial stays here) → when all reserved, markPartsReady → `PARTS_READY` |
| 10 | `PARTS_READY` | Parts (assigned) | allocateParts → `IN_REPAIR` (reservations → allocated) |
| 11 | `IN_REPAIR` | Technician (assigned) | sendToQc → `QC_PENDING` (resolves open issues) |
| 12 | `QC_PENDING` | any QC | claimQc → `QC_IN_PROGRESS` (first to pick locks it; second gets 409) |
| 13 | `QC_IN_PROGRESS` | QC (claimer) | passQc → `READY_FOR_PICKUP` · failQc → `IN_REPAIR` (+ Issue, lock released) |
| 14 | `READY_FOR_PICKUP` | Advisor / Customer | notifyReady (logged, no status change) · complete → `COMPLETED` (advisor or customer) |
| 15 | `COMPLETED` | — | final |
| — | any status before `IN_REPAIR` | Advisor or Customer | cancel → `CANCELLED` (reserved parts + slot released) |

**Notifications:** new booking → advisors · tech assigned → that tech · estimate submitted → advisors · estimate sent → customer · approved/rejected → advisors · parts needed → parts person · parts ready / allocated → technician · sent to QC → QC inspectors · QC failed → technician · QC passed → advisors · ready for pick-up → customer · cancelled → the other side. Bell with unread count, polled every 15 s.

---

## 4. Phases & status

| Phase | Theme | Status |
|---|---|---|
| 0 | Foundation & first deploy | ✅ code done · ⏳ Vercel/GitHub (needs Zohaib's accounts) |
| 1 | Auth & multi-tenancy | ✅ owner signup, staff/customer login, RBAC, shop/team/services, switcher, isolation tests |
| 2 | Public portal & booking | ✅ landing + search/city filter, 4-step wizard, live availability, account create/reuse |
| 3 | State machine end-to-end | ✅ 21 actions, guards, audit log, estimates + versions, reject path, all role dashboards |
| 4 | Inventory & procurement | ✅ reserve/order/partial receive/allocate/release, stock ledger, restock POs |
| 5 | QC loop, notifications, dashboards | ✅ QC queue with lock, fail loop, bell, owner overview |
| 6 | Seed, docs, hardening, deploy | ✅ seed (5 shops, demo bookings), README, tests (34 unit + 28 Playwright E2E, all green) · ⏳ live deploy |
| 7 | Bonus | ☐ in-app calling + AI Front Desk (schema ready) |

## 5. Definition of Done (core)

- [x] Customer booking → COMPLETED works end-to-end with seeded accounts (`e2e/lifecycle.spec.ts`).
- [x] **QC-fail loop** and **estimate-rejected** path both work (same test).
- [x] **No role can perform another role's action** (Vitest + `e2e/security.spec.ts`).
- [x] Shop-A staff **cannot** read/modify Shop-B data (`e2e/security.spec.ts`).
- [x] README + `.env.example` let a stranger run it; no secrets committed.
- [ ] Live URL is seeded and reachable — **deploy pending (P0-5/6)**.

## 6. Working agreement (2 devs, 2 machines)

- **Branches:** `main` is always deployable. Work on `feat/<phase>-<thing>`, small commits, meaningful messages.
- **Ownership:** A owns `lib/`, `prisma/`, `server/`; B owns `app/`, `components/`. Shared files (schema, state machine) → ping in the tracker first.
- **Before pushing:** `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm test:e2e` for workflow changes).
- **Tracker:** update [TRACKER.md](TRACKER.md) when you start/finish a task.
