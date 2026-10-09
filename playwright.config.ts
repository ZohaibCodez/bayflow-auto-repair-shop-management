import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the real app + database (seeded demo data).
 * Uses the locally installed Google Chrome (`channel: "chrome"`) — no browser download.
 *
 *   pnpm db:seed          # fresh demo data
 *   pnpm test:e2e         # starts `pnpm dev` if it isn't already running
 *   E2E_BASE_URL=https://bayflow.example.com pnpm test:e2e   # against a deployment
 *
 * Tests share one database, so they run serially. Timeouts are generous because each
 * workflow step is a real transaction against a remote Postgres.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 6 * 60_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
