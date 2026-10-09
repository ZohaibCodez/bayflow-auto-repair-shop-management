# BayFlow 🔧

> Multi-tenant management platform for independent auto repair shops — customer booking portal, role-based shop POS, and a backend booking state machine. Built for **LoopVerse 3.0 — Web Dev (Virtual)**.

**Live URL:** _coming in Phase 0_ · **Status:** 🚧 in development

---

## What it does

- **Customers** discover a shop, book a service, track their vehicle through every repair step, and approve estimates online.
- **Shop staff** (Service Advisor, Technician, Parts, QC, Owner) each get a role-scoped dashboard and move a job through a strict booking lifecycle.
- **Owners** run multiple shops, each with its own team, services, inventory and bookings — fully isolated.

## Tech stack

Next.js 16 (App Router) · TypeScript · Prisma + PostgreSQL (Neon) · Auth.js v5 · Tailwind CSS + shadcn/ui · Zod · deployed on Vercel. Full rationale in **[STACK.md](STACK.md)**.

## Project docs

- **[STACK.md](STACK.md)** — the locked tech stack and the hard rules.
- **[PLAN.md](PLAN.md)** — architecture, data model, the booking state machine, phases & sprints, and the work split.
- **[TRACKER.md](TRACKER.md)** — the live task board (who's doing what, by phase). Both devs update it; git history is the record.

## Getting started (filled out during the build)

**Windows quick start:** double-click **`run.bat`** (or run it in a terminal). It installs deps, creates `.env` from the example, generates the Prisma client, optionally migrates + seeds, and starts the dev server.

Manual steps (any OS):
```bash
# Prerequisites: Node 22+, pnpm 10+, a Neon Postgres DB
pnpm install
cp .env.example .env      # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
pnpm db:migrate                  # create tables
pnpm db:seed                     # load demo shops, teams, inventory, slots
pnpm dev                         # http://localhost:3000
```

## Demo accounts

_Listed here once the seed script lands (Phase 6) — one account per role._

## Architecture & design decisions

See **[PLAN.md](PLAN.md)**. In short: one Next.js app serving three surfaces (public portal, customer area, shop POS) over one backend; an explicit booking **state machine** as the single source of truth; server-side **tenant isolation** on every query.

---

_This README grows with the project. The Definition of Done lives in [PLAN.md](PLAN.md)._
