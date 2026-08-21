/**
 * Re-applies the authored text in supabase/seed.sql to rows that already exist.
 *
 *   npx tsx scripts/refresh-seed-content.ts          # show what would change
 *   npx tsx scripts/refresh-seed-content.ts --write  # apply it
 *
 * Why this exists: seed.sql inserts with `on conflict do nothing`, and its
 * question blocks are guarded by `where not exists`. That is correct — it stops
 * a reseed from reverting edits made in /admin — but it also means that when
 * the authored copy itself changes, a re-run does nothing and the live database
 * keeps the old text. That happened the day every em dash was removed from
 * learner-facing copy: the file was clean and the database was not.
 *
 * This reads the committed seed.sql, rewrites its INSERTs into UPDATEs in
 * memory, and applies those. It never inserts and never deletes, so a row that
 * does not exist yet is simply untouched; run the normal seed for that.
 *
 * It DOES overwrite text edited in /admin, which is the whole point. That is
 * why it is a separate command with a dry run by default.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const SEED = join(process.cwd(), "supabase", "seed.sql");

/**
 * Turns the guarded question inserts into updates matched on
 * (assessment_id, sort_order).
 *
 * Matching on position rather than deleting and re-inserting keeps the
 * question ids stable, which matters: attempts store the id of every question
 * answered, and the AI Readiness Test has live attempts against it.
 */
function questionInsertsToUpdates(sql: string): string {
  const head =
    /insert into public\.questions \(assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation\)\r?\nselect v\.assessment_id::uuid, v\.sort_order, v\.competency, v\.prompt, v\.options::jsonb, v\.correct, v\.explanation\r?\nfrom \(values/g;

  const tail =
    /\) as v\(assessment_id, sort_order, competency, prompt, options, correct, explanation\)\r?\nwhere not exists \(\r?\n\s*select 1 from public\.questions\r?\n\s*where assessment_id = '[^']+'\r?\n\);/g;

  return sql
    .replace(
      head,
      "update public.questions q set\n" +
        "  competency = v.competency,\n" +
        "  prompt = v.prompt,\n" +
        "  options = v.options::jsonb,\n" +
        "  correct_option_id = v.correct,\n" +
        "  explanation = v.explanation\n" +
        "from (values",
    )
    .replace(
      tail,
      ") as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)\n" +
        "where q.assessment_id = v.assessment_id::uuid and q.sort_order = v.sort_order;",
    );
}

/** Conflict clauses become updates of the authored columns only. */
const CONFLICT_REWRITES: { table: string; from: string; to: string }[] = [
  {
    table: "certifications",
    from: "on conflict (slug) do nothing;\n\n-- ════════════════════════════════════════════════════════════════════════════\n-- Modules and lessons",
    to:
      "on conflict (slug) do update set\n" +
      "  title = excluded.title,\n" +
      "  subtitle = excluded.subtitle,\n" +
      "  summary = excluded.summary,\n" +
      "  description = excluded.description,\n" +
      "  skills = excluded.skills,\n" +
      "  outcomes = excluded.outcomes,\n" +
      "  roles = excluded.roles;\n\n" +
      "-- ════════════════════════════════════════════════════════════════════════════\n-- Modules and lessons",
  },
  {
    table: "modules",
    from: "on conflict (id) do nothing;\n\ninsert into public.lessons",
    to:
      "on conflict (id) do update set\n" +
      "  title = excluded.title,\n" +
      "  description = excluded.description;\n\n" +
      "insert into public.lessons",
  },
  {
    table: "lessons",
    from: "on conflict (id) do nothing;\n\n-- ════════════════════════════════════════════════════════════════════════════\n-- Certification exams",
    to:
      "on conflict (id) do update set\n" +
      "  title = excluded.title,\n" +
      "  content_mdx = excluded.content_mdx;\n\n" +
      "-- ════════════════════════════════════════════════════════════════════════════\n-- Certification exams",
  },
];

/**
 * The posts clause is handled separately because "on conflict (slug) do
 * nothing;" is not unique — the two assessments inserts use the identical
 * line, and replacing all of them rewrote an assessments upsert to reference
 * excluded.excerpt, a column assessments does not have. The posts insert is
 * the last statement in the file, so the last occurrence is the right one.
 */
function rewritePostsConflict(sql: string): string {
  const from = "on conflict (slug) do nothing;";
  const to =
    "on conflict (slug) do update set\n" +
    "  title = excluded.title,\n" +
    "  excerpt = excluded.excerpt,\n" +
    "  content_mdx = excluded.content_mdx;";

  const at = sql.lastIndexOf(from);
  if (at === -1) return sql;

  // Only rewrite it if it really does belong to the posts insert.
  const preceding = sql.slice(0, at);
  if (!/insert into public\.posts[\s\S]*$/.test(preceding)) return sql;

  return sql.slice(0, at) + to + sql.slice(at + from.length);
}

async function main() {
  const write = process.argv.includes("--write");
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("SUPABASE_DB_URL is not set in .env.local.");
    process.exit(1);
  }

  // Normalise line endings first: the anchors below are written with plain
  // newlines, and the file is checked out with CRLF on Windows.
  const CR = String.fromCharCode(13);
  let sql = readFileSync(SEED, "utf8").split(CR).join("");
  sql = questionInsertsToUpdates(sql);

  for (const rule of CONFLICT_REWRITES) {
    if (!sql.includes(rule.from)) {
      console.error(
        `Could not find the ${rule.table} conflict clause. seed.sql has changed shape; update this script rather than guessing.`,
      );
      process.exit(1);
    }
    sql = sql.split(rule.from).join(rule.to);
  }

  sql = rewritePostsConflict(sql);

  // Every question block must have become an UPDATE. One left as an INSERT
  // would be blocked by its own `where not exists` guard and silently do
  // nothing, which looks exactly like success.
  if (/insert into public\.questions/.test(sql)) {
    console.error("A questions block was not rewritten into an update. Refusing to run.");
    process.exit(1);
  }
  if (/where not exists/.test(sql)) {
    console.error("A `where not exists` guard survived the rewrite. Refusing to run.");
    process.exit(1);
  }

  // The four authored tables are covered by CONFLICT_REWRITES above, and that
  // loop already exits if any of its anchors is missing. The remaining
  // `do nothing` inserts are assessments, credentials and credential_sequences,
  // whose rows carry no prose worth refreshing.

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const before = await countDashes(client);
  console.log("before:", JSON.stringify(before));

  if (!write) {
    console.log("\nDry run. Nothing was changed. Pass --write to apply.");
    await client.end();
    return;
  }

  // One transaction: a partial refresh would leave the site mixing old and new
  // wording within a single course.
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  }

  const after = await countDashes(client);
  console.log("after: ", JSON.stringify(after));
  await client.end();
}

async function countDashes(client: Client) {
  const { rows } = await client.query(`
    select
      (select count(*)::int from questions
        where prompt like '%—%' or explanation like '%—%' or options::text like '%—%') as questions,
      (select count(*)::int from lessons where content_mdx like '%—%') as lessons,
      (select count(*)::int from posts where content_mdx like '%—%' or excerpt like '%—%') as posts,
      (select count(*)::int from certifications
        where description like '%—%' or summary like '%—%' or subtitle like '%—%') as certifications
  `);
  return rows[0];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
