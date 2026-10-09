import fs from "node:fs";
import path from "node:path";
import { expect, request, type APIRequestContext, type Browser, type Page } from "@playwright/test";

/** Seeded demo accounts (prisma/seed.ts). Test values only. */
export const DEMO_PASSWORD = "password123";
export const ACCOUNTS = {
  owner: "owner@bayflow.test",
  owner2: "owner2@bayflow.test",
  sa: "sa.lahore@bayflow.test",
  tech: "tech.lahore@bayflow.test",
  parts: "parts.lahore@bayflow.test",
  qc: "qc.lahore@bayflow.test",
  qc2: "qc2.lahore@bayflow.test",
  saKarachi: "sa.karachi@bayflow.test",
  customer: "customer@bayflow.test",
  sana: "sana@bayflow.test",
} as const;
export type Role = keyof typeof ACCOUNTS;

export const AUTH_DIR = path.join(__dirname, ".auth");
export const statePath = (role: Role) => path.join(AUTH_DIR, `${role}.json`);
const IDS = path.join(AUTH_DIR, "ids.json");

export type Ids = { lahore: string; karachi: string; techId: string; partsId: string };
export const saveIds = (ids: Ids) => fs.writeFileSync(IDS, JSON.stringify(ids, null, 2));
export const ids = (): Ids => JSON.parse(fs.readFileSync(IDS, "utf8"));

/** Sign in through the real login form. */
export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 });
}

/** A page signed in as `role` (fresh browser context from the saved session). */
export async function pageAs(browser: Browser, role: Role) {
  const ctx = await browser.newContext({ storageState: statePath(role) });
  const page = await ctx.newPage();
  return { page, close: () => ctx.close() };
}

/** An API client carrying `role`'s session cookie. */
export async function apiAs(role: Role | "anon", baseURL: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL,
    storageState: role === "anon" ? undefined : statePath(role),
  });
}

type Slot = { startsAt: string; label: string; remaining: number };

/** Next shop-local dates (YYYY-MM-DD) starting tomorrow. */
export function nextDates(n: number) {
  const out: string[] = [];
  const now = new Date(Date.now() + 5 * 3600_000); // Asia/Karachi
  for (let i = 1; i <= n; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** First slot with at least `minRemaining` places, searching forward from `skipDays`. */
export async function findSlot(api: APIRequestContext, shopId: string, minRemaining = 1, skipDays = 0) {
  for (const date of nextDates(21).slice(skipDays)) {
    const res = await api.get(`/api/shops/${shopId}/availability?date=${date}`);
    expect(res.ok()).toBeTruthy();
    const { slots } = (await res.json()) as { slots: Slot[] };
    const slot = slots.find((s) => s.remaining >= minRemaining);
    if (slot) return slot;
  }
  throw new Error("No free slot found in the next 3 weeks");
}

export async function serviceIds(api: APIRequestContext, shopId: string) {
  const res = await api.get(`/api/shops/${shopId}`);
  expect(res.ok()).toBeTruthy();
  const { shop } = await res.json();
  return (shop.services as { id: string; name: string }[]).reduce<Record<string, string>>(
    (m, s) => ({ ...m, [s.name]: s.id }),
    {},
  );
}

let plateSeq = 0;
/** Create a booking over the API as a signed-in customer. */
export async function createBookingApi(
  api: APIRequestContext,
  shopId: string,
  startsAt: string,
  services: string[],
) {
  const res = await api.post("/api/bookings", {
    data: {
      shopId,
      serviceIds: services,
      problems: "E2E test booking",
      startsAt,
      vehicle: {
        kind: "new",
        plate: `E2E-${Date.now().toString(36).slice(-4).toUpperCase()}${plateSeq++}`,
        make: "Toyota",
        model: "Yaris",
        year: 2020,
      },
    },
  });
  return res;
}

/** POST a state-machine action through the REST API. */
export async function act(
  api: APIRequestContext,
  shopId: string,
  bookingId: string,
  body: Record<string, unknown>,
) {
  return api.post(`/api/shops/${shopId}/bookings/${bookingId}/transitions`, { data: body });
}

export async function expectStatus(
  api: APIRequestContext,
  shopId: string,
  bookingId: string,
  body: Record<string, unknown>,
  status: number,
) {
  const res = await act(api, shopId, bookingId, body);
  expect(res.status(), `${body.action} → ${await res.text()}`).toBe(status);
  return res;
}
