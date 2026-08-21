import { expect, test } from "@playwright/test";

test("the landing page sells and sends visitors to sign up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /almost nobody can prove it/i,
  );
  await expect(
    page.getByRole("link", { name: /create your free account/i }).first(),
  ).toBeVisible();
});

/**
 * The catalogue is the paid product and now sits behind the login, so the
 * landing page must not link into it — not in the nav, not in the body, not
 * in the footer. A link that bounces a stranger to /login is a worse first
 * impression than no link.
 */
test("the landing page never links to the gated catalogue", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/certifications"]')).toHaveCount(0);
  await expect(page.locator('a[href="/start-free"]')).toHaveCount(0);
});

test("courses are unreachable until you sign in", async ({ page }) => {
  for (const path of [
    "/certifications",
    "/certifications/ai-foundations",
    "/start-free",
  ]) {
    await page.goto(path);
    await expect(page, `${path} must require a session`).toHaveURL(/\/login/);
  }
});

test("protected dashboard redirects logged-out visitors to login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("admin area is hidden from logged-out visitors", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("login page links to signup and forgot password", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
});

test("legal pages exist and are marked as drafts", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText(/pending legal review/i)).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByText(/pending legal review/i)).toBeVisible();
});

test("ai-test entry leads to the quiz", async ({ page }) => {
  await page.goto("/ai-test");
  await page.getByRole("link", { name: "Start my test" }).click();
  // Generous timeout: first dev-server compile of the route plus a failing
  // placeholder-key DB call can take a while before the page responds.
  await expect(page).toHaveURL(/\/ai-test\/quiz/, { timeout: 30_000 });
  // With live keys the first question renders; with placeholders the
  // explicit error state must show — never a crash or blank page.
  await expect(
    page
      .getByRole("radiogroup")
      .or(page.getByText("The test couldn't load")),
  ).toBeVisible({ timeout: 15_000 });
});

test("security headers are present", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
