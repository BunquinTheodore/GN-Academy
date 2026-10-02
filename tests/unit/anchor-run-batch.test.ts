import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { bearerToken, secretMatches } from "@/lib/anchor/cron-auth";
import { verifyProof } from "@/lib/anchor/merkle";
import type { FetchLike } from "@/lib/anchor/ots";
import { serializeTimestamp } from "@/lib/anchor/ots-format";
import {
  runAnchorBatch,
  DEFAULT_RUN_OPTIONS,
  type RunDeps,
} from "@/lib/anchor/run-batch";

const CAL = "https://alice.btc.calendar.opentimestamps.org";

const leaf = (n: number) => createHash("sha256").update(`l${n}`).digest("hex");

const pendingStamp = serializeTimestamp({
  attestations: [],
  edges: [
    {
      op: { tag: 0xf0, arg: Buffer.from("aa", "hex") },
      next: {
        attestations: [],
        edges: [
          {
            op: { tag: 0x08, arg: null },
            next: { attestations: [{ kind: "pending", uri: CAL }], edges: [] },
          },
        ],
      },
    },
  ],
});

const toArrayBuffer = (b: Buffer) =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

const calendarOk: FetchLike = async () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => toArrayBuffer(pendingStamp),
});

function makeDeps(overrides: Partial<RunDeps> = {}): RunDeps {
  return {
    listPending: vi.fn(async () => []),
    createBatch: vi.fn(async () => "batch-1"),
    listSubmitted: vi.fn(async () => []),
    updateBatch: vi.fn(async () => undefined),
    ots: { fetch: calendarOk, calendars: [CAL] },
    now: () => 0,
    ...overrides,
  };
}

describe("runAnchorBatch", () => {
  it("does nothing and succeeds when no credential is pending", async () => {
    const deps = makeDeps();
    const result = await runAnchorBatch(deps);
    expect(result).toMatchObject({ ok: true, batches: [], morePending: false });
    expect(deps.createBatch).not.toHaveBeenCalled();
  });

  it("builds a tree, stores verifiable proofs and the submitted root", async () => {
    const pending = [1, 2, 3].map((n) => ({ id: `c${n}`, anchor_hash: leaf(n) }));
    const deps = makeDeps({ listPending: vi.fn(async () => pending) });

    const result = await runAnchorBatch(deps);

    expect(result.ok).toBe(true);
    expect(result.batches).toHaveLength(1);
    const call = vi.mocked(deps.createBatch).mock.calls[0][0];
    expect(call.items).toHaveLength(3);
    call.items.forEach((item) => {
      expect(verifyProof(item.leaf, item.proof, call.root)).toBe(true);
    });
    expect(call.otsProofBase64.length).toBeGreaterThan(40);
  });

  it("is idempotent: the second run, with nothing pending, creates no batch", async () => {
    let claimed = false;
    const deps = makeDeps({
      listPending: vi.fn(async () =>
        claimed ? [] : [{ id: "c1", anchor_hash: leaf(1) }],
      ),
      createBatch: vi.fn(async () => {
        claimed = true;
        return "batch-1";
      }),
    });
    await runAnchorBatch(deps);
    const second = await runAnchorBatch(deps);
    expect(deps.createBatch).toHaveBeenCalledTimes(1);
    expect(second.batches).toEqual([]);
  });

  it("creates no batch and reports failure when no calendar accepts the root", async () => {
    const deps = makeDeps({
      listPending: vi.fn(async () => [{ id: "c1", anchor_hash: leaf(1) }]),
      ots: {
        fetch: async () => ({ ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) }),
        calendars: [CAL],
      },
    });
    const result = await runAnchorBatch(deps);
    expect(result.ok).toBe(false);
    expect(deps.createBatch).not.toHaveBeenCalled();
  });

  it("reports a lost race instead of throwing", async () => {
    const deps = makeDeps({
      listPending: vi.fn(async () => [{ id: "c1", anchor_hash: leaf(1) }]),
      createBatch: vi.fn(async () => {
        throw new Error("anchor batch claimed 0 of 1 credentials");
      }),
    });
    const result = await runAnchorBatch(deps);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(["create_batch_failed"]);
    expect(JSON.stringify(result)).not.toContain("claimed 0 of 1");
  });

  it("chunks a large backlog and flags what is left", async () => {
    const all = Array.from({ length: 5 }, (_, n) => ({ id: `c${n}`, anchor_hash: leaf(n) }));
    let offset = 0;
    const deps = makeDeps({
      listPending: vi.fn(async (limit: number) => {
        const slice = all.slice(offset, offset + limit);
        offset += limit;
        return slice;
      }),
    });
    const result = await runAnchorBatch(deps, {
      ...DEFAULT_RUN_OPTIONS,
      chunkSize: 2,
      maxBatches: 2,
    });
    expect(result.batches.map((b) => b.leafCount)).toEqual([2, 2]);
    expect(result.morePending).toBe(true);
  });

  it("stops starting new work once the time budget is spent", async () => {
    let clock = 0;
    const deps = makeDeps({
      now: () => (clock += 10_000),
      listPending: vi.fn(async () => [{ id: "c1", anchor_hash: leaf(1) }]),
    });
    const result = await runAnchorBatch(deps, { ...DEFAULT_RUN_OPTIONS, budgetMs: 5_000 });
    expect(deps.createBatch).not.toHaveBeenCalled();
    expect(result.morePending).toBe(true);
  });

  it("upgrades earlier submitted batches and records confirmation", async () => {
    let storedProof = "";
    const first = makeDeps({
      listPending: async () => [{ id: "c1", anchor_hash: leaf(1) }],
      createBatch: async (input) => {
        storedProof = input.otsProofBase64;
        return "b1";
      },
    });
    await runAnchorBatch(first);

    const bitcoin = serializeTimestamp({
      attestations: [{ kind: "bitcoin", height: 900123 }],
      edges: [],
    });
    const deps = makeDeps({
      listSubmitted: async () => [{ id: "b1", ots_proof: storedProof }],
      ots: {
        fetch: async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => toArrayBuffer(bitcoin),
        }),
        calendars: [CAL],
      },
    });
    const result = await runAnchorBatch(deps);
    expect(result).toMatchObject({ ok: true, upgraded: 1, confirmed: 1 });
    expect(deps.updateBatch).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "confirmed", bitcoinBlock: 900123 }),
    );
  });
});

describe("runAnchorBatch upgrade pass", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("marks unchanged batches as checked so they rotate to the back", async () => {
    const markChecked = vi.fn(async () => undefined);
    const deps = makeDeps({
      listSubmitted: async () => [{ id: "b1", ots_proof: "bm90IGEgcHJvb2Y=" }],
      markChecked,
    });
    await runAnchorBatch(deps);
    expect(markChecked).toHaveBeenCalledWith("b1");
  });

  it("goes red and names batches still submitted after 7 days", async () => {
    const now = 100 * DAY_MS;
    const listStale = vi.fn(async () => [{ id: "old-batch" }]);
    const result = await runAnchorBatch(makeDeps({ listStale, now: () => now }));
    expect(listStale).toHaveBeenCalledWith(new Date(now - 7 * DAY_MS).toISOString());
    expect(result.ok).toBe(false);
    expect(result.staleBatches).toEqual(["old-batch"]);
  });

  it("stays green with no stale batches and uses a 12s budget", async () => {
    const result = await runAnchorBatch(makeDeps({ listStale: async () => [] }));
    expect(result).toMatchObject({ ok: true, staleBatches: [] });
    expect(DEFAULT_RUN_OPTIONS.budgetMs).toBe(12_000);
  });

  it("does not leak raw error text from a failing list", async () => {
    const result = await runAnchorBatch(
      makeDeps({
        listSubmitted: async () => {
          throw new Error('relation "anchor_batches" does not exist');
        },
      }),
    );
    expect(result.errors).toEqual(["list_submitted_failed"]);
  });
});

describe("cron secret check", () => {
  it("accepts only the exact secret", () => {
    expect(secretMatches("s3cret-value", "s3cret-value")).toBe(true);
    expect(secretMatches("s3cret-valuf", "s3cret-value")).toBe(false);
    expect(secretMatches("short", "s3cret-value")).toBe(false);
  });

  it("rejects missing values on either side", () => {
    expect(secretMatches(null, "x")).toBe(false);
    expect(secretMatches("x", undefined)).toBe(false);
    expect(secretMatches("", "")).toBe(false);
  });

  it("parses bearer headers", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
    expect(bearerToken("bearer abc123")).toBe("abc123");
    expect(bearerToken("Basic abc123")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});
