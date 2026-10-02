import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProofStep } from "@/lib/anchor/merkle";
import { writeAnchorAssignment } from "@/lib/db/anchor-backfill";

/**
 * Database access for certificate anchoring. Everything here uses the service
 * role: the salts and batches tables have no policies at all, so the anon key
 * cannot reach them.
 */

export type AnchorStatus = "pending" | "anchored" | "skipped";

export type AnchorBatch = {
  id: string;
  merkle_root: string;
  leaf_count: number;
  ots_proof: string | null;
  ots_status: "submitted" | "confirmed";
  bitcoin_block: number | null;
  created_at: string;
  confirmed_at: string | null;
  last_checked_at: string | null;
};

export type PendingLeaf = { id: string; anchor_hash: string };

export type BatchItem = { id: string; leaf: string; proof: ProofStep[] };

/** Stores the hash and status on the credential, then its salt (secrets table). Never overwrites an existing hash or salt. */
export async function saveCredentialAnchor(
  credentialId: string,
  assignment:
    | { status: "pending"; salt: string; hash: string }
    | { status: "skipped" },
): Promise<void> {
  const admin = supabaseAdmin();

  if (assignment.status === "skipped") {
    const { error } = await admin
      .from("credentials")
      .update({ anchor_status: "skipped" })
      .eq("id", credentialId);
    if (error) throw error;
    return;
  }

  // Claim the credential first, salt second (see writeAnchorAssignment). A
  // credential that already has a hash is left alone, salt included.
  await writeAnchorAssignment(admin, credentialId, assignment.salt, assignment.hash);
}

export async function getAnchorSalt(credentialId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("credential_anchor_secrets")
    .select("salt")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (error) throw error;
  return data?.salt ?? null;
}

export async function getAnchorBatch(id: string): Promise<AnchorBatch | null> {
  const { data, error } = await supabaseAdmin()
    .from("anchor_batches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Oldest first, so a backlog drains in issue order. */
export async function listPendingLeaves(limit: number): Promise<PendingLeaf[]> {
  const { data, error } = await supabaseAdmin()
    .from("credentials")
    .select("id, anchor_hash")
    .eq("anchor_status", "pending")
    .is("anchor_batch_id", null)
    .not("anchor_hash", "is", null)
    .order("issued_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PendingLeaf[];
}

/**
 * Atomically creates the batch and claims its credentials (see the
 * anchor_create_batch function in migration 0014). Throws if any credential
 * was claimed by someone else first, in which case nothing was written.
 */
export async function createAnchorBatch(input: {
  root: string;
  otsProofBase64: string;
  items: BatchItem[];
}): Promise<string> {
  const { data, error } = await supabaseAdmin().rpc("anchor_create_batch", {
    p_root: input.root,
    p_ots_proof: input.otsProofBase64,
    p_items: input.items,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Least recently checked first (never checked first of all), so a batch that
 * stays unconfirmed cannot hold the front of the queue and starve newer ones.
 * Needs migration 0016 (last_checked_at).
 */
export async function listSubmittedBatches(limit: number): Promise<AnchorBatch[]> {
  const { data, error } = await supabaseAdmin()
    .from("anchor_batches")
    .select("*")
    .eq("ots_status", "submitted")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markBatchChecked(id: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("anchor_batches")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Batches still 'submitted' that were created before the cutoff. */
export async function listStaleSubmittedBatches(
  cutoffIso: string,
): Promise<{ id: string }[]> {
  const { data, error } = await supabaseAdmin()
    .from("anchor_batches")
    .select("id")
    .eq("ots_status", "submitted")
    .lt("created_at", cutoffIso)
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function updateBatchProof(
  id: string,
  input: {
    otsProofBase64: string;
    status: "submitted" | "confirmed";
    bitcoinBlock: number | null;
  },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("anchor_batches")
    .update({
      ots_proof: input.otsProofBase64,
      ots_status: input.status,
      bitcoin_block: input.bitcoinBlock,
      confirmed_at: input.status === "confirmed" ? new Date().toISOString() : null,
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
