import {
  computeLeafHash,
  generateSalt,
  isDemoHolder,
  leafPayloadFromCredential,
  type CredentialHashSource,
} from "@/lib/anchor/hash";
import { saveCredentialAnchor } from "@/lib/db/anchors";

export type AnchorAssignment =
  | { status: "pending"; salt: string; hash: string }
  | { status: "skipped" };

/** Pure: decides what a fresh credential gets. Demo records are never anchored. */
export function prepareAnchor(credential: CredentialHashSource): AnchorAssignment {
  if (isDemoHolder(credential.holder_name)) return { status: "skipped" };
  const salt = generateSalt();
  const hash = computeLeafHash(leafPayloadFromCredential(credential), salt);
  return { status: "pending", salt, hash };
}

/**
 * Called right after a credential row exists. It throws on failure and the
 * caller (issue.ts) swallows that: a learner must never lose a credential
 * because the anchoring tables are missing or down. The backfill script picks
 * up anything this missed.
 */
export async function anchorNewCredential(
  credential: CredentialHashSource & { id: string },
): Promise<AnchorAssignment> {
  const assignment = prepareAnchor(credential);
  await saveCredentialAnchor(credential.id, assignment);
  return assignment;
}
