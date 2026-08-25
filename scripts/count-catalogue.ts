/**
 * Counts what is actually in the catalogue, for the landing page's stats band.
 *
 *   npx tsx scripts/count-catalogue.ts
 *
 * The band in `src/content/landing.ts` sits where a template would put student
 * numbers and partner logos. GN Academy has not run its first cohort, so there
 * is no honest number of learners to print, and an invented one on the page
 * that argues unverifiable claims are worthless would refute the page. These
 * figures are real, and this is how to re-check them before editing the copy.
 *
 * Reads only. Touches nothing.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const db = client();

  const published = { column: "is_published", value: true } as const;

  const countRows = async (
    table: string,
    filters: { column: string; value: boolean }[] = [],
  ): Promise<number> => {
    let query = db.from(table).select("id", { count: "exact", head: true });
    for (const f of filters) query = query.eq(f.column, f.value);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  // Sequential on purpose. Firing these concurrently against the pooled
  // connection returned an empty-message error and took the process down with
  // a libuv assertion on Windows; this is a one-off script, so the round trips
  // are not worth debugging that for.
  const courses = await countRows("certifications", [published]);
  const free = await countRows("certifications", [
    published,
    { column: "is_free", value: true },
  ]);
  const chapters = await countRows("modules");
  const lessons = await countRows("lessons");
  const questions = await countRows("questions");

  const { data: lessonRows, error } = await db
    .from("lessons")
    .select("content_mdx");
  if (error) throw error;
  const words = (lessonRows ?? []).reduce(
    (sum, row) =>
      sum +
      String(row.content_mdx ?? "")
        .split(/\s+/)
        .filter(Boolean).length,
    0,
  );

  const rows: [string, number][] = [
    ["Courses published", courses],
    ["Free from the start", free],
    ["Chapters", chapters],
    ["Lessons written", lessons],
    ["Assessment questions", questions],
    ["Words of course material", words],
  ];

  console.log("\nThe catalogue, counted\n");
  for (const [label, value] of rows) {
    console.log(`  ${String(value).padStart(7)}  ${label}`);
  }
  console.log(
    "\nUpdate src/content/landing.ts `stats` if any of these have moved.\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
