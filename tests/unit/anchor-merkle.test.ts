import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildMerkleTree, hashLeaf, verifyProof } from "@/lib/anchor/merkle";

const leaf = (n: number) =>
  createHash("sha256").update(`leaf-${n}`).digest("hex");

const leaves = (count: number) => Array.from({ length: count }, (_, i) => leaf(i));

describe("merkle tree", () => {
  it("rejects an empty leaf list", () => {
    expect(() => buildMerkleTree([])).toThrow();
  });

  it("rejects a malformed leaf", () => {
    expect(() => buildMerkleTree(["nothex"])).toThrow();
  });

  it("single leaf: root is the domain-separated leaf hash with an empty proof", () => {
    const [only] = leaves(1);
    const tree = buildMerkleTree([only]);
    expect(tree.root).toBe(hashLeaf(only));
    expect(tree.proofs[0]).toEqual([]);
    expect(verifyProof(only, tree.proofs[0], tree.root)).toBe(true);
  });

  for (const count of [2, 3, 4, 5, 7, 8]) {
    it(`every leaf verifies in a tree of ${count}`, () => {
      const input = leaves(count);
      const tree = buildMerkleTree(input);
      expect(tree.proofs).toHaveLength(count);
      input.forEach((l, i) => {
        expect(verifyProof(l, tree.proofs[i], tree.root)).toBe(true);
      });
    });
  }

  it("two leaves: proof is one sibling step", () => {
    const [a, b] = leaves(2);
    const tree = buildMerkleTree([a, b]);
    expect(tree.proofs[0]).toEqual([{ position: "right", hash: hashLeaf(b) }]);
    expect(tree.proofs[1]).toEqual([{ position: "left", hash: hashLeaf(a) }]);
  });

  it("odd leaf is promoted, not duplicated (3 leaves)", () => {
    const tree = buildMerkleTree(leaves(3));
    // The third leaf is promoted one level, so its proof has a single step.
    expect(tree.proofs[2]).toHaveLength(1);
    expect(tree.proofs[0]).toHaveLength(2);
  });

  it("the root is deterministic and order sensitive", () => {
    const input = leaves(5);
    expect(buildMerkleTree(input).root).toBe(buildMerkleTree([...input]).root);
    expect(buildMerkleTree([...input].reverse()).root).not.toBe(
      buildMerkleTree(input).root,
    );
  });

  it("detects a tampered leaf", () => {
    const tree = buildMerkleTree(leaves(5));
    expect(verifyProof(leaf(99), tree.proofs[1], tree.root)).toBe(false);
  });

  it("detects a tampered proof step", () => {
    const tree = buildMerkleTree(leaves(5));
    const bad = tree.proofs[0].map((s, i) =>
      i === 0 ? { ...s, hash: leaf(500) } : s,
    );
    expect(verifyProof(leaves(5)[0], bad, tree.root)).toBe(false);
  });

  it("detects a flipped position and a wrong root", () => {
    const input = leaves(4);
    const tree = buildMerkleTree(input);
    const flipped = tree.proofs[0].map((s, i) =>
      i === 0 ? { ...s, position: s.position === "left" ? "right" : "left" } : s,
    ) as typeof tree.proofs[0];
    expect(verifyProof(input[0], flipped, tree.root)).toBe(false);
    expect(verifyProof(input[0], tree.proofs[0], leaf(7))).toBe(false);
  });

  it("does not let an interior node pass as a leaf", () => {
    const input = leaves(4);
    const tree = buildMerkleTree(input);
    // Second preimage attempt: present the hash of the left subtree as a leaf.
    const fakeLeaf = tree.proofs[2][1].hash;
    expect(verifyProof(fakeLeaf, [], tree.root)).toBe(false);
  });

  it("does not mutate its input", () => {
    const input = leaves(3);
    const copy = [...input];
    buildMerkleTree(input);
    expect(input).toEqual(copy);
  });
});
