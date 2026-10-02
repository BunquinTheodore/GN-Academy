import { describe, expect, it } from "vitest";

import {
  HOW_TO_VERIFY,
  buildProofBundle,
  isProvable,
  type BundleBatch,
  type BundleCredential,
} from "@/lib/anchor/bundle";
import { computeLeafHash, leafPayloadFromCredential } from "@/lib/anchor/hash";
import { buildMerkleTree } from "@/lib/anchor/merkle";
import { PANEL_COPY, panelState } from "@/lib/anchor/panel-state";

const SALT = "0123456789abcdef0123456789abcdef";

const source = {
  credential_code: "CAVA-2026-000009",
  holder_name: "Ana Reyes",
  title: "Certified AI Virtual Assistant",
  level: "foundation",
  issued_at: "2026-09-01T00:00:00.000Z",
  competencies: [{ key: "k", label: "Prompting", score: 80 }],
};

function fixture(overrides: Partial<BundleCredential> = {}) {
  const hash = computeLeafHash(leafPayloadFromCredential(source), SALT);
  const other = computeLeafHash(
    leafPayloadFromCredential({ ...source, credential_code: "CAVA-2026-000010" }),
    SALT,
  );
  const tree = buildMerkleTree([hash, other]);
  const credential: BundleCredential = {
    ...source,
    status: "active",
    anchor_hash: hash,
    anchor_status: "anchored",
    anchor_proof: tree.proofs[0],
    ...overrides,
  };
  const batch: BundleBatch = {
    id: "b1",
    merkle_root: tree.root,
    ots_proof: "QUJD",
    ots_status: "submitted",
    bitcoin_block: null,
    created_at: "2026-09-02T00:00:00.000Z",
  };
  return { credential, batch };
}

describe("buildProofBundle", () => {
  it("recomputes the hash and Merkle path and reports a match", () => {
    const { credential, batch } = fixture();
    const bundle = buildProofBundle(credential, SALT, batch);
    expect(bundle?.checks).toEqual({ leafMatches: true, merkleMatches: true });
    expect(bundle?.salt).toBe(SALT);
    expect(bundle?.ots).toBe("QUJD");
  });

  it("flags a record that was altered after anchoring", () => {
    const { credential, batch } = fixture({ holder_name: "Someone Else" });
    const bundle = buildProofBundle(credential, SALT, batch);
    expect(bundle?.checks.leafMatches).toBe(false);
    expect(bundle?.checks.merkleMatches).toBe(false);
  });

  it("flags a wrong salt", () => {
    const { credential, batch } = fixture();
    const bundle = buildProofBundle(credential, "f".repeat(32), batch);
    expect(bundle?.checks.leafMatches).toBe(false);
  });

  it("provides a proof for revoked credentials but not expired, pending or skipped", () => {
    expect(isProvable(fixture({ status: "revoked" }).credential)).toBe(true);
    expect(isProvable(fixture({ status: "expired" }).credential)).toBe(false);
    expect(isProvable(fixture({ anchor_status: "pending" }).credential)).toBe(false);
    expect(isProvable(fixture({ anchor_status: "skipped" }).credential)).toBe(false);
    expect(isProvable(fixture({ anchor_status: undefined }).credential)).toBe(false);
    const { credential, batch } = fixture({ anchor_status: "pending" });
    expect(buildProofBundle(credential, SALT, batch)).toBeNull();
  });
});

describe("panelState and copy", () => {
  it("hides for skipped, missing and unloadable proofs", () => {
    expect(panelState("skipped", null).kind).toBe("hidden");
    expect(panelState(undefined, null).kind).toBe("hidden");
    expect(panelState("anchored", null).kind).toBe("hidden");
  });

  it("shows pending without a bundle", () => {
    expect(panelState("pending", null).kind).toBe("pending");
  });

  it("distinguishes submitted from confirmed", () => {
    const { credential, batch } = fixture();
    const submitted = buildProofBundle(credential, SALT, batch);
    expect(panelState("anchored", submitted).kind).toBe("submitted");
    const confirmed = buildProofBundle(
      credential,
      SALT,
      { ...batch, ots_status: "confirmed", bitcoin_block: 912345 },
    );
    expect(panelState("anchored", confirmed)).toMatchObject({
      kind: "confirmed",
      bitcoinBlock: 912345,
      hashMatches: true,
    });
  });

  it("labels the page badge as reported, with the downloaded proof as the trustless path", () => {
    expect(PANEL_COPY.confirmed(912345)).toBe(
      "Reported confirmed in Bitcoin block 912345.",
    );
    expect(PANEL_COPY.confirmedDetail).toMatch(/download the proof/i);
  });

  it("tells verifiers not to escape non-ASCII characters", () => {
    expect(HOW_TO_VERIFY[0]).toMatch(/JSON\.stringify/);
    expect(HOW_TO_VERIFY[0]).toMatch(/ensure_ascii=False/);
  });

  it("uses no em or en dashes in its copy", () => {
    const text = Object.values(PANEL_COPY)
      .map((v) => (typeof v === "function" ? v(1) : v))
      .join(" ");
    expect(text).not.toMatch(/[–—]/);
  });
});
