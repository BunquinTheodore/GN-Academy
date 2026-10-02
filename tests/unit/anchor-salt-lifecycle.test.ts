import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: vi.fn() }));
vi.mock("@/lib/storage", () => ({ AVATAR_BUCKET: "avatars", PORTFOLIO_BUCKET: "portfolio" }));
vi.mock("@/lib/db/credentials", () => ({ getCredentialByCode: vi.fn() }));

import { getAnchorBatch, getAnchorSalt, saveCredentialAnchor } from "@/lib/db/anchors";
import { backfillAnchors, writeAnchorAssignment } from "@/lib/db/anchor-backfill";
import { loadProofBundle } from "@/lib/anchor/load";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteAccountData } from "@/lib/account/delete";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Credential } from "@/lib/db/credentials";

type Reply = { data?: unknown; error?: unknown };
type Call = { table: string; op: string; args: unknown[][] };

/**
 * Chainable stand-in for the Supabase query builder. Each `table.op` has a
 * queue of replies (the last one repeats); every call is recorded in order.
 */
function fakeClient(replies: Record<string, Reply[]> = {}) {
  const calls: Call[] = [];
  const counters: Record<string, number> = {};
  const from = (table: string) => {
    const call: Call = { table, op: "select", args: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    const settle = () => {
      const key = `${table}.${call.op}`;
      const queue = replies[key] ?? [{ data: [] }];
      const i = Math.min(counters[key] ?? 0, queue.length - 1);
      counters[key] = (counters[key] ?? 0) + 1;
      const r = queue[i];
      return { data: r.data ?? null, error: r.error ?? null };
    };
    for (const m of ["select", "update", "delete", "upsert", "eq", "is", "in", "order", "limit", "gt", "not"]) {
      builder[m] = (...args: unknown[]) => {
        if (["update", "delete", "upsert"].includes(m)) call.op = m;
        call.args.push([m, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = () => Promise.resolve(settle());
    builder.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(settle()).then(res, rej);
    return builder;
  };
  return { client: { from } as unknown as SupabaseClient, calls };
}

const ops = (calls: Call[]) => calls.map((c) => `${c.table}.${c.op}`);

describe("writeAnchorAssignment", () => {
  it("claims the credential first, with a null-hash guard, then writes the salt", async () => {
    const { client, calls } = fakeClient({
      "credentials.update": [{ data: [{ id: "c1" }] }],
      "credential_anchor_secrets.upsert": [{ data: [{ credential_id: "c1" }] }],
    });
    const result = await writeAnchorAssignment(client, "c1", "s".repeat(32), "h".repeat(64));

    expect(result).toBe("assigned");
    expect(ops(calls)).toEqual(["credentials.update", "credential_anchor_secrets.upsert"]);
    const claim = calls[0].args.map((a) => a[0]);
    expect(claim).toContain("is");
    expect(calls[0].args).toContainEqual(["is", "anchor_hash", null]);
    expect(calls[0].args).toContainEqual(["select", "id"]);
    expect(calls[1].args).toContainEqual([
      "upsert",
      { credential_id: "c1", salt: "s".repeat(32) },
      { onConflict: "credential_id", ignoreDuplicates: true },
    ]);
  });

  it("never touches the salt when the credential already has a hash", async () => {
    const { client, calls } = fakeClient({ "credentials.update": [{ data: [] }] });
    const result = await writeAnchorAssignment(client, "c1", "s", "h");
    expect(result).toBe("already_anchored");
    expect(ops(calls)).toEqual(["credentials.update"]);
  });

  it("undoes the claim when the salt cannot be stored", async () => {
    const { client, calls } = fakeClient({
      "credentials.update": [{ data: [{ id: "c1" }] }, { data: [] }],
      "credential_anchor_secrets.upsert": [{ error: new Error("boom") }],
    });
    await expect(writeAnchorAssignment(client, "c1", "s", "h")).rejects.toThrow("boom");
    expect(ops(calls)).toEqual([
      "credentials.update",
      "credential_anchor_secrets.upsert",
      "credentials.update",
    ]);
    expect(calls[2].args).toContainEqual(["update", { anchor_hash: null, anchor_status: "skipped" }]);
    expect(calls[2].args).toContainEqual(["eq", "anchor_hash", "h"]);
  });

  it("keeps a matching existing salt and rejects a different one", async () => {
    const same = fakeClient({
      "credentials.update": [{ data: [{ id: "c1" }] }],
      "credential_anchor_secrets.upsert": [{ data: [] }],
      "credential_anchor_secrets.select": [{ data: { salt: "mine" } }],
    });
    expect(await writeAnchorAssignment(same.client, "c1", "mine", "h")).toBe("assigned");

    const other = fakeClient({
      "credentials.update": [{ data: [{ id: "c1" }] }, { data: [] }],
      "credential_anchor_secrets.upsert": [{ data: [] }],
      "credential_anchor_secrets.select": [{ data: { salt: "theirs" } }],
    });
    await expect(writeAnchorAssignment(other.client, "c1", "mine", "h")).rejects.toThrow();
  });
});

describe("saveCredentialAnchor", () => {
  beforeEach(() => vi.mocked(supabaseAdmin).mockReset());

  it("uses the same claim-then-salt order for fresh issuance", async () => {
    const { client, calls } = fakeClient({
      "credentials.update": [{ data: [{ id: "c1" }] }],
      "credential_anchor_secrets.upsert": [{ data: [{ credential_id: "c1" }] }],
    });
    vi.mocked(supabaseAdmin).mockReturnValue(client as never);
    await saveCredentialAnchor("c1", { status: "pending", salt: "s", hash: "h" });
    expect(ops(calls)).toEqual(["credentials.update", "credential_anchor_secrets.upsert"]);
  });

  it("writes no salt when the row was already anchored", async () => {
    const { client, calls } = fakeClient({ "credentials.update": [{ data: [] }] });
    vi.mocked(supabaseAdmin).mockReturnValue(client as never);
    await saveCredentialAnchor("c1", { status: "pending", salt: "s", hash: "h" });
    expect(ops(calls)).toEqual(["credentials.update"]);
  });
});

describe("backfillAnchors", () => {
  const row = {
    id: "c1",
    credential_code: "GNA-1",
    holder_name: "Ana Reyes",
    title: "T",
    level: "L",
    issued_at: "2026-01-01T00:00:00Z",
    competencies: [],
  };

  it("counts a credential that raced with issuance as alreadyAnchored, not assigned", async () => {
    const { client, calls } = fakeClient({
      "credentials.select": [{ data: [row] }, { data: [] }],
      "credentials.update": [{ data: [] }],
    });
    const summary = await backfillAnchors(client, { dryRun: false });
    expect(summary).toMatchObject({ scanned: 1, assigned: 0, alreadyAnchored: 1, failed: 0 });
    expect(ops(calls)).not.toContain("credential_anchor_secrets.upsert");
  });

  it("writes nothing on a dry run", async () => {
    const { client, calls } = fakeClient({ "credentials.select": [{ data: [row] }, { data: [] }] });
    const summary = await backfillAnchors(client, { dryRun: true });
    expect(summary).toMatchObject({ assigned: 1, dryRun: true });
    expect(ops(calls).filter((o) => o.endsWith("update") || o.endsWith("upsert"))).toEqual([]);
  });
});

describe("missing salt is handled gracefully", () => {
  it("loadProofBundle returns null (so the proof route 404s and the panel hides) when the salt is gone", async () => {
    const credential = {
      id: "c1",
      credential_code: "GNA-1",
      status: "active",
      anchor_status: "anchored",
      anchor_hash: "a".repeat(64),
      anchor_proof: [],
      anchor_batch_id: "b1",
    } as unknown as Credential;
    const batch = { data: { id: "b1", merkle_root: "m" } };
    const { client } = fakeClient({
      "credential_anchor_secrets.select": [{ data: null }],
      "anchor_batches.select": [batch],
    });
    vi.mocked(supabaseAdmin).mockReturnValue(client as never);

    expect(await getAnchorSalt("c1")).toBeNull();
    expect(await getAnchorBatch("b1")).toEqual(batch.data);
    expect(await loadProofBundle(credential)).toBeNull();
  });
});

describe("deleteAccountData", () => {
  beforeEach(() => {
    vi.mocked(adminAuth).mockReturnValue({ deleteUser: vi.fn(async () => undefined) } as never);
  });

  function adminWithStorage(replies: Record<string, Reply[]>) {
    const { client, calls } = fakeClient(replies);
    const storage = {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ error: null }),
      }),
    };
    vi.mocked(supabaseAdmin).mockReturnValue({
      from: (t: string) => (client as unknown as { from: (t: string) => unknown }).from(t),
      storage,
    } as never);
    return calls;
  }

  it("deletes the anchor salts of the user's credentials before unlinking them", async () => {
    const calls = adminWithStorage({
      "credentials.select": [{ data: [{ id: "c1" }, { id: "c2" }] }],
      "credential_anchor_secrets.delete": [{ data: [{ credential_id: "c1" }, { credential_id: "c2" }] }],
      "credentials.update": [{ data: [{ id: "c1" }, { id: "c2" }] }],
    });

    const report = await deleteAccountData({ userId: "u1", email: "a@b.co" });

    expect(report.anchorSaltsDeleted).toBe(2);
    expect(report.credentialsUnlinked).toBe(2);
    const order = ops(calls);
    expect(order.indexOf("credential_anchor_secrets.delete")).toBeGreaterThan(-1);
    expect(order.indexOf("credential_anchor_secrets.delete")).toBeLessThan(
      order.indexOf("credentials.update"),
    );
    const del = calls.find((c) => c.table === "credential_anchor_secrets");
    expect(del?.args).toContainEqual(["in", "credential_id", ["c1", "c2"]]);
  });

  it("skips the salt delete when the user has no credentials", async () => {
    const calls = adminWithStorage({ "credentials.select": [{ data: [] }] });
    const report = await deleteAccountData({ userId: "u1", email: "a@b.co" });
    expect(report.anchorSaltsDeleted).toBe(0);
    expect(ops(calls)).not.toContain("credential_anchor_secrets.delete");
  });

  it("stops before unlinking if the salt delete fails, so a retry still finds them", async () => {
    const calls = adminWithStorage({
      "credentials.select": [{ data: [{ id: "c1" }] }],
      "credential_anchor_secrets.delete": [{ error: new Error("db down") }],
    });
    await expect(deleteAccountData({ userId: "u1", email: "a@b.co" })).rejects.toThrow("db down");
    expect(ops(calls)).not.toContain("credentials.update");
  });
});
