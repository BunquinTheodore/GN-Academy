import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

/**
 * Phase 2 gate flow (§17): a logged-out mobile visitor completes the test,
 * submits an email, sees a shareable result, and appears in `leads`.
 * Needs live keys + applied migrations — gated like the auth flow.
 */
test.describe("funnel flow", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run the live funnel flow.",
  );

  // Repeated local runs share one IP; clear rate-limit windows so the
  // limiter (working as designed) doesn't fail the suite.
  test.beforeEach(async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    await supabase.from("rate_limits").delete().neq("key", "");
  });

  test("take the test, hit the email gate, see results, land in leads", async ({
    page,
  }) => {
    test.setTimeout(180_000); // 15 questions + live network round-trips
    const email = `e2e-funnel+${Date.now()}@example.com`;

    await page.goto("/ai-test");
    await page.getByRole("link", { name: "Start my test" }).click();
    await expect(page).toHaveURL(/\/ai-test\/quiz/, { timeout: 30_000 });

    for (let i = 0; i < 15; i++) {
      const radios = page.getByRole("radio");
      await expect(radios.first()).toBeVisible({ timeout: 15_000 });
      await radios.nth(1).click();
      const nextButton = page.getByRole("button", {
        name: i === 14 ? "Finish" : "Next",
        exact: true,
      });
      await expect(nextButton).toBeEnabled();
      await nextButton.click();
    }

    // Email gate appears only after the final question (§8).
    await expect(page.getByText("Your score is ready")).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Show my result", exact: true }).click();

    // Shareable, server-rendered result.
    await expect(page).toHaveURL(/\/ai-test\/results\/[0-9a-f-]{36}/, {
      timeout: 30_000,
    });
    await expect(page.locator("#score-heading")).toBeVisible();
    await expect(page.getByText("Competency breakdown")).toBeVisible();
    await expect(
      page.getByText("Your score is unverified — employers can't see it."),
    ).toBeVisible();

    // The visitor is now a lead.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: leads, error } = await supabase
      .from("leads")
      .select("email, source, attempt_id")
      .eq("email", email);
    expect(error).toBeNull();
    expect(leads).toHaveLength(1);
    expect(leads![0].source).toBe("ai-test");
    expect(leads![0].attempt_id).toBeTruthy();
  });
});
