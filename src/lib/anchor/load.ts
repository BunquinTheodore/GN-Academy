import "server-only";

import { buildProofBundle, isProvable, type ProofBundle } from "@/lib/anchor/bundle";
import type { Credential } from "@/lib/db/credentials";
import { getAnchorBatch, getAnchorSalt } from "@/lib/db/anchors";

/**
 * Loads the salt and batch for an anchored credential and builds its proof
 * bundle. Returns null for anything that is not provable, and for rows whose
 * salt or batch is missing. Throws only on database errors, which callers
 * decide how to handle.
 */
export async function loadProofBundle(
  credential: Credential,
): Promise<ProofBundle | null> {
  if (!isProvable(credential) || !credential.anchor_batch_id) return null;

  const [salt, batch] = await Promise.all([
    getAnchorSalt(credential.id),
    getAnchorBatch(credential.anchor_batch_id),
  ]);
  if (!salt || !batch) return null;

  return buildProofBundle(credential, salt, batch);
}
