/**
 * Apply supabase/migrations/*.sql in filename order, tracking what has run
 * in a schema_migrations table so re-runs are safe. Optionally applies
 * supabase/seed.sql with --seed.
 *
 *   npx tsx scripts/apply-migrations.ts [--seed]
 *
 * Needs SUPABASE_DB_URL in .env.local (session pooler URL, password
 * percent-encoded).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const SEED_FILE = join(process.cwd(), "supabase", "seed.sql");

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("SUPABASE_DB_URL missing from .env.local");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("Connected.");

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set(
      (await client.query("select filename from public.schema_migrations")).rows.map(
        (r: { filename: string }) => r.filename,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip    ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`apply   ${file} ...`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into public.schema_migrations (filename) values ($1)",
          [file],
        );
        await client.query("commit");
        console.log(`done    ${file}`);
      } catch (e) {
        await client.query("rollback");
        console.error(`FAILED  ${file}`);
        throw e;
      }
    }

    if (process.argv.includes("--seed")) {
      console.log("apply   seed.sql ...");
      const sql = readFileSync(SEED_FILE, "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
        console.log("done    seed.sql");
      } catch (e) {
        await client.query("rollback");
        console.error("FAILED  seed.sql");
        throw e;
      }
    }
  } finally {
    await client.end();
  }
  console.log("All done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
