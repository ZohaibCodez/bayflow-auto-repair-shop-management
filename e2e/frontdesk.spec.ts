import { expect, test, type APIRequestContext } from "@playwright/test";
import { apiAs, createBookingApi, expectStatus, findSlot, ids, pageAs, serviceIds, type Role } from "./helpers";

/**
 * Brief §8.1–8.2 bonus track: a customer's call nobody answers is missed, the AI Front Desk
 * takes it and answers from the caller's own booking, and the advisors get a summary + task
 * they can close — with the call on the booking's log. Media (WebRTC) is browser-to-browser
 * and not exercised here; the signalling + AI + inbox are.
 *
 * Runs against whichever model is configured (Groq / Claude) or the rule-based fallback, so
 * assertions on the AI's words are limited to facts it must get from the tools.
 */
test.describe.configure({ mode: "serial" });

let api: Record<Role, APIRequestContext>;
let L: string;
let bookingId: string;
let bookingCode: string;
let callId: string;

test.beforeAll(async ({ baseURL }) => {
  L = ids().lahore;
  const roles: Role[] = ["customer", "sana", "sa", "tech", "saKarachi"];
  api = Object.fromEntries(await Promise.all(roles.map(async (r) => [r, await apiAs(r, baseURL!)]))) as typeof api;

  // A booking whose estimate (PKR 2,500) is waiting on the customer — the brief's bonus path.
  const svc = await serviceIds(api.customer, L);
  const slot = await findSlot(api.customer, L);
  const created = await createBookingApi(api.customer, L, slot.startsAt, [svc["General inspection"]]);
  expect(created.status(), await created.text()).toBe(201);
  ({ id: bookingId, code: bookingCode } = (await created.json()).booking);
  await expectStatus(api.sa, L, bookingId, { action: "confirm", technicianId: ids().techId }, 200);
  await expectStatus(api.tech, L, bookingId, { action: "startInspection" }, 200);
  await expectStatus(
    api.tech,
    L,
    bookingId,
    { action: "submitEstimate", items: [{ kind: "LABOR", name: "Diagnosis and tune-up", qty: 1, unitCost: 2500 }] },
    200,
  );
  await expectStatus(api.sa, L, bookingId, { action: "sendEstimate" }, 200);
});
test.afterAll(async () => Promise.all(Object.values(api).map((a) => a.dispose())));

test("an unanswered customer call is missed and stays inside its shop", async () => {
  const start = await api.customer.post("/api/calls", { data: { bookingId, offer: "v=0 e2e-placeholder-offer" } });
  expect(start.status(), await start.text()).toBe(201);
  ({ callId } = await start.json());

  // The shop's advisor can see it ringing; another shop's advisor cannot touch it.
  expect((await api.sa.get(`/api/calls/${callId}`)).status()).toBe(200);
  const foreign = await api.saKarachi.post(`/api/calls/${callId}/answer`, { data: { answer: "v=0 e2e-answer" } });
  expect([403, 404]).toContain(foreign.status());

  const missed = await api.customer.post(`/api/calls/${callId}/missed`);
  expect(missed.status(), await missed.text()).toBe(200);
  expect((await (await api.customer.get(`/api/calls/${callId}`)).json()).call.state).toBe("missed");
});

test("the AI Front Desk answers from the caller's own booking, and only for the caller", async () => {
  const hello = await api.customer.post(`/api/calls/${callId}/ai`, { data: {} });
  expect(hello.status(), await hello.text()).toBe(200);
  expect((await hello.json()).reply).toMatch(/front desk/i);

  // Another customer can't talk to someone else's front-desk call.
  const intruder = await api.sana.post(`/api/calls/${callId}/ai`, { data: { text: "What's the estimate?" } });
  expect(intruder.status()).toBe(403);

  const turn = await api.customer.post(`/api/calls/${callId}/ai`, {
    data: { text: `How much is the estimate for booking ${bookingCode}?` },
  });
  expect(turn.status(), await turn.text()).toBe(200);
  const { reply } = (await turn.json()) as { reply: string };
  console.log(`AI reply: ${reply}`);
  // The only place it can learn PKR 2,500 is the get_booking_details tool.
  expect(reply).toMatch(/2,?500|two thousand five hundred/i);

  const end = await api.customer.post(`/api/calls/${callId}/ai/end`);
  expect(end.status(), await end.text()).toBe(200);
  expect((await end.json()).taskId).toBeTruthy();
});

test("advisors see the summary + task, close it, and find the call on the booking", async ({ browser }) => {
  const { page, close } = await pageAs(browser, "sa");
  await page.goto(`/pos/${L}/calls`);
  await expect(page.getByRole("heading", { name: "Calls & AI follow-ups" })).toBeVisible();
  // Sidebar entry carries the open count.
  await expect(page.getByRole("link", { name: /Calls & AI/ }).first()).toBeVisible();

  const card = page.getByTestId("ai-task").filter({ hasText: bookingCode });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Ahmed");
  await card.getByText(/Transcript/).click();
  await expect(card).toContainText(bookingCode);
  await expect(card).toContainText(/2,?500|two thousand five hundred/i);

  await card.getByRole("button", { name: "Mark done" }).click();
  await expect(card.getByRole("button", { name: "Mark done" })).toHaveCount(0);
  await expect(card).toContainText(/Done by/);

  // The call log, shop-wide and on the booking itself.
  await expect(page.getByTestId("call-log").getByText(bookingCode).first()).toBeVisible();
  await page.goto(`/pos/${L}/bookings/${bookingId}`);
  await expect(page.getByRole("heading", { name: /Calls · 1/ })).toBeVisible();
  await expect(page.getByTestId("call-log")).toContainText("AI Front Desk");
  await close();
});

test("a technician can't open the advisors' call inbox", async ({ browser }) => {
  const { page, close } = await pageAs(browser, "tech");
  await page.goto(`/pos/${L}/calls`);
  await expect(page.getByRole("heading", { name: "Calls & AI follow-ups" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Calls & AI/ })).toHaveCount(0);
  await close();
});
