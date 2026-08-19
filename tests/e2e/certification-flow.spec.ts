import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

test.describe("credential verification (public)", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test("a stranger can verify a demo credential", async ({ page }) => {
    await page.goto("/verify/CAVA-2026-000001");
    await expect(
      page.getByText("Verified credential", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Juana Dela Cruz (Demo Record)")).toBeVisible();
    await expect(
      page.getByText("demonstration record", { exact: false }),
    ).toBeVisible();
  });

  test("an invalid code gets a clear not-found state, never a 500", async ({
    page,
  }) => {
    const response = await page.goto("/verify/FAKE-0000-999999");
    expect(response!.status()).toBeLessThan(500);
    await expect(page.getByText("No credential found")).toBeVisible();
  });
});

test.describe("certification journey", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  // Local runs share one IP; reset limiter windows per test so the rate
  // limiter (working as designed) doesn't fail the suite.
  test.beforeEach(async () => {
    await serviceClient().from("rate_limits").delete().neq("key", "");
  });

  test("paid enrollment goes pending, activates on approval", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = `e2e-paid+${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Paid Flow Tester");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("paid-flow-pass-1");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });

    await page.goto("/certifications/certified-ai-virtual-assistant/enroll");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "GCash" }).click();
    await page.getByLabel("Payment reference number").fill("9021456783312");
    await page.getByRole("button", { name: "Submit enrollment" }).click();
    await expect(page).toHaveURL(/\/dashboard\/courses/, { timeout: 30_000 });
    await expect(page.getByText("Awaiting payment confirmation")).toBeVisible();

    // Approve (same DB transition the admin queue performs, audit-logged there).
    const service = serviceClient();
    const { data: enrollment } = await service
      .from("enrollments")
      .select("id, profiles!inner(email)")
      .eq("profiles.email", email)
      .single();
    await service
      .from("enrollments")
      .update({ status: "active", approved_at: new Date().toISOString() })
      .eq("id", enrollment!.id);

    await page.reload();
    await expect(
      page.getByRole("link", { name: "Start learning" }),
    ).toBeVisible();
  });

  test("enroll free, finish lessons, pass exam, verify credential publicly", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    // The e2e knows the correct answers via the service role — the browser
    // never sees them, which is the point of the RLS design.
    const { data: exam } = await serviceClient()
      .from("assessments")
      .select("id")
      .eq("slug", "ai-foundations-exam")
      .single();
    const { data: examQuestions } = await serviceClient()
      .from("questions")
      .select("id, options, correct_option_id")
      .eq("assessment_id", exam!.id);
    const correctTextByPrompt = new Map(
      examQuestions!.map((q) => {
        const options = q.options as { id: string; text: string }[];
        return [q.id, options.find((o) => o.id === q.correct_option_id)!.text];
      }),
    );

    // 1. Sign up
    const email = `e2e-cert+${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Cert Flow Tester");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("cert-flow-pass-1");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });

    // 2. Enroll in the free course (instant activation)
    await page.goto("/certifications/ai-foundations/enroll");
    await page.getByRole("button", { name: "Start learning now" }).click();
    await expect(page).toHaveURL(/\/dashboard\/courses/, { timeout: 30_000 });

    // 3. Complete all lessons
    await page.getByRole("link", { name: "Start learning" }).click();
    await expect(page).toHaveURL(/\/dashboard\/learn\//, { timeout: 30_000 });
    for (let i = 0; i < 10; i++) {
      if (!page.url().includes("/dashboard/learn/")) break;
      const before = page.url();
      await page
        .getByRole("button", { name: /Mark complete and continue|next lesson/ })
        .click();
      // Each completion is several round trips to the database region, and
      // both viewport projects run this journey at once — same budget as the
      // other live round-trip waits in the suite.
      await page.waitForURL((url) => url.toString() !== before, {
        timeout: 45_000,
      });
    }
    await expect(page).toHaveURL(/\/dashboard\/courses/, { timeout: 30_000 });

    // 4. Take and pass the exam with the known-correct answers
    await page.getByRole("link", { name: "Take the exam" }).click();
    await page.getByRole("link", { name: "Start the exam" }).click();
    await page.getByRole("button", { name: "Start the exam" }).click();

    const questionCount = correctTextByPrompt.size;
    for (let i = 0; i < questionCount; i++) {
      const radios = page.getByRole("radio");
      await expect(radios.first()).toBeVisible({ timeout: 15_000 });
      // Click the correct option by matching visible text against the key.
      let clicked = false;
      for (const text of correctTextByPrompt.values()) {
        const option = page.getByRole("radio", { name: text, exact: true });
        if ((await option.count()) === 1) {
          await option.click();
          clicked = true;
          break;
        }
      }
      expect(clicked).toBe(true);
      await page
        .getByRole("button", {
          name: i === questionCount - 1 ? "Submit exam" : "Next",
          exact: true,
        })
        .click();
    }

    // 5. Credential issued on the spot
    await expect(
      page.getByText("Passed. Your credential is live."),
    ).toBeVisible({ timeout: 45_000 });
    const codeText = await page
      .locator("p.font-mono.text-lg")
      .first()
      .textContent();
    expect(codeText).toMatch(/^AIF-\d{4}-\d{6}$/);

    // 6. A stranger (fresh context = logged out) verifies it publicly
    await page.context().clearCookies();
    await page.goto(`/verify/${codeText}`);
    await expect(
      page.getByText("Verified credential", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Cert Flow Tester")).toBeVisible();
  });
});
