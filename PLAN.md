# BayFlow — Build Plan & Sprint Roadmap

**Event:** LoopVerse 3.0 — Web Dev (Virtual) · **Goal:** win the Web Dev track.
**Team:** 2 devs — **A = Zohaib (you)** · **B = Teammate**.
**Golden rule from the brief:** *a smaller, correct, deployed product beats a large broken one.* Core first, deploy early, bonus last.

---

## 0. How we score points (build to this, not to taste)

| Criterion | Weight | Where we earn it |
|---|---:|---|
| Core flow completeness | **35%** | The 15-status booking lifecycle working end-to-end **on the live URL**, incl. QC-fail loop + estimate-reject path. |
| Architecture & code quality | **20%** | Explicit state machine, per-transition role guards, audit log, Zod validation, clean folders. |
| Product & UX | **15%** | Landing + booking wizard + role dashboards that each show only that role's work; mobile responsive. |
| Deployment & docs | **10%** | Live URL + README + `.env.example` + seed script + demo accounts. |
| Multi-tenancy & security | **10%** | Owner→many shops, per-shop teams, server-side tenant isolation (Shop A token ⇒ 403/404 on Shop B). |
| Bonus (calling / AI Front Desk) | **10%** | Only counts **if core works**. |

---

## 1. Architecture (one Next.js app, three surfaces)

```
bayflow/
├─ src/
│  ├─ app/
│  │  ├─ (public)/            # landing, shop directory, booking wizard   → anyone
│  │  ├─ (customer)/          # customer dashboard, estimate approve/reject → role: CUSTOMER
│  │  ├─ (shop)/              # POS: SA / Technician / Parts / QC / Owner → shop-scoped staff
│  │  └─ api/                 # route handlers: notifications poll, AI tools, webhooks
│  ├─ lib/
│  │  ├─ db.ts                # Prisma singleton (adapter-pg)
│  │  ├─ auth.ts              # Auth.js v5 config (credentials + JWT)
│  │  ├─ rbac.ts              # requireUser / requireRole(shopId, roles) / scopeToShop  ← tenant isolation lives here
│  │  ├─ booking/
│  │  │  ├─ stateMachine.ts   # SINGLE SOURCE OF TRUTH: statuses, transitions, owning role
│  │  │  └─ transitions.ts    # transition(bookingId, action, actor) → guards + audit write
│  │  ├─ validators/          # Zod schemas (shared client+server)
│  │  └─ notify.ts            # createNotification(...)
│  ├─ components/             # shadcn/ui + shared (StatusTimeline, BookingCard, Bell, ...)
│  └─ server/                 # server actions grouped by domain (bookings, estimates, inventory, shops)
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                 # 3 shops, full teams, services, inventory, slots, demo customer
├─ README.md   ├─ .env.example   ├─ STACK.md   ├─ PLAN.md
```

**Non-negotiables:** tenant `shopId` always derived from the session/membership, never trusted from the client. Status changes only through `transition()`. Every input parsed by Zod at the boundary.

---

## 2. Data model (Prisma entities)

- **User** — id, email (unique), passwordHash, name, phone, createdAt. (Customers and staff are both Users; a User is a "customer" simply by having bookings and no staff membership.)
- **Shop** (tenant) — id, name, address, city, phone, workingHours(json), slotDurationMin, slotCapacity, logoUrl?, ownerId → User.
- **Membership** — id, userId, shopId, role `SERVICE_ADVISOR|TECHNICIAN|QC|PARTS`, active. (Owner = `Shop.ownerId`, implicit full access to own shops.) *Role is per shop.*
- **Service** — id, shopId, name, description, durationMin, basePrice?.
- **Slot** — id, shopId, startsAt, capacity, bookedCount. **Unique(shopId, startsAt)**; capacity enforced in a transaction → no double-booking.
- **Vehicle** — id, customerId, plate, make, model, year, color?, mileage?.
- **Booking** — id, shopId, customerId, vehicleId, slotId, **status** (enum, 15 values), problems(text/json), notes?, assignedTechId?, partsPersonId?, qcInspectorId?, createdAt, updatedAt.
- **Estimate** — id, bookingId, revision, laborCost, status `DRAFT|SENT|APPROVED|REJECTED`, createdById, createdAt.
- **EstimateItem** — id, estimateId, kind `PART|LABOR`, name, qty, unitCost.
- **InventoryItem** — id, shopId, sku, name, qtyOnHand, reorderLevel, unitCost. **Unique(shopId, sku)**.
- **PurchaseOrder** — id, shopId, bookingId, status `ORDERED|PARTIALLY_RECEIVED|RECEIVED`, createdAt.
- **POItem** — id, poId, inventoryItemId?, name, qtyOrdered, qtyReceived.
- **PartAllocation** — id, bookingId, inventoryItemId, qty. (Reserved/deducted; released on cancel.)
- **Issue** — id, bookingId, title, description, createdById(QC), resolved, createdAt. (QC fail loop.)
- **BookingEvent** (audit log) — id, bookingId, fromStatus, toStatus, actorId, actorRole, note?, createdAt.
- **Notification** — id, userId, bookingId?, type, message, read, createdAt.
- *(Bonus)* **CallLog** — bookingId, direction, fromUserId, toUserId, state, startedAt, durationSec, outcome.
- *(Bonus)* **AiTask** — bookingId, callLogId?, summary, intent, sentiment, done.

---

## 3. The booking state machine (the heart — 35%)

Encoded in `lib/booking/stateMachine.ts` as `{ status → { action → { to, ownerRole, guard } } }`. Any transition not in the table is rejected. Every accepted transition writes a **BookingEvent**.

| # | Status | Owner role | Action → Next |
|--:|---|---|---|
| 1 | `PENDING` | Service Advisor | confirm → `CONFIRMED` · decline → `CANCELLED` |
| 2 | `CONFIRMED` | Service Advisor | assignTech → `ASSIGNED` |
| 3 | `ASSIGNED` | Technician (assigned) | startInspect → `INSPECTING` |
| 4 | `INSPECTING` | Technician (assigned) | submitEstimate → `ESTIMATE_REVIEW` |
| 5 | `ESTIMATE_REVIEW` | Service Advisor | sendToCustomer → `AWAITING_CUSTOMER` (may edit → revision++) |
| 6 | `AWAITING_CUSTOMER` | Customer | accept → `ESTIMATE_APPROVED` · reject → `ESTIMATE_REJECTED` |
| 7 | `ESTIMATE_APPROVED` | Service Advisor | assignParts → `PARTS_PENDING` |
| — | `ESTIMATE_REJECTED` | Service Advisor | revise → `ESTIMATE_REVIEW` · cancel → `CANCELLED` |
| 8 | `PARTS_PENDING` | Parts Person | order → `PARTS_ORDERED` · (all in stock) ready → `PARTS_READY` |
| 9 | `PARTS_ORDERED` | Parts Person | receiveAll → `PARTS_READY` · receivePartial → stays `PARTS_ORDERED` |
| 10 | `PARTS_READY` | Parts Person | allocate → `IN_REPAIR` (stock deducted) |
| 11 | `IN_REPAIR` | Technician (assigned) | sendToQC → `QC_PENDING` |
| 12 | `QC_PENDING` | any QC of shop | pick → `QC_IN_PROGRESS` (first-to-pick **locks** `qcInspectorId`) |
| 13 | `QC_IN_PROGRESS` | QC (locked) | pass → `READY_FOR_PICKUP` · fail → `IN_REPAIR` (+ Issue) |
| 14 | `READY_FOR_PICKUP` | Service Advisor | notifyReady / complete → `COMPLETED` |
| 15 | `COMPLETED` | — | final |

**Edge cases to implement:** estimate reject → revise or cancel; parts already in stock skips ordering; partial delivery stays ORDERED; QC fail creates an Issue and loops to the tech; cancel before `IN_REPAIR` releases reserved parts; slot capacity enforced transactionally.

**Notifications (min):** new booking→SAs; tech assigned→that tech; estimate submitted→SA; estimate sent→customer; accept/reject→SA; parts needed/ready→parts/tech; sent to QC / QC fail→QC queue/tech; ready→customer. In-app bell with unread count.

---

## 4. Phases & sprints

Each sprint lists **owner (A/B/both)** and **"done when"** (acceptance). Tasks also live in the **live tracker** (link in the kickoff message) so we both update status from our own devices.

### Phase 0 — Foundation & first deploy  *(both, ~half day)*
- [both] Scaffold Next 16 app (`pnpm create next-app@latest`), Tailwind, shadcn/ui init, ESLint+Prettier.
- [A] Prisma init + Neon DB + `.env`/`.env.example`; `db.ts` singleton (adapter-pg).
- [B] Auth.js v5 skeleton (credentials + JWT), login/logout pages shell.
- [both] **Deploy empty app to Vercel → live URL.** ← *do this today, before features.*
- **Done when:** live URL loads, DB connects, one test user can log in.

### Phase 1 — Auth & multi-tenancy  *(A lead)*
- Owner signup + login; customer login (email+password from booking, reuse if exists); staff login (owner-created).
- `Membership` model + `rbac.ts` (`requireRole(shopId, roles)`, `scopeToShop`).
- Owner: create shop, add/edit/deactivate team members, create more shops, **shop switcher**, service catalog CRUD.
- **Done when:** Shop-A staff token ⇒ **403/404** on Shop-B bookings (write the test). Owner runs 2 shops with separate teams.

### Phase 2 — Public portal & booking creation  *(B lead)*
- Landing page (hero + shop grid: name, city, services, search/city filter).
- Booking wizard: shop → services/problems (+free text) → slot picker (only available slots) → personal+vehicle details → review/confirm.
- Create booking `PENDING`; create/reuse customer account; slot capacity enforced.
- **Done when:** a visitor can book on the live URL and the booking appears on the SA dashboard.

### Phase 3 — State machine end-to-end  *(A + B, the big one)*
- `stateMachine.ts` + `transition()` with role guards + audit log (A).
- Estimate (items, labor, revision) + SA edit + send; customer approve/reject (A+B).
- SA dashboard (confirm/assign/review/send/notify/complete) + Technician dashboard (inspect/estimate/repair/sendQC) (B).
- **Done when:** customer→COMPLETED runs live; invalid transitions rejected; estimate-reject path works.

### Phase 4 — Inventory & procurement  *(A lead)*
- Per-shop inventory table; required-vs-available; PO create/receive (stock +); allocate (stock −); cancel releases parts.
- Wire into `PARTS_PENDING/ORDERED/READY`.
- **Done when:** the worked example's parts flow (coil ordered, received, allocated) works and stock numbers are correct.

### Phase 5 — QC loop, notifications, dashboards polish  *(A + B)*
- QC queue with first-to-pick lock; pass → ready, fail → Issue + loop to tech (A).
- Notification bell + unread count + SWR polling; Parts & QC dashboards; Owner overview + shop switcher (B).
- **Done when:** QC-fail loop works live; every role sees only their work; bell updates.

### Phase 6 — Seed, docs, hardening, final deploy  *(both)*
- `seed.ts`: ≥3 shops, full team per role, services, inventory, slots, a demo customer + booking.
- README (prereqs, install, env, migrate+seed, run, **demo accounts for every role**, architecture, deploy notes); `.env.example` complete.
- Vitest for the state machine (invalid transitions rejected); Playwright happy-path; tenant-isolation test.
- **Done when:** a stranger follows the README and runs it; Definition of Done (below) all green on the live URL.

### Phase 7 — BONUS (only if core is green)  *(split)*
- In-app calling (WebRTC/Twilio) + call log (A).
- AI Front Desk: Claude tool-calling over the caller's own bookings + SA task/summary (B).
- Owner analytics / invoice PDF / SSE live updates (stretch).

---

## 5. Definition of Done (core)

- [ ] A judge completes **customer booking → COMPLETED** on the live URL with seeded accounts.
- [ ] **QC-fail loop** and **estimate-rejected** path both work.
- [ ] **No role can perform another role's action** (guards enforced + tested).
- [ ] Shop-A staff **cannot** read/modify Shop-B data (tested).
- [ ] README + `.env.example` let a stranger run it; no secrets committed.
- [ ] Live URL is seeded and reachable.

---

## 6. Working agreement (2 devs, 2 machines)

- **Branches:** `main` is always deployable. Work on `feat/<phase>-<thing>`, open PR, quick review, merge. Small commits, meaningful messages.
- **No conflicts rule:** A owns `lib/`, `prisma/`, `server/` (backend/state machine); B owns `app/(public)`, `app/(customer)`, `components/` (frontend). Shared files (schema, validators) → ping in the tracker before editing.
- **Deploy:** every merge to `main` auto-deploys to Vercel. Check the preview URL before merging.
- **Tracker:** update your task's status on the live board the moment you start/finish, so we always know who's on what. The board is our record.
