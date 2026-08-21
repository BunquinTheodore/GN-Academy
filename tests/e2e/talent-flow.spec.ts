import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

/**
 * Both viewport projects run every test at once, so Date.now() alone is not
 * unique — two workers starting in the same millisecond raced for the same
 * username and one correctly got "that username is taken".
 */
function unique(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function signUp(page: Page, email: string, name: string) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("talent-pass-1");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });

  const { data } = await serviceClient()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  return data!.id as string;
}

/** Grants the credential the profile gate requires, without a 5-minute exam. */
async function grantCredential(userId: string, code: string) {
  await serviceClient().from("credentials").insert({
    credential_code: code,
    user_id: userId,
    holder_name: "Talent Flow Tester",
    title: "Certified AI Virtual Assistant",
    level: "professional",
    status: "active",
  });
}

async function cleanUp(userId: string, code: string) {
  const service = serviceClient();
  await service.from("credentials").delete().eq("credential_code", code);
  await service.from("employer_enquiries").delete().eq("talent_user_id", userId);
  await service.from("portfolio_items").delete().eq("user_id", userId);
  await service.from("profiles").delete().eq("id", userId);
}

test.describe("talent layer", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test.beforeEach(async () => {
    await serviceClient().from("rate_limits").delete().neq("key", "");
  });

  // These tests once failed here for what looked like load — a save that sat
  // on "Saving…" until the budget ran out. It was not load: the action was
  // calling revalidatePath, which stops a useActionState transition from ever
  // completing in a production build. See AdminFormState. Measure before
  // widening a timeout in this file.

  test("a profile without a credential cannot go public", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `e2e-nocred+${unique()}@example.com`;
    const userId = await signUp(page, email, "No Credential");

    try {
      const headline = `Held back ${unique()}`;
      await page.goto("/dashboard/profile");
      await page.getByLabel("Username").fill(`nocred-${unique()}`);
      await page.getByLabel("Headline").fill(headline);
      await page
        .getByLabel("List me in the employer directory")
        .check();
      await page.getByRole("button", { name: "Save" }).first().click();

      await expect(page.getByText(/Saved as private/i)).toBeVisible({
        timeout: 90_000,
      });

      // The tick is refused; the rest of the edit is not. Someone filling the
      // form in before they have passed anything must not lose it.
      const { data } = await serviceClient()
        .from("profiles")
        .select("is_public, headline")
        .eq("id", userId)
        .single();
      expect(data!.is_public).toBe(false);
      expect(data!.headline).toBe(headline);
    } finally {
      await serviceClient().from("profiles").delete().eq("id", userId);
    }
  });

  test("credential holder publishes a profile, a stranger reads it, and unpublishing hides it", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const stamp = unique();
    const email = `e2e-talent+${stamp}@example.com`;
    const username = `talent-${stamp}`;
    const code = `E2ET-2026-${stamp.toUpperCase().slice(-6)}`;

    const userId = await signUp(page, email, "Talent Flow Tester");
    await grantCredential(userId, code);

    try {
      // 1. Fill in and publish the profile
      await page.goto("/dashboard/profile");
      await page.getByLabel("Username").fill(username);
      await page
        .getByLabel("Headline")
        .fill("AI-assisted VA for e-commerce founders");
      await page.getByLabel("About").fill("Built by the e2e suite.");
      await page
        .getByLabel("Skills")
        .fill("Inbox triage\nPrompt templates\nMeeting notes");
      await page.getByLabel("List me in the employer directory").check();
      await page.getByRole("button", { name: "Save" }).first().click();
      await expect(page.getByText(/public profile is up to date/i)).toBeVisible({
        timeout: 90_000,
      });

      // 2. Add a piece of work. The portfolio is the reason the talent layer
      //    exists, and its editor shares AdminForm with everything else that
      //    was hanging in production, so it gets exercised here.
      const workTitle = `Weekly reporting pipeline ${stamp}`;
      await page.getByRole("group").getByText("+ Add a piece of work").click();
      await page.getByLabel("Title").fill(workTitle);
      await page
        .getByLabel("What you did")
        .fill("Automated a Shopify sales digest; cut two hours a week.");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.getByText("Added to your portfolio.")).toBeVisible({
        timeout: 90_000,
      });

      // 3. A logged-out stranger sees it, credentials and all
      const strangerContext = await browser.newContext();
      const stranger = await strangerContext.newPage();
      await stranger.goto(`/talent/${username}`);
      await expect(stranger.getByRole("heading", { level: 1 })).toContainText(
        "Talent Flow Tester",
      );
      await expect(
        stranger.getByText("AI-assisted VA for e-commerce founders"),
      ).toBeVisible();
      await expect(stranger.getByText(code)).toBeVisible();
      await expect(stranger.getByText("Inbox triage")).toBeVisible();
      await expect(stranger.getByText(workTitle)).toBeVisible();

      // The credential link goes to the real public verification page.
      await stranger.getByRole("link", { name: new RegExp(code) }).click();
      await expect(stranger).toHaveURL(new RegExp(`/verify/${code}`));

      // 4. They appear in the employer directory
      await stranger.goto("/employers");
      await expect(
        stranger.getByRole("link", { name: /Talent Flow Tester/ }),
      ).toBeVisible();

      // 5. An employer enquiry about them reaches the queue
      await stranger.goto(`/employers/enquire?talent=${username}`);
      await stranger.getByLabel("Your name").fill("Hiring Manager");
      await stranger
        .getByLabel("Email", { exact: true })
        .fill(`e2e-employer+${stamp}@example.com`);
      await stranger
        .getByRole("textbox", { name: "Company" })
        .fill("Example Co");
      await stranger
        .getByLabel("What you're hiring for")
        .fill("Part-time VA to run our support inbox with AI in the loop.");
      await stranger.getByRole("button", { name: "Send enquiry" }).click();
      await expect(stranger.getByText(/Enquiry received/i)).toBeVisible({
        timeout: 90_000,
      });

      const { data: enquiry } = await serviceClient()
        .from("employer_enquiries")
        .select("talent_user_id, status")
        .eq("employer_email", `e2e-employer+${stamp}@example.com`)
        .single();
      expect(enquiry).toMatchObject({ talent_user_id: userId, status: "new" });

      // 6. Unpublishing hides the profile — and looks identical to a
      //    username that never existed.
      await page.goto("/dashboard/profile");
      await page.getByLabel("List me in the employer directory").uncheck();
      await page.getByRole("button", { name: "Save" }).first().click();
      await expect(page.getByText(/profile is private/i)).toBeVisible({
        timeout: 90_000,
      });

      const hidden = await stranger.goto(`/talent/${username}`);
      expect(hidden!.status()).toBe(404);

      await stranger.goto("/employers");
      await expect(
        stranger.getByRole("link", { name: /Talent Flow Tester/ }),
      ).toHaveCount(0);

      await strangerContext.close();
    } finally {
      await cleanUp(userId, code);
    }
  });

  test("a username is not silently stolen from another account", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const stamp = unique();
    const username = `dupe-${stamp}`;

    const firstEmail = `e2e-dupe-a+${stamp}@example.com`;
    const firstId = await signUp(page, firstEmail, "First Claimer");

    try {
      await page.goto("/dashboard/profile");
      await page.getByLabel("Username").fill(username);
      await page.getByRole("button", { name: "Save" }).first().click();
      await expect(page.getByText(/Saved\./)).toBeVisible({ timeout: 90_000 });

      const secondContext = await browser.newContext();
      const second = await secondContext.newPage();
      const secondEmail = `e2e-dupe-b+${stamp}@example.com`;
      const secondId = await signUp(second, secondEmail, "Second Claimer");

      try {
        await second.goto("/dashboard/profile");
        // Different case: uniqueness has to be case-insensitive, or two
        // people end up at two URLs that look like the same person.
        await second.getByLabel("Username").fill(username.toUpperCase());
        await second.getByRole("button", { name: "Save" }).first().click();
        await expect(second.getByText(/is taken/i)).toBeVisible({
          timeout: 90_000,
        });

        const { data } = await serviceClient()
          .from("profiles")
          .select("username")
          .eq("id", secondId)
          .single();
        expect(data!.username).toBeNull();
      } finally {
        await serviceClient().from("profiles").delete().eq("id", secondId);
        await secondContext.close();
      }
    } finally {
      await serviceClient().from("profiles").delete().eq("id", firstId);
    }
  });
});

test.describe("storage policies", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test("anonymous visitors cannot write to the portfolio bucket", async ({
    request,
  }) => {
    // The buckets are public-read on purpose; writes must be refused for
    // anyone without a matching Firebase UID folder (§9).
    const response = await request.post(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/portfolio/someone-elses-folder/evil.webp`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          "Content-Type": "image/webp",
        },
        data: Buffer.from("not really an image"),
      },
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
