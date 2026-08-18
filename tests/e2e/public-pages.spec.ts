import { expect, test } from "@playwright/test";

test("homepage renders with the funnel CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1 }),
  ).toContainText(/ready for the AI-powered workplace/i);
  await expect(
    page.getByRole("link", { name: "Take the free test" }).first(),
  ).toBeVisible();
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
