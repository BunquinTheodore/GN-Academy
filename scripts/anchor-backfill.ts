/**
 * Assign anchor salts and leaf hashes to credentials issued before anchoring
 * existed, marking them pending so the next daily batch picks them up. Demo
 * records are left skipped.
 *
 *   npx tsx scripts/anchor-backfill.ts            # dry run, writes nothing
 *   npx tsx scripts/anchor-backfill.ts --apply    # actually writes
 *
 * Run it only after migration 0014 has been applied
 * (npx tsx scripts/apply-migrations.ts). Safe to re-run: only credentials
 * with no hash yet are touched.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

import { backfillAnchors } from "../src/lib/db/anchor-backfill";

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local",
    );
    process.exit(1);
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(apply ? "Applying backfill." : "Dry run. Pass --apply to write.");
  const summary = await backfillAnchors(client, { dryRun: !apply });
  console.log(summary);
  if (summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
