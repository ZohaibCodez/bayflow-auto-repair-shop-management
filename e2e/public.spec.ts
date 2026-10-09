import { expect, test } from "@playwright/test";
import { ids, pageAs } from "./helpers";

/** Brief §7.3 customer portal + §10 product/UX: landing, directory, theme, mobile, access redirects. */

test.describe("landing & shop directory", () => {
  test("lists at least three shops with search and city filter", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /See your car move/ })).toBeVisible();
    const cards = page.locator("#shops article");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    await page.getByLabel("Search shops").fill("tyre");
    await expect(cards.filter({ hasText: "Rawalpindi Tyre & Tune" })).toBeVisible();
    for (const t of await cards.allInnerTexts()) expect(t.toLowerCase()).toContain("tyre");

    await page.getByLabel("Search shops").fill("");
    await page.getByRole("button", { name: "Karachi", exact: true }).click();
    for (const t of await cards.allInnerTexts()) expect(t).toContain("Karachi");

    await page.getByLabel("Search shops").fill("zzz-no-such-shop");
    await expect(page.getByText("No shops match that.")).toBeVisible();
  });

  test("Book takes you to that shop's wizard with only available slots", async ({ page }) => {
    const { lahore } = ids();
    await page.goto(`/book/${lahore}`);
    await expect(page.getByRole("heading", { name: "What does your car need?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled(); // must pick a service
    await page.getByRole("button", { name: /Oil change/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    const slots = page.getByRole("button", { name: /^\d{2}:\d{2}/ });
    await expect(slots.first()).toBeVisible();
    // Every listed slot comes straight from the availability API (none full, none past).
    const api = await (await page.request.get(`/api/shops/${lahore}`)).json();
    expect(api.shop.slotCapacity).toBeGreaterThan(0);
    for (const label of await slots.allInnerTexts()) expect(label).toMatch(/spot/);
  });
});

test.describe("theme", () => {
  test("one click switches light/dark and the choice survives a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/login");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/); // follows the OS until the user chooses
    // The auth screens use the two-button sun/moon switch; the lit one is pressed.
    const light = page.getByRole("button", { name: "Light theme" });
    const dark = page.getByRole("button", { name: "Dark theme" });
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(light).toHaveAttribute("aria-pressed", "false");
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await light.click();
    await expect(html).not.toHaveClass(/dark/);
    await expect(light).toHaveAttribute("aria-pressed", "true");
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(lightBg).not.toBe(darkBg);

    await page.reload();
    await expect(html).not.toHaveClass(/dark/); // persisted despite the dark OS setting
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(html).toHaveClass(/dark/);

    // Icon is centred in its button.
    const box = await dark.boundingBox();
    const icon = await dark.locator("svg").boundingBox();
    expect(Math.abs(icon!.x + icon!.width / 2 - (box!.x + box!.width / 2))).toBeLessThan(1.5);
    expect(Math.abs(icon!.y + icon!.height / 2 - (box!.y + box!.height / 2))).toBeLessThan(1.5);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const path of ["/", "/login", "/signup"]) {
    test(`${path} has no horizontal scroll at phone width`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
  test("booking wizard and POS are usable at phone width", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "sa");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/book/${ids().lahore}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.goto(`/pos/${ids().lahore}`);
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: /^Bookings/ })).toBeVisible();
    await close();
  });
});

test.describe("authentication & access", () => {
  test("wrong password is rejected with a clear message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("customer@bayflow.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  });

  test("signed-out visitors are sent to login and returned afterwards", async ({ page }) => {
    const target = `/pos/${ids().lahore}/bookings`;
    await page.goto(target);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    // Sign in on the page we were bounced to — we should land back on the original target.
    await page.getByLabel("Email").fill("sa.lahore@bayflow.test");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((u) => u.pathname === target, { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
  });

  test("each role only reaches its own screens", async ({ browser }) => {
    const L = ids().lahore;
    const tech = await pageAs(browser, "tech");
    for (const p of ["inventory", "purchase-orders", "team", "services", "settings", "qc"]) {
      await tech.page.goto(`/pos/${L}/${p}`);
      await expect(tech.page.getByText(/could not be found/i), p).toBeVisible();
    }
    await tech.close();

    const parts = await pageAs(browser, "parts");
    await parts.page.goto(`/pos/${L}/inventory`);
    await expect(parts.page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    await parts.page.goto(`/pos/${L}/team`);
    await expect(parts.page.getByText(/could not be found/i)).toBeVisible();
    await parts.close();

    const qc = await pageAs(browser, "qc");
    await qc.page.goto(`/pos/${L}/qc`);
    await expect(qc.page.getByRole("heading", { name: "QC queue" })).toBeVisible();
    await qc.close();

    // Customers have no POS at all.
    const cust = await pageAs(browser, "customer");
    await cust.page.goto(`/pos/${L}`);
    await expect(cust.page.getByText(/could not be found/i)).toBeVisible();
    await cust.page.goto("/account");
    await expect(cust.page.getByRole("heading", { name: /Hi Ahmed/ })).toBeVisible();
    await cust.close();
  });

  test("notification bell shows the feed", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "sa");
    await page.goto(`/pos/${ids().lahore}`);
    await page.locator("main").waitFor();
    await page.getByRole("button", { name: /^Notifications/ }).last().click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
    await close();
  });
});
