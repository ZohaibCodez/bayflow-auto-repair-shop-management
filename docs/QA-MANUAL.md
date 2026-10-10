# BayFlow — Manual QA Manual

A click-by-click pass over every feature the hackathon brief asks for. Work top to
bottom; each block builds on the one before it.

**Section references** (`§x.y`) point at *Web Dev - Virtual.pdf* in this folder, so a
failure can be quoted straight back at the rubric.

---

## How to use this

- Tick `[x]` as you go. Anything that fails, write the actual behaviour next to it.
- **Do not skip Step 0.** Several tests assume a known starting state.
- Keep two browser profiles open: a normal window and a private/incognito one. You
  need two simultaneous sessions for the QC lock test (T‑H3) and all of the calling
  tests (Block N).
- Password for every demo account: `password123`
- The login page has one-click role buttons — faster than typing emails.

### Booking codes change on every reseed

Demo bookings are identified in this manual by **customer + plate**, never by code,
because `BF-XXXXXX` is regenerated each time you seed.

### Resetting

Any time the data gets messy — and it will, that is the point of testing — get back
to a pristine demo in one command:

```bash
pnpm db:demo      # deletes all non-canonical shops/users, then reseeds
pnpm db:clean     # dry run first, if you want to see what would go
```

`db:demo` removes every shop that is not one of the five seeded ones (including any
you created through `/pos/new` while testing) and every account that is not a seeded
demo account, then rebuilds the five shops and six demo bookings. It is safe to run
as often as you like.

---

## Step 0 — Start from a known state

| # | Do this | Expect | ✓ |
|---|---|---|---|
| 0.1 | `pnpm db:demo` | Ends with `✅ Seed complete — 5 shops, 5 Lahore demo bookings + 1 in Karachi.` | [ ] |
| 0.2 | `pnpm dev` | Starts on `http://localhost:3000`, no errors in the terminal | [ ] |
| 0.3 | Open `http://localhost:3000` | Landing page renders, no console errors (F12) | [ ] |

**The starting board** — five shops, and in Lahore Auto Care:

| Customer | Vehicle | Plate | Status | Used by |
|---|---|---|---|---|
| Ahmed Khan | Honda Civic | `LEA-1234` | Awaiting customer | Blocks F, G, N, O |
| Sana Iqbal | Toyota Corolla | `LED-4521` | Pending | Block D |
| Ali Raza | Honda City | `LEB-7781` | Assigned | Block E |
| Sana Iqbal | Suzuki Swift | `LEC-1209` | QC pending | Block H |
| Ali Raza | Kia Sportage | `LEF-3300` | Ready for pick-up | Block I |

---

## Block A — Landing page & shop directory  (§7.3)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| A1 | Load `/` | Hero section renders; the animated bay floor appears | [ ] |
| A2 | Scroll to the shop grid | **Exactly 5 shops**, no duplicates, no "E2E Motors" | [ ] |
| A3 | Read one shop card | Shows name, city, rating, services offered | [ ] |
| A4 | Type `Lahore` in the search box | Grid narrows to Lahore Auto Care | [ ] |
| A5 | Clear search, filter by city `Karachi` | Only Karachi Motor Works | [ ] |
| A6 | Filter by a city with no shop | A graceful empty state, not a blank page or crash | [ ] |
| A7 | Click the theme toggle | Whole page flips light↔dark; **the logo swaps colour too** | [ ] |
| A8 | Reload after toggling | Theme persists | [ ] |
| A9 | Check the browser tab | Favicon is the BayFlow "B", not the Next.js default | [ ] |
| A10 | DevTools → responsive → 390 px wide | No horizontal scrollbar; nav collapses; cards stack | [ ] |
| A11 | Click *How it works* / *How a repair flows* | Scrolls to the lifecycle section | [ ] |

---

## Block B — Booking wizard, new customer  (§5.1, §7.3)

Creates **Booking #1**. Use a fresh email you'll remember, e.g. `qa1@test.com`.

| # | Do this | Expect | ✓ |
|---|---|---|---|
| B1 | From `/`, click **Lahore Auto Care** | Wizard opens at `/book/shop_lahore` | [ ] |
| B2 | Step 1 — tick **Check engine light** *and* **Oil change** | Multi-select works; both highlighted | [ ] |
| B3 | Type free-text notes: *"Light came on yesterday, vibrates at idle."* | Accepted | [ ] |
| B4 | Try **Next** with nothing selected (go back and deselect) | Blocked with a clear message — not a silent no-op | [ ] |
| B5 | Step 2 — pick a date | Only that shop's **available** slots show | [ ] |
| B6 | Pick a time slot | Selection is visibly confirmed | [ ] |
| B7 | Check a day the shop is closed | No slots offered (working hours respected) | [ ] |
| B8 | Step 3 — enter name, email `qa1@test.com`, password | Accepted | [ ] |
| B9 | Enter vehicle: plate `QA-0001`, Honda, Civic, 2016 | Accepted | [ ] |
| B10 | Submit with an invalid email | Rejected with a field-level error | [ ] |
| B11 | Step 4 — review | Shows chosen services, slot, vehicle, notes | [ ] |
| B12 | Confirm | Booking created; you are **signed in automatically** | [ ] |
| B13 | Land on the customer portal | Booking appears with status **Pending** | [ ] |

---

## Block C — Authentication & account reuse  (§7.1, §11 FAQ)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| C1 | Sign out. Book again with `qa1@test.com` + the **correct** password | Existing account **reused**, no duplicate user | [ ] |
| C2 | Book again with `qa1@test.com` + a **wrong** password | Clear error; booking **not** created | [ ] |
| C3 | Log in at `/login` as `customer@bayflow.test` | Lands on the customer portal | [ ] |
| C4 | Log in as `sa.lahore@bayflow.test` | Lands on the **POS**, not the customer portal | [ ] |
| C5 | Log in as `owner@bayflow.test` | Lands on the POS with the shop switcher | [ ] |
| C6 | Wrong password on a real account | Rejected; no session created | [ ] |
| C7 | While logged out, open `/pos/shop_lahore` directly | Redirected to login — **then back to that page** after signing in | [ ] |
| C8 | Open `/account` while logged out | Redirected to login | [ ] |
| C9 | Check there is no public staff sign-up | `/signup` creates **owners only**; staff are created by the owner (§4) | [ ] |

---

## Block D — Service Advisor: confirm & assign  (§5.2 steps 1–2)

Sign in as `sa.lahore@bayflow.test`.

| # | Do this | Expect | ✓ |
|---|---|---|---|
| D1 | Look at **Overview** | Your new booking + Sana's Corolla are surfaced as needing action | [ ] |
| D2 | Open the notification bell | Unread count > 0; a *new booking* entry (§5.4) | [ ] |
| D3 | Click the notification | Jumps to that booking's job page | [ ] |
| D4 | Go to **Bookings** | Full list for this shop; filter by status works | [ ] |
| D5 | Open Sana Iqbal · `LED-4521` (Pending) | Job page shows vehicle, services, reported problem, audit log | [ ] |
| D6 | Click **Confirm booking** | Status → **Confirmed** | [ ] |
| D7 | Click **Assign technician**, choose Imran | Status → **Assigned** | [ ] |
| D8 | Re-read the audit log | Two new entries: who, when, from → to | [ ] |
| D9 | Open your own Booking #1 and **Decline booking** | Status → **Cancelled** | [ ] |
| D10 | On a cancelled booking, look for workflow actions | None offered — it is terminal | [ ] |

---

## Block E — Technician: inspect & estimate  (§5.2 steps 3–4, §7.4)

Sign in as `tech.lahore@bayflow.test`.

| # | Do this | Expect | ✓ |
|---|---|---|---|
| E1 | Open **My jobs** | **Only jobs assigned to Imran** — Sana's Corolla is there | [ ] |
| E2 | Confirm you cannot see unassigned jobs | Ali's Kia (ready for pick-up) is **not** listed | [ ] |
| E3 | Open Sana's Corolla, click **Start inspection** | Status → **Inspecting** | [ ] |
| E4 | Add a part line from inventory (e.g. oil filter), qty 1 | Line added with unit cost | [ ] |
| E5 | Add a part that is **out of stock** (ignition coil) | Flagged as a shortage (§7.6) | [ ] |
| E6 | Add a labour line, e.g. PKR 4,000 | Line added | [ ] |
| E7 | Watch the total | Updates live as you edit | [ ] |
| E8 | Try qty `0` or a negative cost | Rejected by validation (§9.4) | [ ] |
| E9 | Click **Submit estimate** | Status → **Estimate review** | [ ] |
| E10 | Try to act on the booking now | No further actions — the ball is with the advisor | [ ] |

---

## Block F — Estimate review, rejection, revision  (§5.2 steps 5–6, §5.3)

This is the **estimate-rejected path** the brief calls out in §7.8. Do not skip it.

**As `sa.lahore`:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| F1 | Open Sana's Corolla | Estimate shown itemised: parts + labour | [ ] |
| F2 | Edit the labour line down | Allowed; **revision count increments** (§7.5) | [ ] |
| F3 | Click **Send estimate** | Status → **Awaiting customer** | [ ] |

**As Sana (`sana@bayflow.test`):**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| F4 | Open the customer portal | Banner: *estimate awaiting your approval* (§7.3) | [ ] |
| F5 | Open the estimate | Itemised parts + labour + total, readable to a non-technical person | [ ] |
| F6 | Click **Reject estimate**, give a reason | Status → **Estimate rejected**, timestamped | [ ] |

**As `sa.lahore`:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| F7 | Check the bell | Notified of the rejection (§5.4) | [ ] |
| F8 | Confirm both recovery routes are offered | **Revise estimate** *and* **Return to technician** | [ ] |
| F9 | Click **Revise estimate**, adjust, resend | New revision; status → **Awaiting customer** | [ ] |
| F10 | Confirm the rejected version is still on record | Old version retained, not overwritten (§7.5) | [ ] |

**As Sana:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| F11 | **Approve estimate** | Status → **Estimate approved**, timestamped (§3 "accepted in-app with timestamp") | [ ] |

---

## Block G — Parts & procurement  (§5.2 steps 7–10, §7.6)

**As `sa.lahore`:** assign the parts person.

| # | Do this | Expect | ✓ |
|---|---|---|---|
| G1 | On Sana's Corolla click **Assign parts person** → Usman | Status → **Parts pending** | [ ] |

**As `parts.lahore@bayflow.test`:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| G2 | Open **Inventory** | Table with SKU, name, qty on hand, reorder level, unit cost (§7.4) | [ ] |
| G3 | Open **Parts** / jobs awaiting parts | Shows **required vs available** per job | [ ] |
| G4 | Note the ignition coil's on-shelf qty | Write it down — you verify it again in G11 and L5 | [ ] |
| G5 | Reserve the in-stock items | Reserved count rises; free stock falls | [ ] |
| G6 | Create a **purchase order** for the missing coil | PO created, status **Ordered** | [ ] |
| G7 | Click **Order parts** | Status → **Parts ordered** | [ ] |
| G8 | Open **Purchase orders** → receive **only part** of the order | PO → **Partially received**; booking **stays** `PARTS_ORDERED` (§5.3) | [ ] |
| G9 | Receive the remainder | PO → **Received**; inventory **increases** (§7.6) | [ ] |
| G10 | Click **Mark parts ready** | Status → **Parts ready** | [ ] |
| G11 | Click **Allocate parts** | Status → **In repair**; stock **deducted**; parts linked to the booking | [ ] |
| G12 | Open the stock ledger / movements | Every receive, reserve and allocate recorded with actor | [ ] |

### G-alt — "parts already in stock" shortcut (§5.3)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| G13 | On a booking whose parts are **all** in stock, from `PARTS_PENDING` | **Mark parts ready** goes straight to `PARTS_READY`, skipping `PARTS_ORDERED` | [ ] |

---

## Block H — Repair, QC queue and the QC fail loop  (§5.2 steps 11–13, §5.3)

The **QC fail loop** is explicitly required by §7.8.

**As `tech.lahore`:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| H1 | Sana's Corolla is back in **My jobs** | Visible again at `IN_REPAIR` | [ ] |
| H2 | Click **Send to QC** | Status → **QC pending** | [ ] |

**The lock test — two browsers at once:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| H3 | Window 1 as `qc.lahore`, Window 2 as `qc2.lahore`. Both open **QC queue**. Both click **Pick QC job** on the same job | **First wins** (→ `QC_IN_PROGRESS`); second gets a clear conflict error, **not** a crash (§11 "first to pick locks it") | [ ] |
| H4 | As the inspector who did *not* win, try to pass/fail it | Refused — only the claiming inspector may act | [ ] |

**The fail loop, as the winning inspector:**

| # | Do this | Expect | ✓ |
|---|---|---|---|
| H5 | Use the checklist / notes field | Present and usable (§7.4) | [ ] |
| H6 | Click **Fail QC**, create an issue with title + description | Status → **In repair**; an **Issue** record is created | [ ] |
| H7 | As `tech.lahore`, open the job | The QC issue is **visible to the technician** (§7.4) | [ ] |
| H8 | Click **Send to QC** again | Status → **QC pending** — the loop repeats (§5.3) | [ ] |
| H9 | As `qc.lahore`, pick it and **Pass QC** | Status → **Ready for pick-up** | [ ] |

---

## Block I — Notify, pick-up, complete  (§5.2 steps 14–15)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| I1 | As `sa.lahore`, click **Notify customer** | Logged in the audit trail; **status unchanged** | [ ] |
| I2 | As Sana, check the bell | *Vehicle ready for pick-up* notification (§5.4) | [ ] |
| I3 | As Sana, click **Complete booking** / *I've collected my car* | Status → **Completed** | [ ] |
| I4 | Re-open the job page | Audit log shows the **entire** journey, every actor and timestamp | [ ] |
| I5 | Try any action on the completed booking | None available — terminal state | [ ] |
| I6 | Repeat I3 as the **advisor** on Ali's Kia `LEF-3300` | Advisor can also complete (§5.2 step 15: "Customer / SA") | [ ] |

**At this point the full §5 lifecycle has run end to end. That is the 35% criterion.**

---

## Block J — Owner: shops, team, services  (§7.2)

Sign in as `owner@bayflow.test` (Fatima — Lahore, Karachi, Islamabad).

| # | Do this | Expect | ✓ |
|---|---|---|---|
| J1 | Open the POS | Overview of the current shop: bookings by status, team, inventory (§7.4) | [ ] |
| J2 | Use the **shop switcher** | Switches between her three shops; data changes with it | [ ] |
| J3 | Open **Team** | Lists members with their roles | [ ] |
| J4 | Add a member with role **QC**, note the temp password | Created; can sign in with it | [ ] |
| J5 | Deactivate that member | Marked inactive; they lose access | [ ] |
| J6 | Add a member using an **existing** email | Account reused, not duplicated | [ ] |
| J7 | Open **Services** — add a service (name, description, duration, price) | Created and offered in that shop's booking wizard | [ ] |
| J8 | Edit, then deactivate a service | Disappears from the public wizard | [ ] |
| J9 | Open **Settings** | Working hours, slot duration, bay capacity — all editable | [ ] |
| J10 | Change working hours, then re-check the wizard | Available slots change accordingly | [ ] |
| J11 | Go to `/pos/new`, create a shop (name, address, city, phone, hours, slots) | Created, with its **own** empty team and inventory | [ ] |
| J12 | Confirm the new shop is independent | No team, services or bookings inherited from Lahore | [ ] |
| J13 | Open any role's view as the owner | Owner has full visibility for support (§7.4, §11) | [ ] |

> After J11 run `pnpm db:demo` when you're done with Block J, to drop the test shop.

---

## Block K — Multi-tenancy & security  (§7.1 acceptance, 10% of the score)

This is the test the brief states as a hard acceptance criterion.

| # | Do this | Expect | ✓ |
|---|---|---|---|
| K1 | Sign in as `sa.karachi@bayflow.test` | Lands in Karachi Motor Works | [ ] |
| K2 | Manually navigate to `/pos/shop_lahore` | **403 or 404** — never Lahore's data | [ ] |
| K3 | In DevTools console, run `fetch('/api/shops/shop_lahore/bookings').then(r=>r.status).then(console.log)` | `403` or `404` | [ ] |
| K4 | Copy a **Lahore** booking id, open it under the Karachi URL | Not found — ids are not guessable across tenants | [ ] |
| K5 | As `owner2@bayflow.test` (Hamza), try to reach Fatima's shops | Blocked — owners are scoped to their own shops | [ ] |
| K6 | As `tech.lahore`, open a job assigned to **another** technician | Blocked (§4: "Technician sees only bookings assigned to them") | [ ] |
| K7 | As `customer@bayflow.test`, open **another customer's** booking URL | Blocked (§4: "customer only sees their own bookings") | [ ] |
| K8 | As `tech.lahore`, try an advisor action via the API (e.g. POST a `confirm` transition) | `403` — role guard per transition (§7.5) | [ ] |
| K9 | As `qc.lahore`, try to allocate parts | `403` | [ ] |
| K10 | POST a transition that is valid for the role but **wrong for the status** (e.g. `passQc` on a `PENDING` booking) | `409 Conflict`, not a 500 | [ ] |
| K11 | POST a transition with a malformed body | `422` / `400` with a consistent error shape (§9.4) | [ ] |

---

## Block L — Remaining edge cases  (§5.3)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| L1 | **Slot capacity** — book the same slot from two browsers at once, beyond capacity | One succeeds, the other gets a clean "slot taken" error, **not** a 500 and **not** a double booking | [ ] |
| L2 | Book every seat in one slot | That slot disappears from the picker | [ ] |
| L3 | **Cancel as customer** before `IN_REPAIR` | Allowed | [ ] |
| L4 | **Cancel as SA** before `IN_REPAIR` | Allowed | [ ] |
| L5 | Cancel a booking that had **reserved parts**; re-check inventory | Reserved stock **returned exactly** to the shelf (§5.3) | [ ] |
| L6 | Try to cancel a booking that is already `IN_REPAIR` | Refused — cancellation is only allowed before repair starts | [ ] |
| L7 | Open a booking belonging to a shop you are not a member of, via URL | 403/404 | [ ] |

---

## Block M — Notifications  (§5.4 — all eight are required)

Tick each only when you have **seen the bell actually update** for the right person.

| # | Event | Who must be notified | ✓ |
|---|---|---|---|
| M1 | New booking created | Service Advisors of that shop | [ ] |
| M2 | Technician assigned | That technician | [ ] |
| M3 | Estimate submitted by technician | Service Advisor | [ ] |
| M4 | Estimate sent to customer | Customer | [ ] |
| M5 | Customer accepted **or** rejected the estimate | Service Advisor | [ ] |
| M6 | Parts needed / parts ready | Parts Person / Technician | [ ] |
| M7 | Sent to QC / QC failed | QC queue / Technician | [ ] |
| M8 | Vehicle ready for pick-up | Customer | [ ] |
| M9 | Unread **count** is correct, and clears when read | — | [ ] |
| M10 | Clicking a notification opens the right booking | — | [ ] |

---

## Block N — Bonus: in-app calling  (§8.1)

Two browser windows, microphone allowed in both.

| # | Do this | Expect | ✓ |
|---|---|---|---|
| N1 | Window A as `customer@bayflow.test`, open the Honda Civic `LEA-1234` booking | A **call the shop** button is present (§8.1) | [ ] |
| N2 | Window B as `sa.lahore`, on any POS page | — | [ ] |
| N3 | Window A: start the call | Window B shows an **incoming-call popup** with Accept / Decline | [ ] |
| N4 | Accept in B | State → **connected**; two-way audio | [ ] |
| N5 | Hang up | State → **ended**; duration recorded | [ ] |
| N6 | Open the booking's call log | Entry with who, when, duration, outcome (§8.1) | [ ] |
| N7 | Call again, **Decline** in B | Logged as **declined** | [ ] |
| N8 | Call again, let it ring out unanswered | Logged as **missed** (§8.1 — a missed call must be recorded) | [ ] |
| N9 | Reverse it: advisor calls the customer from the job page | Rings in A; works both directions | [ ] |
| N10 | Confirm no phone numbers are exposed anywhere in the UI | §8.1 "without sharing phone numbers" | [ ] |

---

## Block O — Bonus: AI Front Desk  (§8.2)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| O1 | From A, call and let it ring ~20 s (or Decline in B) | **AI Front Desk answers** (§8.2) | [ ] |
| O2 | Listen to the greeting | Greets, asks who is calling and why | [ ] |
| O3 | Identify yourself as Ahmed | Identifies the caller by name / booking reference | [ ] |
| O4 | Ask *"what's the status of my car?"* | Answers **from the real booking**, accurately | [ ] |
| O5 | Ask *"how much is the estimate?"* | Correct figure — **PKR 16,100** — from the DB, not invented | [ ] |
| O6 | Ask *"can I move my appointment to Monday?"* | Records a reschedule request | [ ] |
| O7 | Ask something it cannot know, e.g. *"who is the CEO?"* | **Says it doesn't know and promises a callback** — never invents (§8.2) | [ ] |
| O8 | Ask about **another customer's** car or booking | Refuses — guardrailed to the caller's own data (§8.2) | [ ] |
| O9 | End the call | Call ends cleanly | [ ] |
| O10 | Window B: check the bell | An AI Front Desk notification | [ ] |
| O11 | Open **Calls & AI** in the sidebar | Summary, **intent**, **sentiment**, full transcript (§8.2) | [ ] |
| O12 | Confirm a **Task** was created for the SA | Linked to the booking and the call log | [ ] |
| O13 | Click **Mark done** | Task moves to done; badge count drops | [ ] |

---

## Block P — Optional extras  (§8.3)

| # | Do this | Expect | ✓ |
|---|---|---|---|
| P1 | Open `/invoice/<bookingId>` for a completed booking | Printable invoice / job sheet | [ ] |
| P2 | Ctrl+P in dark mode | Prints on a **light** palette, readable | [ ] |
| P3 | Open a job page, check vehicle history | Past bookings for that plate (§8.3) | [ ] |
| P4 | As owner, check analytics | Revenue, average turnaround, QC pass rate (§8.3) | [ ] |
| P5 | Try to open an invoice for someone else's booking | Access-checked, refused | [ ] |

---

## Block Q — Submission deliverables  (§9 — 10% of the score)

Code quality is worth 20% and deployment/docs 10%. These are scored by reading, not clicking.

| # | Check | Expect | ✓ |
|---|---|---|---|
| Q1 | GitHub repo is **public** | Open it in a logged-out private window — it must load | [ ] |
| Q2 | Commit history is meaningful | Many small commits, not one dump (§9.1) | [ ] |
| Q3 | No secrets committed | `git log -p -- .env` is empty | [ ] |
| Q4 | **Live URL loads without local setup** | §9.1 — the single biggest scoring gate | [ ] |
| Q5 | Live URL is **seeded** | All five shops and all demo accounts work there | [ ] |
| Q6 | `README.md` in repo root | Prereqs, install, env, DB, run, tests, demo accounts, deploy, architecture (§9.2) | [ ] |
| Q7 | `.env.example` in repo root | Every variable, placeholder values, a comment each (§9.1) | [ ] |
| Q8 | Clone fresh into a new folder and follow the README exactly | A stranger can run it in minutes (§10) | [ ] |
| Q9 | `pnpm lint && pnpm typecheck && pnpm test` | All clean | [ ] |
| Q10 | `pnpm test:e2e` | All green | [ ] |
| Q11 | Demo video 3–5 min recorded | §8.3 — the **only** accepted evidence for the AI Front Desk | [ ] |
| Q12 | **Re-run `pnpm db:demo` against the live DB after testing** | Judges must land on clean data, not your QA leftovers | [ ] |

---

## Scorecard

Fill this in when you finish, and be as harsh as a judge would be.

| Criterion | Weight | Blocks | Self-score |
|---|---:|---|---:|
| Core flow completeness | 35% | B–I | /35 |
| Architecture & code quality | 20% | K, Q9–Q10 | /20 |
| Product & UX | 15% | A, B, D–I | /15 |
| Deployment & docs | 10% | Q1–Q8 | /10 |
| Multi-tenancy & security | 10% | J, K | /10 |
| Bonus | 10% | N, O | /10 |
| | | **Total** | **/100** |

### Failures found

| Test ID | What actually happened | Severity | Fixed? |
|---|---|---|---|
| | | | |
