import { expect, test } from "@playwright/test";
import { ACCOUNTS, login, pageAs } from "./helpers";

/**
 * Brief §10 demo step 1 / §7.2: an owner signs up, creates a shop, adds employees,
 * creates a second shop and switches between them. Staff are scoped to their shop,
 * restricted by role, and lose access when deactivated.
 */
test.describe.configure({ mode: "serial" });
test.setTimeout(8 * 60_000);

const run = Date.now().toString(36).toUpperCase();
const owner = { name: "Nadia Owner", email: `owner.${run.toLowerCase()}@bayflow.test`, password: `own-${run}-pw` };
const tech = { name: "Bilal Tech", email: `tech.${run.toLowerCase()}@bayflow.test`, password: `tech-${run}-pw` };
const shop1 = `E2E Motors ${run}`;
const shop2 = `Second Garage ${run}`;

test("owner signs up, builds two shops with a team, and switches between them", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const page = await ownerCtx.newPage();
  let shop1Id = "";
  let shop2Id = "";

  await test.step("owner self-signs up and lands on 'create your first shop'", async () => {
    await page.goto("/signup");
    await page.getByLabel("Your name").fill(owner.name);
    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill(owner.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Account created. Sign in to continue.")).toBeVisible();
    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill(owner.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/pos\/new/);
  });

  const createShop = async (name: string, city: string) => {
    await page.goto("/pos/new");
    await page.getByLabel("Shop name").fill(name);
    await page.getByLabel("Phone").fill("+92 42 555 0000");
    await page.getByLabel("Address").fill("1 Test Road");
    await page.getByLabel("City").fill(city);
    await page.getByRole("button", { name: "Create shop" }).click();
    await page.waitForURL(/\/pos\/[^/]+\?welcome=1/);
    await expect(page.getByText("Your shop is live on BayFlow.")).toBeVisible();
    return new URL(page.url()).pathname.split("/")[2];
  };

  await test.step("creates the first shop (with a starter service menu)", async () => {
    shop1Id = await createShop(shop1, "Multan");
    await page.goto(`/pos/${shop1Id}/services`);
    await expect(page.getByText("Oil change")).toBeVisible();
  });

  await test.step("adds a technician — staff can't self-register, the owner creates the login", async () => {
    await page.goto(`/pos/${shop1Id}/team`);
    await page.getByLabel("Name", { exact: true }).fill(tech.name);
    await page.getByLabel("Email").fill(tech.email);
    await page.getByLabel("Role").selectOption("TECHNICIAN");
    await page.getByLabel("Temporary password").fill(tech.password);
    await page.getByRole("button", { name: "Add to team" }).click();
    await expect(page.getByText(tech.email)).toBeVisible();
  });

  await test.step("adds a service to the catalogue", async () => {
    await page.goto(`/pos/${shop1Id}/services`);
    await page.getByLabel("Name").first().fill("Hybrid battery check");
    await page.getByLabel("Minutes").first().fill("90");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Hybrid battery check")).toBeVisible();
  });

  await test.step("creates a second shop and switches between them", async () => {
    shop2Id = await createShop(shop2, "Multan");
    expect(shop2Id).not.toBe(shop1Id);
    await page.getByRole("button", { name: new RegExp(shop2) }).first().click(); // open switcher
    await expect(page.getByRole("link", { name: new RegExp(shop1) })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(shop1) }).click();
    await page.waitForURL(new RegExp(`/pos/${shop1Id}`));
    // Separate teams: the technician belongs to shop 1 only.
    await page.goto(`/pos/${shop2Id}/team`);
    await expect(page.getByText("No team members yet.")).toBeVisible();
  });

  await test.step("the new shop is publicly bookable", async () => {
    const res = await page.request.get(`/api/shops/${shop1Id}`);
    expect(res.ok()).toBeTruthy();
    const { shop } = await res.json();
    expect(shop.services.map((s: { name: string }) => s.name)).toContain("Hybrid battery check");
  });

  const techCtx = await browser.newContext();
  const techPage = await techCtx.newPage();

  await test.step("the technician signs in and sees only their shop and role", async () => {
    await login(techPage, tech.email, tech.password);
    await expect(techPage).toHaveURL(new RegExp(`/pos/${shop1Id}`));
    await expect(techPage.getByRole("link", { name: "My jobs", exact: true })).toBeVisible();
    await expect(techPage.getByRole("link", { name: "Team", exact: true })).toHaveCount(0);
    // Owner-only and other-shop pages are not reachable.
    await techPage.goto(`/pos/${shop1Id}/team`);
    await expect(techPage.getByText(/could not be found/i)).toBeVisible();
    await techPage.goto(`/pos/${shop2Id}`);
    await expect(techPage.getByText(/could not be found/i)).toBeVisible();
  });

  await test.step("owner deactivates the technician → access is gone immediately", async () => {
    await page.goto(`/pos/${shop1Id}/team`);
    await page.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("(deactivated)")).toBeVisible();
    await techPage.goto(`/pos/${shop1Id}`);
    await expect(techPage.getByText(/could not be found/i)).toBeVisible();
  });

  await Promise.all([ownerCtx.close(), techCtx.close()]);
});

test("Fatima switches between her three seeded shops", async ({ browser }) => {
  const { page, close } = await pageAs(browser, "owner");
  await page.goto("/pos");
  await page.waitForURL(/\/pos\/[^/]+$/);
  await page.locator("aside").getByRole("button").first().click();
  for (const name of ["Lahore Auto Care", "Karachi Motor Works", "Islamabad Service Hub"]) {
    await expect(page.locator("aside").getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  }
  // …but never Hamza's shops.
  await expect(page.locator("aside").getByRole("link", { name: /Rawalpindi/ })).toHaveCount(0);
  await page.locator("aside").getByRole("link", { name: /Karachi Motor Works/ }).first().click();
  await expect(page.getByText("Karachi Motor Works · Karachi")).toBeVisible();
  await close();
  expect(ACCOUNTS.owner).toBe("owner@bayflow.test");
});
