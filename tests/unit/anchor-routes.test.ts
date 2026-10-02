import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  ANCHOR_CRON_SECRET: undefined as string | undefined,
  IP_HASH_SALT: "test-salt",
}));

vi.mock("@/lib/env.server", () => ({ serverEnv: env }));
vi.mock("@/lib/db/anchors", () => ({
  createAnchorBatch: vi.fn(),
  listPendingLeaves: vi.fn(),
  listStaleSubmittedBatches: vi.fn(async () => []),
  listSubmittedBatches: vi.fn(),
  markBatchChecked: vi.fn(),
  updateBatchProof: vi.fn(),
}));
vi.mock("@/lib/anchor/run-batch", () => ({ runAnchorBatch: vi.fn() }));
const rpc = vi.hoisted(() => vi.fn(async () => ({ data: true, error: null })));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => ({ rpc }) }));
vi.mock("@/lib/db/credentials", () => ({ getCredentialByCode: vi.fn(async () => null) }));

import { POST } from "@/app/api/internal/anchor-batch/route";
import { GET } from "@/app/api/credentials/[code]/proof/route";
import { runAnchorBatch } from "@/lib/anchor/run-batch";

const SECRET = "s".repeat(40);
const post = (auth?: string) =>
  POST(
    new Request("https://x.test/api/internal/anchor-batch", {
      method: "POST",
      headers: auth ? { authorization: auth } : {},
    }),
  );

describe("anchor-batch route", () => {
  beforeEach(() => {
    vi.mocked(runAnchorBatch).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("answers 401 (not 503) and logs when the secret is unset", async () => {
    env.ANCHOR_CRON_SECRET = undefined;
    const res = await post(`Bearer ${SECRET}`);
    expect(res.status).toBe(401);
    expect(console.error).toHaveBeenCalled();
  });

  it("answers the same 401 body for a wrong secret as for an unset one", async () => {
    env.ANCHOR_CRON_SECRET = undefined;
    const unset = await (await post(`Bearer ${SECRET}`)).text();
    env.ANCHOR_CRON_SECRET = SECRET;
    const wrong = await post("Bearer nope");
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(unset);
  });

  it("returns no raw driver message when the run throws", async () => {
    env.ANCHOR_CRON_SECRET = SECRET;
    vi.mocked(runAnchorBatch).mockRejectedValue(new Error('relation "anchor_batches" missing'));
    const res = await post(`Bearer ${SECRET}`);
    const body = await res.text();
    expect(res.status).toBe(500);
    expect(body).not.toContain("anchor_batches");
  });

  it("answers 502 when the run reports errors (so the workflow goes red)", async () => {
    env.ANCHOR_CRON_SECRET = SECRET;
    vi.mocked(runAnchorBatch).mockResolvedValue({
      ok: false,
      batches: [],
      upgraded: 0,
      confirmed: 0,
      morePending: false,
      staleBatches: ["b1"],
      errors: ["stale_batches"],
    });
    expect((await post(`Bearer ${SECRET}`)).status).toBe(502);
  });
});

describe("proof route", () => {
  it("uses its own proofLookup rate-limit bucket", async () => {
    await GET(new Request("https://x.test/p"), { params: Promise.resolve({ code: "GNA-1234" }) });
    expect(rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_max: 60, p_key: expect.stringMatching(/:proof-lookup$/) }),
    );
  });
});
