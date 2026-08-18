import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

/**
 * §7: prove a logged-out client cannot read private data, directly against
 * the live API with the public anon key — RLS is the security boundary.
 */
test.describe("RLS security", () => {
  test.skip(
    process.env.E2E_AUTH !== "1",
    "Set E2E_AUTH=1 with real keys in .env.local to run RLS checks.",
  );

  function anonClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }

  test("anon cannot read private profiles", async () => {
    const { data, error } = await anonClient()
      .from("profiles")
      .select("id, email, is_public");
    expect(error).toBeNull();
    // e2e signups exist in the table; none are public, so anon sees nothing.
    expect(data!.every((p) => p.is_public === true)).toBe(true);
  });

  test("anon cannot read attempts (they exist, but stay invisible)", async () => {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { count } = await service
      .from("attempts")
      .select("id", { count: "exact", head: true });
    expect(count).toBeGreaterThan(0);

    const { data, error } = await anonClient().from("attempts").select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("anon cannot read questions (correct answers stay server-side)", async () => {
    const { data, error } = await anonClient()
      .from("questions")
      .select("id, correct_option_id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("anon cannot read leads", async () => {
    const { data, error } = await anonClient().from("leads").select("email");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("anon cannot update a profile", async () => {
    const { data, error } = await anonClient()
      .from("profiles")
      .update({ headline: "hacked" })
      .neq("id", "")
      .select();
    // Either an explicit error or zero affected rows is acceptable — what
    // matters is that nothing changes.
    if (!error) expect(data).toHaveLength(0);
  });
});
