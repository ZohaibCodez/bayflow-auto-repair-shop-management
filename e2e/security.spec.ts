import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  act,
  apiAs,
  createBookingApi,
  expectStatus,
  findSlot,
  ids,
  serviceIds,
  type Role,
} from "./helpers";

/**
 * Brief §7.1 / §7.8 / §10: tenant isolation, per-role guards on every transition, and the
 * race-sensitive operations (slot capacity, QC claim, stock).
 */
test.describe.configure({ mode: "serial" });

let api: Record<Role | "anon", APIRequestContext>;
let L: string; // Lahore shop id
let K: string; // Karachi shop id
let svc: Record<string, string>;

test.beforeAll(async ({ baseURL }) => {
  ({ lahore: L, karachi: K } = ids());
  const roles: (Role | "anon")[] = ["anon", "owner", "owner2", "sa", "tech", "parts", "qc", "qc2", "saKarachi", "customer", "sana"];
  api = Object.fromEntries(await Promise.all(roles.map(async (r) => [r, await apiAs(r, baseURL!)]))) as typeof api;
  svc = await serviceIds(api.anon, L);
});
test.afterAll(async () => Promise.all(Object.values(api).map((a) => a.dispose())));

async function newPendingBooking(as: Role = "customer", services = ["General inspection"]) {
  const slot = await findSlot(api.anon, L);
  const res = await createBookingApi(api[as], L, slot.startsAt, services.map((s) => svc[s]));
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).booking.id as string;
}

/** Labour-only job pushed through to the QC queue via the API, each step by its own role. */
async function bookingInQcQueue() {
  const id = await newPendingBooking();
  const { techId } = ids();
  await expectStatus(api.sa, L, id, { action: "confirm", technicianId: techId }, 200);
  await expectStatus(api.tech, L, id, { action: "startInspection" }, 200);
  await expectStatus(
    api.tech,
    L,
    id,
    { action: "submitEstimate", items: [{ kind: "LABOR", name: "Diagnosis", qty: 1, unitCost: 1500 }] },
    200,
  );
  await expectStatus(api.sa, L, id, { action: "sendEstimate" }, 200);
  await expectStatus(api.customer, L, id, { action: "approveEstimate" }, 200);
  await expectStatus(api.sa, L, id, { action: "assignParts", partsPersonId: ids().partsId }, 200);
  await expectStatus(api.parts, L, id, { action: "processParts" }, 200); // nothing to order → PARTS_READY
  await expectStatus(api.parts, L, id, { action: "allocateParts" }, 200);
  await expectStatus(api.tech, L, id, { action: "sendToQc" }, 200);
  return id;
}

test.describe("authentication", () => {
  test("anonymous requests to shop data get 401", async () => {
    expect((await api.anon.get(`/api/shops/${L}/bookings`)).status()).toBe(401);
    expect((await api.anon.get(`/api/notifications`)).status()).toBe(401);
    expect((await api.anon.post(`/api/bookings`, { data: {} })).status()).toBe(401);
  });

  test("public endpoints stay public", async () => {
    expect((await api.anon.get(`/api/shops/${L}`)).ok()).toBeTruthy();
    const slot = await findSlot(api.anon, L);
    expect(slot.label).toMatch(/^\d{2}:\d{2}$/);
  });
});

test.describe("tenant isolation (brief §7.1 acceptance)", () => {
  test("a Shop-A staff session gets 403 on Shop-B's bookings", async () => {
    const res = await api.saKarachi.get(`/api/shops/${L}/bookings`);
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  test("…and 404 when it smuggles a Shop-B booking id through its own shop", async () => {
    const lahoreBooking = (await (await api.sa.get(`/api/shops/${L}/bookings`)).json()).bookings[0].id;
    expect((await api.saKarachi.get(`/api/shops/${K}/bookings/${lahoreBooking}`)).status()).toBe(404);
    expect((await api.saKarachi.get(`/api/shops/${L}/bookings/${lahoreBooking}`)).status()).toBe(403);
    expect((await act(api.saKarachi, L, lahoreBooking, { action: "cancel" })).status()).toBe(404);
  });

  test("an owner only sees their own shops", async () => {
    expect((await api.owner.get(`/api/shops/${L}/bookings`)).ok()).toBeTruthy();
    expect((await api.owner2.get(`/api/shops/${L}/bookings`)).status()).toBe(403);
    expect((await api.owner2.get(`/api/shops/${L}/inventory`)).status()).toBe(403);
  });

  test("a technician only receives jobs assigned to them", async () => {
    const res = await api.tech.get(`/api/shops/${L}/bookings`);
    expect(res.ok()).toBeTruthy();
    const { bookings } = await res.json();
    for (const b of bookings) expect(b.technician).toBe("Imran Malik");
  });

  test("a customer can't read or act on someone else's booking", async () => {
    const id = await newPendingBooking("customer");
    expect((await act(api.sana, L, id, { action: "cancel" })).status()).toBe(404);
    const mine = (await (await api.sana.get("/api/bookings")).json()).bookings.map((b: { id: string }) => b.id);
    expect(mine).not.toContain(id);
    await expectStatus(api.customer, L, id, { action: "cancel", reason: "e2e cleanup" }, 200);
  });
});

test.describe("role guards — no role can perform another role's action", () => {
  test("only an advisor (or the owner) can confirm a booking", async () => {
    const id = await newPendingBooking();
    // Parts, QC and the customer can see the booking but may not confirm it → 403.
    for (const role of ["parts", "qc", "customer"] as Role[]) {
      const res = await act(api[role], L, id, { action: "confirm" });
      expect(res.status(), `${role} confirm`).toBe(403);
    }
    // A technician can't even see a job that isn't assigned to them → 404.
    expect((await act(api.tech, L, id, { action: "confirm" })).status()).toBe(404);
    expect((await api.tech.get(`/api/shops/${L}/bookings/${id}`)).status()).toBe(404);
    // Wrong status → 409 (the state machine is checked before the role), never a silent no-op.
    await expectStatus(api.sa, L, id, { action: "approveEstimate" }, 409);
    await expectStatus(api.sa, L, id, { action: "sendEstimate" }, 409);
    await expectStatus(api.sa, L, id, { action: "decline", reason: "e2e" }, 200);
    await expectStatus(api.sa, L, id, { action: "confirm" }, 409); // already cancelled
  });

  test("a technician cannot approve an estimate; only the booking's customer can", async () => {
    const id = await newPendingBooking();
    await expectStatus(api.sa, L, id, { action: "confirm", technicianId: ids().techId }, 200);
    await expectStatus(api.tech, L, id, { action: "startInspection" }, 200);
    await expectStatus(
      api.tech,
      L,
      id,
      { action: "submitEstimate", items: [{ kind: "LABOR", name: "Check", qty: 1, unitCost: 1000 }] },
      200,
    );
    await expectStatus(api.sa, L, id, { action: "sendEstimate" }, 200);
    await expectStatus(api.tech, L, id, { action: "approveEstimate" }, 403);
    await expectStatus(api.sa, L, id, { action: "approveEstimate" }, 403);
    await expectStatus(api.owner, L, id, { action: "approveEstimate" }, 403);
    await expectStatus(api.customer, L, id, { action: "approveEstimate" }, 200);
  });

  test("input is validated (422) before anything happens", async () => {
    const id = await newPendingBooking();
    await expectStatus(api.sa, L, id, { action: "teleport" }, 422);
    await expectStatus(api.sa, L, id, { action: "assignTechnician", technicianId: "" }, 422);
    const bad = await api.customer.post("/api/bookings", { data: { shopId: L, serviceIds: [], startsAt: "nope" } });
    expect(bad.status()).toBe(422);
    await expectStatus(api.sa, L, id, { action: "decline" }, 200);
  });

  test("an advisor can't assign a technician from another shop", async () => {
    const id = await newPendingBooking();
    await expectStatus(api.sa, L, id, { action: "confirm" }, 200);
    const foreign = (await (await api.saKarachi.get(`/api/shops/${K}/team`)).json()).members.find(
      (m: { role: string }) => m.role === "TECHNICIAN",
    ).userId;
    await expectStatus(api.sa, L, id, { action: "assignTechnician", technicianId: foreign }, 422);
    await expectStatus(api.sa, L, id, { action: "cancel" }, 200);
  });
});

test.describe("race conditions", () => {
  test("a slot can't be booked beyond its capacity, even concurrently", async () => {
    // A slot nobody has touched: capacity 2 → exactly 2 of 3 simultaneous bookings win.
    const slot = await findSlot(api.anon, L, 2, 7);
    expect(slot.remaining).toBe(2);
    const results = await Promise.all(
      (["customer", "sana", "customer"] as Role[]).map((r) =>
        createBookingApi(api[r], L, slot.startsAt, [svc["Oil change"]]),
      ),
    );
    const codes = results.map((r) => r.status()).sort();
    expect(codes).toEqual([201, 201, 409]);
    // Clean up: cancel the two winners (frees the slot again).
    for (const [i, r] of results.entries()) {
      if (r.status() !== 201) continue;
      const who = (["customer", "sana", "customer"] as Role[])[i];
      await expectStatus(api[who], L, (await r.json()).booking.id, { action: "cancel" }, 200);
    }
  });

  test("two QC inspectors picking the same job: first wins, second gets 409", async () => {
    const id = await bookingInQcQueue();
    const [a, b] = await Promise.all([act(api.qc, L, id, { action: "claimQc" }), act(api.qc2, L, id, { action: "claimQc" })]);
    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    const winner = a.status() === 200 ? "qc" : "qc2";
    const loser = winner === "qc" ? "qc2" : "qc";
    // Only the inspector who holds the lock can pass or fail it.
    await expectStatus(api[loser], L, id, { action: "passQc" }, 403);
    await expectStatus(api[winner], L, id, { action: "failQc", title: "Loose heat shield" }, 200);
    // After a fail the job is back with the technician and the lock is released.
    const detail = await (await api.sa.get(`/api/shops/${L}/bookings/${id}`)).json();
    expect(detail.booking.status).toBe("IN_REPAIR");
    expect(detail.booking.qcInspector).toBeNull();
    expect(detail.booking.openIssues[0].title).toBe("Loose heat shield");
  });
});

test.describe("inventory consistency", () => {
  test("cancelling before repair returns reserved parts to stock", async () => {
    const stock = async () =>
      ((await (await api.parts.get(`/api/shops/${L}/inventory`)).json()).items as { sku: string; qtyOnHand: number }[]).find(
        (i) => i.sku === "BRK-PAD",
      )!.qtyOnHand;
    const before = await stock();

    const id = await newPendingBooking("customer", ["Brake inspection"]);
    const pads = ((await (await api.parts.get(`/api/shops/${L}/inventory`)).json()).items as { id: string; sku: string }[]).find(
      (i) => i.sku === "BRK-PAD",
    )!.id;
    await expectStatus(api.sa, L, id, { action: "confirm", technicianId: ids().techId }, 200);
    await expectStatus(api.tech, L, id, { action: "startInspection" }, 200);
    await expectStatus(
      api.tech,
      L,
      id,
      { action: "submitEstimate", items: [{ kind: "PART", inventoryItemId: pads, qty: 2, unitCost: 4500 }] },
      200,
    );
    await expectStatus(api.sa, L, id, { action: "sendEstimate" }, 200);
    await expectStatus(api.customer, L, id, { action: "approveEstimate" }, 200);
    await expectStatus(api.sa, L, id, { action: "assignParts", partsPersonId: ids().partsId }, 200);
    await expectStatus(api.parts, L, id, { action: "processParts" }, 200);

    expect(await stock()).toBe(before - 2); // reserved = off the shelf
    await expectStatus(api.customer, L, id, { action: "cancel", reason: "Changed my mind" }, 200);
    expect(await stock()).toBe(before); // released back

    const detail = await (await api.sa.get(`/api/shops/${L}/bookings/${id}`)).json();
    expect(detail.booking.parts[0]).toMatchObject({ sku: "BRK-PAD", qty: 2, status: "RELEASED" });
    // and nobody can cancel once the repair has started
    const repairing = await bookingInQcQueue();
    await expectStatus(api.sa, L, repairing, { action: "cancel" }, 409);
  });
});
