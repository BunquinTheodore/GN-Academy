import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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

/**
 * Promotes a signed-up user to admin the same way `npm run make-admin` does.
 * The claim only reaches the app through a freshly minted session cookie, so
 * the caller has to sign out and back in afterwards.
 */
async function makeAdmin(email: string): Promise<void> {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(
          /\\n/g,
          "\n",
        ),
      }),
    });
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    role: "authenticated",
    admin: true,
  });
}

async function signUp(page: Page, email: string, name: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("admin-flow-pass-1");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("admin-flow-pass-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

/**
 * The §17 gate, exercised through the actual UI rather than through the
 * database: a non-developer writes a post, publishes it, and it is live.
 *
 * This exists because the admin editors were, for a while, permanently stuck
 * on "Saving…" in a production build while the write landed underneath —
 * every server action here calls revalidatePath, and a server action that
 * both revalidates and returns state to useActionState never finishes its
 * transition. Nothing in the suite submitted an admin form, so nothing caught
 * it. Any test that does is enough; this one also proves the cache purge that
 * replaced those calls actually reaches the public page.
 */
test.describe("admin publishing", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run live flows.",
  );

  test.beforeEach(async () => {
    await serviceClient().from("rate_limits").delete().neq("key", "");
  });

  test("an admin writes, publishes, and edits a post without a deploy", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const stamp = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const email = `e2e-admin+${stamp}@example.com`;
    const slug = `e2e-post-${stamp}`;
    const title = `E2E publishing check ${stamp}`;
    const service = serviceClient();

    await signUp(page, email, "Admin Flow Tester");
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    try {
      await makeAdmin(email);
      // The session cookie is minted from the ID token, so the new claim only
      // arrives with a new sign-in.
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/(login)?$/, { timeout: 30_000 });
      await signIn(page, email);

      // 1. Create it — the form must come back, not hang on "Saving…".
      await page.goto("/admin/posts/new");
      await page.getByLabel("Title").fill(title);
      await page.getByLabel("URL slug").fill(slug);
      await page.getByLabel("Category").fill("Hiring");
      await page.getByLabel("Excerpt").fill("Written by the e2e suite.");
      await page
        .getByLabel("Body (Markdown)")
        .fill("## Body\n\nThis paragraph proves the post rendered.");
      await page.getByLabel("Status").selectOption("published");
      await page.getByRole("button", { name: "Create" }).click();

      await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/, {
        timeout: 90_000,
      });

      // 2. A logged-out stranger can read it immediately — the cached blog
      //    page has to have been purged, not left to expire on its own.
      const strangerContext = await browser.newContext();
      const stranger = await strangerContext.newPage();
      await stranger.goto(`/blog/${slug}`);
      await expect(stranger.getByRole("heading", { level: 1 })).toContainText(
        title,
      );
      await expect(
        stranger.getByText("This paragraph proves the post rendered."),
      ).toBeVisible();

      // 3. Editing an existing post reports success instead of hanging.
      await page.getByLabel("Excerpt").fill("Edited by the e2e suite.");
      await page.getByRole("button", { name: "Save" }).first().click();
      await expect(page.getByText("Saved.")).toBeVisible({ timeout: 90_000 });

      await strangerContext.close();
    } finally {
      await service.from("posts").delete().eq("slug", slug);
      if (profile?.id) {
        await service.from("profiles").delete().eq("id", profile.id);
      }
    }
  });
});
