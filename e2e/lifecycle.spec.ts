import { expect, test, type Page } from "@playwright/test";
import { apiAs, ids, pageAs } from "./helpers";

/**
 * Brief §6 worked example + §7.8 Definition of Done, through the real UI in Chrome:
 * a brand-new customer books online → advisor → technician → estimate REJECTED once →
 * revised & approved → parts person orders a missing part, receives it in two deliveries
 * (partial delivery keeps the job waiting) → allocates → repair → QC FAILS once →
 * rework → QC passes → customer notified → customer collects → COMPLETED.
 * Every role works in its own signed-in browser.
 */
test.describe.configure({ mode: "serial" });
test.setTimeout(15 * 60_000);

const run = Date.now().toString(36).toUpperCase();
const customer = {
  name: "Ahmed E2E",
  email: `e2e.${run.toLowerCase()}@bayflow.test`,
  password: `e2e-pass-${run}`,
};
const COIL = { sku: `E2E-COIL-${run}`, name: `E2E ignition coil ${run}` };

test("full booking lifecycle across every role", async ({ browser, baseURL }) => {
  const { lahore: L } = ids();
  const sa = await apiAs("sa", baseURL!);
  const partsApi = await apiAs("parts", baseURL!);
  const status = async (id: string) =>
    (await (await sa.get(`/api/shops/${L}/bookings/${id}`)).json()).booking.status as string;
  const waitFor = (id: string, s: string) => expect.poll(() => status(id), { timeout: 60_000 }).toBe(s);

  const pos = (p: Page, id: string) => p.goto(`/pos/${L}/bookings/${id}`);
  const stock = async (sku: string) =>
    ((await (await partsApi.get(`/api/shops/${L}/inventory`)).json()).items as { id: string; sku: string; qtyOnHand: number }[]).find(
      (i) => i.sku === sku,
    )!;

  // Each role in its own browser.
  const advisor = await pageAs(browser, "sa");
  const tech = await pageAs(browser, "tech");
  const parts = await pageAs(browser, "parts");
  const qc = await pageAs(browser, "qc");
  const custCtx = await browser.newContext();
  const cust = await custCtx.newPage();

  // --- 0. Parts desk adds a part that is out of stock ---------------------------
  await test.step("parts person adds an out-of-stock ignition coil to inventory", async () => {
    await parts.page.goto(`/pos/${L}/inventory`);
    await parts.page.getByRole("button", { name: "Add part" }).click();
    await parts.page.getByLabel("SKU").fill(COIL.sku);
    await parts.page.getByLabel("Name", { exact: true }).fill(COIL.name);
    await parts.page.getByLabel("Opening stock").fill("0");
    await parts.page.getByLabel("Reorder level").fill("1");
    await parts.page.getByLabel("Unit cost (PKR)").fill("6500");
    await parts.page.getByRole("button", { name: "Save part" }).click();
    await expect(parts.page.getByRole("cell", { name: COIL.name })).toBeVisible();
  });
  const coil = await stock(COIL.sku);
  const filterBefore = await stock("FILT-OIL");

  // --- 1. A new customer books through the wizard -------------------------------
  let bookingId = "";
  await test.step("new customer books via the 4-step wizard (account created)", async () => {
    await cust.goto(`/book/${L}`);
    await cust.getByRole("button", { name: /Check engine light/ }).click();
    await cust.getByRole("button", { name: /Oil change/ }).click();
    await cust.getByLabel(/Tell the shop/).fill("Light came on yesterday, car vibrates at idle.");
    await cust.getByRole("button", { name: "Continue" }).click();

    // Only available slots are listed; pick the first one.
    const firstSlot = cust.getByRole("button", { name: /^\d{2}:\d{2}/ }).first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();
    await cust.getByRole("button", { name: "Continue" }).click();

    await cust.getByLabel("Full name").fill(customer.name);
    await cust.getByLabel("Email").fill(customer.email);
    await cust.getByLabel("Password").fill(customer.password);
    await cust.getByLabel("Registration no.").fill(`LEA-${run.slice(-4)}`);
    await cust.getByLabel("Make").fill("Honda");
    await cust.getByLabel("Model").fill("Civic");
    await cust.getByLabel("Year").fill("2016");
    await cust.getByRole("button", { name: "Continue" }).click();

    await expect(cust.getByRole("heading", { name: "Look right?" })).toBeVisible();
    await cust.getByRole("button", { name: /Confirm booking/ }).click();
    await cust.waitForURL(/\/account\/bookings\/[^/?]+\?booked=1/, { timeout: 90_000 });
    await expect(cust.getByText("You’re booked in!")).toBeVisible();
    bookingId = new URL(cust.url()).pathname.split("/").pop()!;
    await waitFor(bookingId, "PENDING");
  });

  // --- 2. Advisor confirms and assigns the technician ---------------------------
  await test.step("advisor sees it, confirms and assigns Imran", async () => {
    await advisor.page.goto(`/pos/${L}`);
    await expect(advisor.page.getByText("New bookings")).toBeVisible();
    await pos(advisor.page, bookingId);
    await advisor.page.getByRole("combobox").first().selectOption({ label: "Imran Malik" });
    await advisor.page.getByRole("button", { name: "Confirm & assign" }).click();
    await waitFor(bookingId, "ASSIGNED");
  });

  // --- 3. Technician inspects and builds the estimate ---------------------------
  await test.step("technician inspects and submits an itemised estimate", async () => {
    await tech.page.goto(`/pos/${L}`);
    await expect(tech.page.getByText("To inspect")).toBeVisible();
    await pos(tech.page, bookingId);
    await tech.page.getByRole("button", { name: "Start inspection" }).click();
    await waitFor(bookingId, "INSPECTING");
    await tech.page.reload();

    await tech.page.getByLabel("Labour description").fill("Diagnosis + coil replacement + oil service");
    await tech.page.getByLabel("Unit cost").first().fill("4000");
    await tech.page.getByRole("button", { name: "Part", exact: true }).click();
    await tech.page.getByLabel("Part", { exact: true }).nth(0).selectOption(coil.id);
    await tech.page.getByLabel("Quantity").nth(1).fill("2");
    await tech.page.getByRole("button", { name: "Part", exact: true }).click();
    await tech.page.getByLabel("Part", { exact: true }).nth(1).selectOption(filterBefore.id);
    await expect(tech.page.getByText(/Only 0 in stock/)).toBeVisible(); // shortage flagged live
    await tech.page.getByPlaceholder("Findings for the advisor (optional)").fill("Faulty ignition coils.");
    await tech.page.getByRole("button", { name: "Submit to advisor" }).click();
    await waitFor(bookingId, "ESTIMATE_REVIEW");
  });

  // --- 4. Advisor sends it; customer REJECTS ------------------------------------
  await test.step("advisor sends the estimate; customer declines it", async () => {
    await pos(advisor.page, bookingId);
    await advisor.page.getByRole("button", { name: "Send to customer" }).click();
    await waitFor(bookingId, "AWAITING_CUSTOMER");

    await cust.goto("/account");
    await expect(cust.getByText("Estimate awaiting your approval")).toBeVisible();
    await cust.getByText("Estimate awaiting your approval").click();
    await expect(cust.getByText("Your approval is needed")).toBeVisible();
    await cust.getByRole("button", { name: "Decline", exact: true }).click();
    await cust.getByPlaceholder(/Tell the shop why/).fill("Labour is too high.");
    await cust.getByRole("button", { name: "Decline estimate" }).click();
    await waitFor(bookingId, "ESTIMATE_REJECTED");
  });

  // --- 5. Advisor revises (labour 4,000 → 3,500) and resends; customer approves --
  await test.step("advisor revises and resends; customer approves", async () => {
    await pos(advisor.page, bookingId);
    await expect(advisor.page.getByText("The customer declined the estimate")).toBeVisible();
    await expect(advisor.page.getByText("Labour is too high.").first()).toBeVisible();
    await advisor.page.getByRole("button", { name: "Revise estimate" }).click();
    await waitFor(bookingId, "ESTIMATE_REVIEW");
    await advisor.page.reload();
    await advisor.page.getByLabel("Unit cost").first().fill("3500");
    await advisor.page.getByRole("button", { name: "Send to customer" }).click();
    await waitFor(bookingId, "AWAITING_CUSTOMER");

    const detail = await (await sa.get(`/api/shops/${L}/bookings/${bookingId}`)).json();
    expect(detail.booking.estimate.revision).toBeGreaterThanOrEqual(2);
    // 2 coils × 6,500 + filter 900 + labour 3,500
    expect(detail.booking.estimate.total).toBe(2 * 6500 + 900 + 3500);

    await cust.reload();
    await cust.getByRole("button", { name: /^Approve/ }).click();
    await waitFor(bookingId, "ESTIMATE_APPROVED");
  });

  // --- 6. Parts: order the missing coils, two deliveries, allocate --------------
  await test.step("parts person orders, receives a partial then full delivery, allocates", async () => {
    await pos(advisor.page, bookingId);
    await advisor.page.getByRole("combobox").first().selectOption({ label: "Usman Tariq" });
    await advisor.page.getByRole("button", { name: "Assign", exact: true }).click();
    await waitFor(bookingId, "PARTS_PENDING");

    await parts.page.goto(`/pos/${L}`);
    await expect(parts.page.getByText("Check stock")).toBeVisible();
    await pos(parts.page, bookingId);
    await expect(parts.page.getByText("Short 2")).toBeVisible();
    await parts.page.getByPlaceholder(/Supplier/).fill("Honda Parts Lahore");
    await parts.page.getByRole("button", { name: "Reserve stock & order missing parts" }).click();
    await waitFor(bookingId, "PARTS_ORDERED");
    expect((await stock("FILT-OIL")).qtyOnHand).toBe(filterBefore.qtyOnHand - 1); // filter reserved

    // Partial delivery: 1 of 2 coils → booking stays PARTS_ORDERED.
    await parts.page.reload();
    await parts.page.getByLabel(`Quantity of ${COIL.name} received`).fill("1");
    await parts.page.getByRole("button", { name: "Confirm delivery" }).click();
    await expect(parts.page.getByText("Partial delivery received")).toBeVisible();
    expect(await status(bookingId)).toBe("PARTS_ORDERED");

    // The rest arrives → reserved for the job → PARTS_READY automatically.
    await parts.page.reload();
    await parts.page.getByLabel(`Quantity of ${COIL.name} received`).fill("1");
    await parts.page.getByRole("button", { name: "Confirm delivery" }).click();
    await waitFor(bookingId, "PARTS_READY");

    await parts.page.reload();
    await parts.page.getByRole("button", { name: "Allocate & release to technician" }).click();
    await waitFor(bookingId, "IN_REPAIR");
    expect((await stock(COIL.sku)).qtyOnHand).toBe(0); // +2 received, −2 allocated
  });

  // --- 7. Repair → QC FAILS → rework → QC passes ---------------------------------
  await test.step("technician repairs; QC fails it once with an issue", async () => {
    await pos(tech.page, bookingId);
    await tech.page.getByRole("button", { name: "Send to QC" }).click();
    await waitFor(bookingId, "QC_PENDING");

    await qc.page.goto(`/pos/${L}/qc`);
    const row = qc.page.getByRole("listitem").filter({ hasText: `LEA-${run.slice(-4)}` });
    await row.getByRole("button", { name: "Pick" }).click();
    await waitFor(bookingId, "QC_IN_PROGRESS");
    await qc.page.waitForURL(new RegExp(`/bookings/${bookingId}`));
    await qc.page.getByPlaceholder(/Issue title/).fill("Minor oil leak at the filter");
    await qc.page.getByPlaceholder("Describe what needs fixing").fill("Seal not seated.");
    await qc.page.getByRole("button", { name: /Fail QC/ }).click();
    await waitFor(bookingId, "IN_REPAIR");
  });

  await test.step("technician sees the issue, fixes it and resubmits; QC passes", async () => {
    await pos(tech.page, bookingId);
    await expect(tech.page.getByText("Minor oil leak at the filter").first()).toBeVisible();
    await tech.page.getByPlaceholder("What did you do? (optional)").fill("Re-seated the filter seal.");
    await tech.page.getByRole("button", { name: "Send to QC" }).click();
    await waitFor(bookingId, "QC_PENDING");

    await pos(qc.page, bookingId);
    await qc.page.getByRole("button", { name: "Pick job" }).click();
    await waitFor(bookingId, "QC_IN_PROGRESS");
    await qc.page.reload();
    await qc.page.getByLabel("Road test").check();
    await qc.page.getByLabel("Fluid levels & leaks").check();
    await qc.page.getByRole("button", { name: "Pass QC" }).click();
    await waitFor(bookingId, "READY_FOR_PICKUP");
  });

  // --- 8. Hand-back -----------------------------------------------------------
  await test.step("advisor notifies; customer collects → COMPLETED", async () => {
    await pos(advisor.page, bookingId);
    await advisor.page.getByRole("button", { name: "Notify customer" }).click();
    await expect(advisor.page.getByText("Customer notified").first()).toBeVisible();

    await cust.goto("/account");
    await expect(cust.getByText("Your car is ready for pick-up")).toBeVisible();
    await cust.goto(`/account/bookings/${bookingId}`);
    await cust.getByRole("button", { name: /collected my car/ }).click();
    await waitFor(bookingId, "COMPLETED");
  });

  // --- 9. The audit trail tells the whole story ---------------------------------
  await test.step("every transition is in the audit log with who/when/from/to", async () => {
    const { booking } = await (await sa.get(`/api/shops/${L}/bookings/${bookingId}`)).json();
    const path = (booking.history as { from: string | null; to: string }[]).reverse().map((h) => h.to);
    expect(path).toEqual([
      "PENDING",
      "CONFIRMED",
      "ASSIGNED",
      "INSPECTING",
      "ESTIMATE_REVIEW",
      "AWAITING_CUSTOMER",
      "ESTIMATE_REJECTED",
      "ESTIMATE_REVIEW",
      "AWAITING_CUSTOMER",
      "ESTIMATE_APPROVED",
      "PARTS_PENDING",
      "PARTS_ORDERED",
      "PARTS_READY",
      "IN_REPAIR",
      "QC_PENDING",
      "QC_IN_PROGRESS",
      "IN_REPAIR",
      "QC_PENDING",
      "QC_IN_PROGRESS",
      "READY_FOR_PICKUP",
      "READY_FOR_PICKUP", // customer notified (logged, no status change)
      "COMPLETED",
    ]);
    for (const h of booking.history) {
      expect(h.by).toBeTruthy();
      expect(h.role).toBeTruthy();
      expect(h.at).toBeTruthy();
    }
    // The customer got notified along the way.
    const feed = await (await custCtx.request.get("/api/notifications")).json();
    const msgs = (feed.items as { message: string }[]).map((n) => n.message).join("\n");
    expect(msgs).toMatch(/estimate/i);
    expect(msgs).toMatch(/ready for pick-up/i);
  });

  await test.step("customer gets an invoice; staff see service history; owner sees revenue", async () => {
    await cust.goto(`/account/bookings/${bookingId}`);
    await cust.getByRole("link", { name: /View invoice/ }).click();
    await cust.waitForURL(new RegExp(`/invoice/${bookingId}`));
    await expect(cust.getByText("Invoice", { exact: true })).toBeVisible();
    await expect(cust.getByText("PKR 17,400")).toBeVisible(); // 2 × 6,500 + 900 + 3,500
    await expect(cust.getByRole("button", { name: /Print/ })).toBeVisible();

    // Another customer can't open it.
    const sana = await pageAs(browser, "sana");
    await sana.page.goto(`/invoice/${bookingId}`);
    await expect(sana.page.getByText(/could not be found/i)).toBeVisible();
    await sana.close();

    await pos(advisor.page, bookingId);
    await expect(advisor.page.getByText(/Service history/)).toBeVisible();

    const owner = await pageAs(browser, "owner");
    await owner.page.goto(`/pos/${L}`);
    await expect(owner.page.getByText("Revenue")).toBeVisible();
    await expect(owner.page.getByText("Avg turnaround")).toBeVisible();
    await owner.close();
  });

  await Promise.all([advisor.close(), tech.close(), parts.close(), qc.close(), custCtx.close(), sa.dispose(), partsApi.dispose()]);
});

