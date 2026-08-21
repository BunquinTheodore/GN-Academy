import { defineConfig, devices } from "@playwright/test";

/**
 * A dedicated port, not 3000. reuseExistingServer means anything already
 * listening gets used as-is — and an unrelated project left on 3000 will
 * silently answer every request, turning the whole suite red for reasons
 * that have nothing to do with this app. Override with E2E_PORT.
 */
const PORT = Number(process.env.E2E_PORT ?? 3222);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Tests run against a production build by default. `next dev` compiles each
 * route on first request, so under a parallel suite the first test to touch
 * a route pays several seconds while everything else queues behind it — the
 * suite then fails in a different place on every run. A prebuilt server has
 * no compile step, and is what users actually get.
 *
 * E2E_DEV=1 swaps back to the dev server for fast iteration on a single spec.
 */
const useDevServer = process.env.E2E_DEV === "1";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  /**
   * The app under test is one Node process. Playwright's default (about half
   * the CPU count) puts more browsers in flight than that process can serve,
   * and the extra workers only add queueing — long enough that live flows
   * time out and the suite goes red for load rather than for defects.
   */
  workers: Number(process.env.E2E_WORKERS ?? 3),
  /**
   * One local retry. The live flows make real round trips to Firebase and to
   * a database in another region; on a busy machine a single call can blow
   * its budget without anything being wrong with the code. A retry keeps a
   * genuine regression visible (it fails twice) without a loaded laptop
   * reporting one.
   */
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // Mobile-first product — the mobile viewport is the primary target (§2).
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: useDevServer
      ? `npm run dev -- --port ${PORT}`
      : `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // The default path includes a build on a cold cache.
    timeout: useDevServer ? 120_000 : 300_000,
  },
});
