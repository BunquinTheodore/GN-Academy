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

test.describe("blog (public)", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test("index lists published posts and filters by category", async ({
    page,
  }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");

    const post = page.getByRole("link", {
      name: /What employers actually check/,
    });
    await expect(post).toBeVisible();

    const categories = page.getByRole("navigation", { name: "Categories" });
    await categories.getByRole("link", { name: "For employers" }).click();
    await expect(page).toHaveURL(/category=For\+employers|category=For%20employers/);
    // The Hiring post must be gone; the For-employers one must remain.
    await expect(
      page.getByRole("link", { name: /How to verify a GN Academy credential/ }),
    ).toBeVisible();
    await expect(post).toHaveCount(0);
  });

  test("an unknown category falls back to all posts, not an empty list", async ({
    page,
  }) => {
    await page.goto("/blog?category=NotARealCategory");
    await expect(
      page.getByRole("link", { name: /What employers actually check/ }),
    ).toBeVisible();
  });

  test("a post renders its body and Article JSON-LD", async ({ page }) => {
    await page.goto("/blog/what-employers-actually-check");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "What employers actually check",
    );
    // Body is MDX from the database — headings prove it was rendered, not escaped.
    await expect(
      page.getByRole("heading", { name: "What the check actually looks like" }),
    ).toBeVisible();

    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(jsonLd.some((raw) => JSON.parse(raw)["@type"] === "Article")).toBe(
      true,
    );
  });

  test("drafts are not reachable", async ({ page }) => {
    const service = serviceClient();
    const slug = `e2e-draft-${Date.now()}`;
    const { data: created } = await service
      .from("posts")
      .insert({
        slug,
        title: "E2E draft post",
        category: "General",
        status: "draft",
        content_mdx: "Draft body.",
      })
      .select("id")
      .single();

    try {
      const response = await page.goto(`/blog/${slug}`);
      expect(response!.status()).toBe(404);
      await page.goto("/blog");
      await expect(page.getByText("E2E draft post")).toHaveCount(0);
    } finally {
      await service.from("posts").delete().eq("id", created!.id);
    }
  });
});

test.describe("SEO surfaces", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test("sitemap lists certifications and posts but never a credential", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();

    expect(xml).toContain("/certifications/certified-ai-virtual-assistant");
    expect(xml).toContain("/blog/what-employers-actually-check");
    // Credential pages are public but deliberately unlisted — a sitemap of
    // them would turn a lookup tool into a directory of holders.
    expect(xml).not.toContain("/verify/CAVA-");
  });

  test("robots keeps crawlers out of admin and dashboard", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /dashboard");
    expect(body).toContain("Sitemap:");
  });
});

test.describe("admin access control", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test.beforeEach(async () => {
    await serviceClient().from("rate_limits").delete().neq("key", "");
  });

  test("a signed-in non-admin gets 404 from every admin surface", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = `e2e-nonadmin+${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Non Admin");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("non-admin-pass-1");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });

    // notFound(), not a redirect — the admin area's existence isn't advertised
    // to someone who is definitely logged in.
    for (const path of [
      "/admin",
      "/admin/certifications",
      "/admin/questions",
      "/admin/posts",
      "/admin/credentials",
      "/admin/leads",
      "/admin/data-requests",
    ]) {
      const response = await page.goto(path);
      expect(response!.status(), `${path} must 404 for a non-admin`).toBe(404);
    }
  });

  test("the lead export refuses a signed-in non-admin", async ({ page }) => {
    test.setTimeout(120_000);
    const email = `e2e-export+${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Export Prober");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("export-pass-1");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });

    const response = await page.request.get("/admin/leads/export");
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain("@");
  });
});

test.describe("data requests", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test.beforeEach(async () => {
    await serviceClient().from("rate_limits").delete().neq("key", "");
  });

  test("a visitor can file a deletion request and it lands in the queue", async ({
    page,
  }) => {
    const email = `e2e-erasure+${Date.now()}@example.com`;

    await page.goto("/data-request");
    await page.getByLabel("Email on your account").fill(email);
    await page.getByLabel("Delete my account and data").check();
    await page
      .getByLabel("Anything else we should know")
      .fill("Filed by the e2e suite.");
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(
      page.getByText(/Request received\./),
    ).toBeVisible({ timeout: 20_000 });
    // The form is replaced by the confirmation, so it must be gone.
    await expect(
      page.getByRole("button", { name: "Send request" }),
    ).toHaveCount(0);

    const service = serviceClient();
    const { data } = await service
      .from("data_requests")
      .select("kind, status, email")
      .eq("email", email)
      .single();
    expect(data).toMatchObject({ kind: "deletion", status: "pending" });

    await service.from("data_requests").delete().eq("email", email);
  });
});
