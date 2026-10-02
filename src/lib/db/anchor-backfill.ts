import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeLeafHash,
  generateSalt,
  isDemoHolder,
  leafPayloadFromCredential,
  type CredentialHashSource,
} from "@/lib/anchor/hash";

/**
 * Assigns a salt and leaf hash to credentials issued before anchoring existed.
 *
 * Takes the client as a parameter and does not import "server-only", so the
 * tsx script in scripts/anchor-backfill.ts can run it. A dry run reads and
 * counts but writes nothing.
 */

export type BackfillSummary = {
  scanned: number;
  assigned: number;
  /** Got a hash from someone else (e.g. fresh issuance) between our read and write. */
  alreadyAnchored: number;
  skippedDemo: number;
  failed: number;
  dryRun: boolean;
};

type Row = CredentialHashSource & { id: string };

const PAGE_SIZE = 200;
const COLUMNS = "id, credential_code, holder_name, title, level, issued_at, competencies";

async function nextPage(client: SupabaseClient, afterId: string | null): Promise<Row[]> {
  let query = client
    .from("credentials")
    .select(COLUMNS)
    .is("anchor_hash", null)
    .eq("anchor_status", "skipped")
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Row[];
}

export type AnchorWriteResult = "assigned" | "already_anchored";

async function rollbackHash(
  client: SupabaseClient,
  credentialId: string,
  hash: string,
): Promise<void> {
  const { error } = await client
    .from("credentials")
    .update({ anchor_hash: null, anchor_status: "skipped" })
    .eq("id", credentialId)
    .eq("anchor_hash", hash);
  if (error) console.error("anchor rollback failed", credentialId, error);
}

/**
 * Claims the credential first (only if it has no hash yet), and writes the salt
 * only when that claim matched a row. The other order let a race overwrite the
 * salt of a credential that issuance had just anchored, which would leave its
 * stored hash unverifiable. If the salt cannot be stored the claim is undone.
 */
export async function writeAnchorAssignment(
  client: SupabaseClient,
  credentialId: string,
  salt: string,
  hash: string,
): Promise<AnchorWriteResult> {
  const { data: claimed, error } = await client
    .from("credentials")
    .update({ anchor_hash: hash, anchor_status: "pending" })
    .eq("id", credentialId)
    .is("anchor_hash", null)
    .select("id");
  if (error) throw error;
  if (!claimed || claimed.length === 0) return "already_anchored";

  const { data: inserted, error: saltError } = await client
    .from("credential_anchor_secrets")
    .upsert(
      { credential_id: credentialId, salt },
      { onConflict: "credential_id", ignoreDuplicates: true },
    )
    .select("credential_id");
  if (saltError) {
    await rollbackHash(client, credentialId, hash);
    throw saltError;
  }
  if (inserted && inserted.length > 0) return "assigned";

  // A salt row already existed and was kept. It must be the one we hashed with.
  const { data: existing } = await client
    .from("credential_anchor_secrets")
    .select("salt")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (existing?.salt !== salt) {
    await rollbackHash(client, credentialId, hash);
    throw new Error("A different salt is already stored for this credential.");
  }
  return "assigned";
}

async function assignOne(client: SupabaseClient, row: Row): Promise<AnchorWriteResult> {
  const salt = generateSalt();
  const hash = computeLeafHash(leafPayloadFromCredential(row), salt);
  return writeAnchorAssignment(client, row.id, salt, hash);
}

type Outcome = "assigned" | "alreadyAnchored" | "skippedDemo" | "failed";

function bump(
  summary: BackfillSummary,
  field: Outcome,
): BackfillSummary {
  return { ...summary, scanned: summary.scanned + 1, [field]: summary[field] + 1 };
}

async function processRow(
  client: SupabaseClient,
  row: Row,
  dryRun: boolean,
): Promise<Outcome> {
  if (isDemoHolder(row.holder_name)) return "skippedDemo";
  try {
    if (dryRun) return "assigned";
    const result = await assignOne(client, row);
    return result === "assigned" ? "assigned" : "alreadyAnchored";
  } catch (e) {
    console.error(`backfill failed for ${row.credential_code}`, e);
    return "failed";
  }
}

export async function backfillAnchors(
  client: SupabaseClient,
  options: { dryRun: boolean },
): Promise<BackfillSummary> {
  let summary: BackfillSummary = {
    scanned: 0,
    assigned: 0,
    alreadyAnchored: 0,
    skippedDemo: 0,
    failed: 0,
    dryRun: options.dryRun,
  };
  let afterId: string | null = null;

  for (;;) {
    const rows = await nextPage(client, afterId);
    if (rows.length === 0) return summary;
    afterId = rows[rows.length - 1].id;

    for (const row of rows) {
      summary = bump(summary, await processRow(client, row, options.dryRun));
    }
  }
}
