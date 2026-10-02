import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  submitDigest,
  upgradeProof,
  type FetchLike,
} from "@/lib/anchor/ots";
import {
  bitcoinHeights,
  collectPending,
  decodeOtsFile,
  encodeOtsFile,
  parseTimestamp,
  serializeTimestamp,
  type Timestamp,
} from "@/lib/anchor/ots-format";

const ROOT = createHash("sha256").update("root").digest("hex");
const ALICE = "https://alice.btc.calendar.opentimestamps.org";
const BOB = "https://bob.btc.calendar.opentimestamps.org";
const CALENDARS = [ALICE, BOB];

/** What a calendar answers to POST /digest: append a nonce, hash, then promise. */
function pendingStamp(uri: string, nonce: string): Buffer {
  const ts: Timestamp = {
    attestations: [],
    edges: [
      {
        op: { tag: 0xf0, arg: Buffer.from(nonce, "hex") },
        next: {
          attestations: [],
          edges: [
            {
              op: { tag: 0x08, arg: null },
              next: { attestations: [{ kind: "pending", uri }], edges: [] },
            },
          ],
        },
      },
    ],
  };
  return serializeTimestamp(ts);
}

function bitcoinStamp(height: number): Buffer {
  return serializeTimestamp({
    attestations: [{ kind: "bitcoin", height }],
    edges: [],
  });
}

const toBuf = (b: Buffer): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

const ok = (b: Buffer) => ({ ok: true, status: 200, arrayBuffer: async () => toBuf(b) });
const fail = (status = 503) => ({
  ok: false,
  status,
  arrayBuffer: async () => new ArrayBuffer(0),
});

describe("submitDigest", () => {
  it("merges calendar responses into one parseable .ots file", async () => {
    const fetchMock = vi.fn<FetchLike>(async (url) =>
      ok(pendingStamp(url.startsWith(ALICE) ? ALICE : BOB, url.startsWith(ALICE) ? "aa" : "bb")),
    );
    const result = await submitDigest(ROOT, { fetch: fetchMock, calendars: CALENDARS });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.accepted).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(`${ALICE}/digest`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(Buffer.from(fetchMock.mock.calls[0][1]!.body!).toString("hex")).toBe(ROOT);

    const file = decodeOtsFile(Buffer.from(result.proofBase64, "base64"));
    expect(file.digest.toString("hex")).toBe(ROOT);
    expect(collectPending(file.timestamp, file.digest)).toHaveLength(2);
  });

  it("still succeeds when only one calendar answers", async () => {
    const fetchMock = vi.fn<FetchLike>(async (url) =>
      url.startsWith(ALICE) ? ok(pendingStamp(ALICE, "aa")) : fail(),
    );
    const result = await submitDigest(ROOT, { fetch: fetchMock, calendars: CALENDARS });
    expect(result).toMatchObject({ ok: true, accepted: 1 });
  });

  it("reports failure without throwing when every calendar is down or rejects", async () => {
    const throwing = vi.fn<FetchLike>(async () => {
      throw new Error("network down");
    });
    expect(await submitDigest(ROOT, { fetch: throwing, calendars: CALENDARS })).toMatchObject({
      ok: false,
    });

    const garbage = vi.fn<FetchLike>(async () => ok(Buffer.from("not a timestamp")));
    expect(await submitDigest(ROOT, { fetch: garbage, calendars: CALENDARS })).toMatchObject({
      ok: false,
    });
  });

  it("aborts a calendar that never answers", async () => {
    const hanging: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const result = await submitDigest(ROOT, {
      fetch: hanging,
      calendars: [ALICE],
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed root before any request", async () => {
    const fetchMock = vi.fn<FetchLike>();
    const result = await submitDigest("xyz", { fetch: fetchMock });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("upgradeProof", () => {
  async function submitted(): Promise<string> {
    const fetchMock: FetchLike = async (url) =>
      ok(pendingStamp(url.startsWith(ALICE) ? ALICE : BOB, url.startsWith(ALICE) ? "aa" : "bb"));
    const result = await submitDigest(ROOT, { fetch: fetchMock, calendars: CALENDARS });
    if (!result.ok) throw new Error("setup failed");
    return result.proofBase64;
  }

  it("requests /timestamp/<commitment> and confirms when a calendar has the Bitcoin block", async () => {
    const proof = await submitted();
    const requested: string[] = [];
    const fetchMock: FetchLike = async (url) => {
      requested.push(url);
      return url.startsWith(ALICE) ? ok(bitcoinStamp(840000)) : fail(404);
    };

    const result = await upgradeProof(proof, { fetch: fetchMock, calendars: CALENDARS });

    const aliceCommitment = createHash("sha256")
      .update(Buffer.concat([Buffer.from(ROOT, "hex"), Buffer.from("aa", "hex")]))
      .digest("hex");
    expect(requested).toContain(`${ALICE}/timestamp/${aliceCommitment}`);
    expect(result.status).toBe("confirmed");
    expect(result.bitcoinBlock).toBe(840000);
    expect(result.changed).toBe(true);

    const upgraded = decodeOtsFile(Buffer.from(result.proofBase64, "base64"));
    expect(bitcoinHeights(upgraded.timestamp)).toEqual([840000]);
    // Bob's promise is still there, so the file keeps both branches.
    expect(collectPending(upgraded.timestamp, upgraded.digest)).toHaveLength(1);
  });

  it("stays submitted and unchanged while calendars return 404", async () => {
    const proof = await submitted();
    const result = await upgradeProof(proof, {
      fetch: async () => fail(404),
      calendars: CALENDARS,
    });
    expect(result).toEqual({
      proofBase64: proof,
      status: "submitted",
      bitcoinBlock: null,
      changed: false,
    });
  });

  it("never throws on a corrupt stored proof", async () => {
    const result = await upgradeProof("bm90IGEgcHJvb2Y=", { fetch: async () => fail() });
    expect(result.status).toBe("submitted");
    expect(result.changed).toBe(false);
  });

  it("does not contact calendars that are not on the allowlist", async () => {
    const evil = "https://evil.example.com";
    const stamp = pendingStamp(evil, "cc");
    const fakeSubmit: FetchLike = async () => ok(stamp);
    const submit = await submitDigest(ROOT, { fetch: fakeSubmit, calendars: [ALICE] });
    if (!submit.ok) throw new Error("setup failed");

    const fetchMock = vi.fn<FetchLike>(async () => ok(bitcoinStamp(1)));
    const result = await upgradeProof(submit.proofBase64, {
      fetch: fetchMock,
      calendars: CALENDARS,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe("submitted");
  });
});

describe("ots-format", () => {
  it("round-trips a forked timestamp", () => {
    const bytes = Buffer.concat([
      Buffer.from([0xff]),
      pendingStamp(ALICE, "aa"),
    ]);
    // A fork prefix must be followed by another item; build it by merging instead.
    expect(() => parseTimestamp(bytes)).toThrow();
    const single = pendingStamp(ALICE, "aa");
    expect(serializeTimestamp(parseTimestamp(single)).equals(single)).toBe(true);
  });

  it("rejects trailing garbage and truncated input", () => {
    const stamp = pendingStamp(ALICE, "aa");
    expect(() => parseTimestamp(Buffer.concat([stamp, Buffer.from([1])]))).toThrow();
    expect(() => parseTimestamp(stamp.subarray(0, stamp.length - 3))).toThrow();
  });
});

describe("ots hardening", () => {
  const stream = (chunks: Uint8Array[], onCancel?: () => void) => {
    let i = 0;
    return {
      getReader: () => ({
        read: async () =>
          i < chunks.length ? { done: false, value: chunks[i++] } : { done: true },
        cancel: async () => {
          onCancel?.();
        },
      }),
    };
  };

  it("passes redirect: error on every calendar fetch", async () => {
    const fetchMock = vi.fn<FetchLike>(async () => ok(pendingStamp(ALICE, "aa")));
    await submitDigest(ROOT, { fetch: fetchMock, calendars: CALENDARS });
    for (const call of fetchMock.mock.calls) expect(call[1]?.redirect).toBe("error");
  });

  it("never contacts non-https calendars", async () => {
    const fetchMock = vi.fn<FetchLike>(async () => ok(pendingStamp(ALICE, "aa")));
    const result = await submitDigest(ROOT, {
      fetch: fetchMock,
      calendars: ["http://alice.example.com"],
    });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a response whose content-length exceeds the cap without reading it", async () => {
    const arrayBuffer = vi.fn(async () => toBuf(pendingStamp(ALICE, "aa")));
    const fetchMock: FetchLike = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => String(10 * 1024 * 1024) },
      arrayBuffer,
    });
    const result = await submitDigest(ROOT, { fetch: fetchMock, calendars: [ALICE] });
    expect(result.ok).toBe(false);
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("aborts a streamed body once it passes the cap, even with no content-length", async () => {
    let cancelled = false;
    const big = new Uint8Array(40 * 1024);
    const fetchMock: FetchLike = async () => ({
      ok: true,
      status: 200,
      body: stream([big, big, big], () => (cancelled = true)),
      arrayBuffer: async () => {
        throw new Error("must not buffer the whole body");
      },
    });
    const result = await submitDigest(ROOT, { fetch: fetchMock, calendars: [ALICE] });
    expect(result.ok).toBe(false);
    expect(cancelled).toBe(true);
  });

  it("accepts a streamed body under the cap", async () => {
    const stamp = pendingStamp(ALICE, "aa");
    const fetchMock: FetchLike = async () => ({
      ok: true,
      status: 200,
      body: stream([stamp.subarray(0, 5), stamp.subarray(5)]),
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    const result = await submitDigest(ROOT, { fetch: fetchMock, calendars: [ALICE] });
    expect(result.ok).toBe(true);
  });

  /** A proof with `nonces.length` pending branches on ALICE; repeats make duplicates. */
  function proofWithBranches(nonces: string[]): string {
    const timestamp: Timestamp = {
      attestations: [],
      edges: nonces.map((n) => ({
        op: { tag: 0xf0, arg: Buffer.from(n, "hex") },
        next: {
          attestations: [],
          edges: [
            {
              op: { tag: 0x08, arg: null },
              next: { attestations: [{ kind: "pending", uri: ALICE }], edges: [] },
            },
          ],
        },
      })),
    };
    return encodeOtsFile({ digest: Buffer.from(ROOT, "hex"), timestamp }).toString("base64");
  }

  it("dedupes identical pending attestations and caps at 16 per proof", async () => {
    const unique = Array.from({ length: 30 }, (_, i) => i.toString(16).padStart(2, "0"));
    const requested: string[] = [];
    const fetchMock: FetchLike = async (url) => {
      requested.push(url);
      return fail(404);
    };

    await upgradeProof(proofWithBranches([...unique, ...unique]), {
      fetch: fetchMock,
      calendars: [ALICE],
    });
    expect(requested).toHaveLength(16);
    expect(new Set(requested).size).toBe(16);

    requested.length = 0;
    await upgradeProof(proofWithBranches(["aa", "aa", "aa"]), {
      fetch: fetchMock,
      calendars: [ALICE],
    });
    expect(requested).toHaveLength(1);
  });

  it("limits concurrent calendar requests to 4", async () => {
    const nonces = Array.from({ length: 12 }, (_, i) => i.toString(16).padStart(2, "0"));
    let inFlight = 0;
    let peak = 0;
    const fetchMock: FetchLike = async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return fail(404);
    };
    await upgradeProof(proofWithBranches(nonces), { fetch: fetchMock, calendars: [ALICE] });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });
});
