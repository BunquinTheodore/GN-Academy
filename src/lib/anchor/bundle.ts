import {
  computeLeafHash,
  leafPayloadFromCredential,
  type CredentialHashSource,
  type LeafPayload,
} from "@/lib/anchor/hash";
import { verifyProof, type ProofStep } from "@/lib/anchor/merkle";

/**
 * Everything a third party needs to check one credential against Bitcoin
 * without trusting this site, and the two server-side checks the verify page
 * shows. Pure: the caller loads the salt and batch.
 */

export type BundleCredential = CredentialHashSource & {
  status: "active" | "revoked" | "expired";
  anchor_hash?: string | null;
  anchor_status?: "pending" | "anchored" | "skipped";
  anchor_proof?: ProofStep[] | null;
};

export type BundleBatch = {
  id: string;
  merkle_root: string;
  ots_proof: string | null;
  ots_status: "submitted" | "confirmed";
  bitcoin_block: number | null;
  created_at: string;
};

export type ProofBundle = {
  version: 1;
  code: string;
  status: BundleCredential["status"];
  payload: LeafPayload;
  salt: string;
  leafHash: string;
  merkle: { root: string; proof: ProofStep[] };
  batch: {
    id: string;
    createdAt: string;
    otsStatus: BundleBatch["ots_status"];
    bitcoinBlock: number | null;
  };
  /** Base64 .ots file whose digest is merkle.root. Null if a calendar never answered. */
  ots: string | null;
  checks: { leafMatches: boolean; merkleMatches: boolean };
  howToVerify: string[];
};

export const HOW_TO_VERIFY = [
  "1. leafHash = SHA-256( bytes(salt, hex) || UTF-8( payload as JSON with all object keys sorted and no spaces, serialised like JavaScript JSON.stringify: non-ASCII characters are NOT escaped, so a Python verifier needs ensure_ascii=False ) ).",
  "2. Start with node = SHA-256( 0x00 || leafHash ). For each merkle.proof step, if position is left then node = SHA-256( 0x01 || step.hash || node ), otherwise node = SHA-256( 0x01 || node || step.hash ). All hashes are raw bytes, written here as hex.",
  "3. The final node must equal merkle.root.",
  "4. Save the ots field (base64) as a .ots file and run the standard OpenTimestamps client: ots verify -d <merkle.root> file.ots. It checks the root against Bitcoin.",
  "Revocation is not recorded on Bitcoin. Check the live status on the credential page.",
];

/** Anchored, and active or revoked: the only credentials that expose a proof. */
export function isProvable(c: BundleCredential): boolean {
  return (
    c.anchor_status === "anchored" &&
    (c.status === "active" || c.status === "revoked") &&
    !!c.anchor_hash &&
    !!c.anchor_proof
  );
}

export function buildProofBundle(
  credential: BundleCredential,
  salt: string,
  batch: BundleBatch,
): ProofBundle | null {
  if (!isProvable(credential)) return null;
  const proof = credential.anchor_proof ?? [];
  const payload = leafPayloadFromCredential(credential);
  const recomputed = computeLeafHash(payload, salt);

  return {
    version: 1,
    code: credential.credential_code,
    status: credential.status,
    payload,
    salt,
    leafHash: credential.anchor_hash ?? recomputed,
    merkle: { root: batch.merkle_root, proof },
    batch: {
      id: batch.id,
      createdAt: batch.created_at,
      otsStatus: batch.ots_status,
      bitcoinBlock: batch.bitcoin_block,
    },
    ots: batch.ots_proof,
    checks: {
      leafMatches: recomputed === credential.anchor_hash,
      merkleMatches: verifyProof(recomputed, proof, batch.merkle_root),
    },
    howToVerify: HOW_TO_VERIFY,
  };
}
