import { createHash } from "node:crypto";

/**
 * A small dependency-free Merkle tree over SHA-256.
 *
 * Inputs are hex leaf hashes (see hash.ts). Rules, all of which a third party
 * needs to reproduce a root:
 *
 *   leafNode  = SHA-256( 0x00 || leafBytes )
 *   parent    = SHA-256( 0x01 || leftBytes || rightBytes )
 *
 * The 0x00 / 0x01 prefixes separate leaves from interior nodes, so an interior
 * hash can never be presented as a leaf (second preimage attack).
 *
 * Odd node handling: when a level has an odd number of nodes, the last node is
 * PROMOTED to the next level unchanged. It is not duplicated, because
 * duplicating lets two different leaf lists produce the same root
 * (CVE-2012-2459). A promoted node simply has no sibling at that level, so its
 * proof has no step for it.
 *
 * Leaf order is the order given. A single leaf is its own root (after the leaf
 * prefix) with an empty proof.
 */

export type ProofStep = { position: "left" | "right"; hash: string };
export type MerkleProof = ProofStep[];
export type MerkleTree = { root: string; proofs: MerkleProof[] };

const HEX_32 = /^[0-9a-f]{64}$/;
const LEAF_PREFIX = Buffer.from([0x00]);
const NODE_PREFIX = Buffer.from([0x01]);

const sha256 = (...parts: Buffer[]): Buffer =>
  createHash("sha256").update(Buffer.concat(parts)).digest();

function toBytes(hex: string): Buffer {
  if (!HEX_32.test(hex)) throw new Error("Expected a 64 character lowercase hex hash.");
  return Buffer.from(hex, "hex");
}

export function hashLeaf(leafHex: string): string {
  return sha256(LEAF_PREFIX, toBytes(leafHex)).toString("hex");
}

function hashPair(leftHex: string, rightHex: string): string {
  return sha256(NODE_PREFIX, toBytes(leftHex), toBytes(rightHex)).toString("hex");
}

export function buildMerkleTree(leafHashes: readonly string[]): MerkleTree {
  if (leafHashes.length === 0) throw new Error("Cannot build a tree with no leaves.");

  const proofs: ProofStep[][] = leafHashes.map(() => []);
  // Which original leaves sit under each node of the current level.
  let level = leafHashes.map((leaf, i) => ({ hash: hashLeaf(leaf), members: [i] }));

  while (level.length > 1) {
    const next: typeof level = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1];
      if (!right) {
        next.push(left);
        continue;
      }
      for (const m of left.members) proofs[m].push({ position: "right", hash: right.hash });
      for (const m of right.members) proofs[m].push({ position: "left", hash: left.hash });
      next.push({
        hash: hashPair(left.hash, right.hash),
        members: [...left.members, ...right.members],
      });
    }
    level = next;
  }

  return { root: level[0].hash, proofs };
}

/** True when `leafHex` plus `proof` hashes up to exactly `rootHex`. */
export function verifyProof(
  leafHex: string,
  proof: readonly ProofStep[],
  rootHex: string,
): boolean {
  try {
    let current = hashLeaf(leafHex);
    for (const step of proof) {
      current =
        step.position === "left"
          ? hashPair(step.hash, current)
          : hashPair(current, step.hash);
    }
    return current === rootHex;
  } catch {
    return false;
  }
}
