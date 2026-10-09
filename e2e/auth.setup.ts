import fs from "node:fs";
import { expect, request, test as setup } from "@playwright/test";
import { ACCOUNTS, AUTH_DIR, login, saveIds, statePath, type Role } from "./helpers";

/** Sign every demo role in once through the real login form and save the sessions. */
setup("sign in every demo role", async ({ browser }) => {
  setup.setTimeout(10 * 60_000);
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const shopFromUrl = (url: string) => new URL(url).pathname.split("/")[2];
  const found: Partial<Record<"lahore" | "karachi", string>> = {};

  for (const role of Object.keys(ACCOUNTS) as Role[]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ACCOUNTS[role]);
    // Post-login routing: staff/owners land in the POS, customers in their account.
    if (role === "customer" || role === "sana") {
      await expect(page).toHaveURL(/\/account/);
    } else {
      await expect(page).toHaveURL(/\/pos\//);
    }
    if (role === "sa") found.lahore = shopFromUrl(page.url());
    if (role === "saKarachi") found.karachi = shopFromUrl(page.url());
    await ctx.storageState({ path: statePath(role) });
    await ctx.close();
  }

  // Look up staff ids for API-driven assignments.
  const api = await request.newContext({
    baseURL: setup.info().project.use.baseURL,
    storageState: statePath("sa"),
  });
  const res = await api.get(`/api/shops/${found.lahore}/team`);
  expect(res.ok(), await res.text()).toBeTruthy();
  const { members } = (await res.json()) as { members: { userId: string; email: string; role: string }[] };
  const idOf = (email: string) => members.find((m) => m.email === email)!.userId;
  saveIds({
    lahore: found.lahore!,
    karachi: found.karachi!,
    techId: idOf(ACCOUNTS.tech),
    partsId: idOf(ACCOUNTS.parts),
  });
  await api.dispose();
});
