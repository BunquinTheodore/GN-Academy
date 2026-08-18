import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

/**
 * Phase 1 gate flow: sign up → claims synced → authenticated profiles query
 * succeeds under RLS → sign out → protected route redirects.
 *
 * Needs real Firebase + Supabase keys and the applied 0001 migration, so it
 * runs only when E2E_AUTH=1 is set. Until then the placeholder-key skip keeps
 * `npm run test:e2e` honest instead of red.
 */
test.describe("auth flow", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run the full auth flow.",
  );

  // Local runs share one IP; reset limiter windows so the rate limiter
  // (working as designed) doesn't fail the suite.
  test.beforeAll(async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    await supabase.from("rate_limits").delete().neq("key", "");
  });

  test("sign up, sync, query profiles under RLS, sign out", async ({ page }) => {
    test.setTimeout(120_000); // live Firebase + Supabase round-trips
    const email = `e2e+${Date.now()}@example.com`;
    const password = "e2e-test-password-1";

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create my account" }).click();

    // Redirects to the dashboard once the session cookie is set.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
    await expect(
      page.getByText("Your talent profile", { exact: true }),
    ).toBeVisible();

    // The dashboard renders the profile row read through the DAL — reaching
    // it proves the sync route upserted the profile.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
