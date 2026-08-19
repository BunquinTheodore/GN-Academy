import { chromium, request } from "@playwright/test";

/**
 * Warms the server before any test runs.
 *
 * Playwright's webServer health check only fetches `/`, which is static — it
 * proves the process is listening, not that it can do any work. Two costs are
 * paid by whichever request arrives first:
 *
 *  - the TLS handshake to Supabase in another region, and firebase-admin
 *    initialising and fetching Google's signing keys;
 *  - the first *server action* dispatch, which is by far the larger of the
 *    two. Measured here at roughly two minutes cold against about two
 *    seconds warm, and because actions queue behind it, every test running
 *    in parallel wears the whole delay and times out together.
 *
 * The action warm-up therefore has to be a real submission, not a GET. The
 * credential lookup form on /verify is public, side-effect free, and does
 * nothing but redirect — exactly what is wanted.
 *
 * All of it is best-effort: a failed warm-up must not stop the tests from
 * running and reporting the real problem.
 */
export default async function globalSetup() {
  const port = Number(process.env.E2E_PORT ?? 3222);
  const baseURL = `http://localhost:${port}`;

  const warm = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      console.warn(`[warm-up] ${label} failed (continuing):`, e);
    }
  };

  const context = await request.newContext({ baseURL });
  await Promise.all([
    warm("certifications", () => context.get("/certifications")),
    warm("verify", () => context.get("/verify/CAVA-2026-000001")),
    warm("blog", () => context.get("/blog")),
    // A garbage session cookie still makes the dashboard layout call
    // verifySessionCookie, which is what initialises firebase-admin. Going
    // through /dashboard rather than /api/auth/session avoids spending one
    // of the auth rate limiter's ten tokens on a warm-up.
    warm("firebase-admin", () =>
      context.get("/dashboard", {
        headers: { cookie: "gn_session=warm-up-not-a-real-cookie" },
        failOnStatusCode: false,
      }),
    ),
  ]);
  await context.dispose();

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    await warm("server action", async () => {
      await page.goto("/verify");
      await page.getByLabel("Credential code").fill("WARMUP-0000-000000");
      await page.getByRole("button", { name: "Verify" }).click();
      await page.waitForURL(/\/verify\//, { timeout: 180_000 });
    });
  } finally {
    await browser.close();
  }
}
