import { bearerToken, secretMatches } from "@/lib/anchor/cron-auth";
import { runAnchorBatch } from "@/lib/anchor/run-batch";
import type { FetchLike } from "@/lib/anchor/ots";
import {
  createAnchorBatch,
  listPendingLeaves,
  listStaleSubmittedBatches,
  listSubmittedBatches,
  markBatchChecked,
  updateBatchProof,
} from "@/lib/db/anchors";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";
// Calendar calls are capped at a few seconds each and the run stops starting
// new work after its own budget, so this stays well inside one invocation.
export const maxDuration = 30;

/**
 * Daily anchoring job, called by .github/workflows/anchor-batch.yml with
 * `Authorization: Bearer $ANCHOR_CRON_SECRET`. Not a user route: it has no
 * session, so the shared secret is the only gate. See run-batch.ts for what a
 * run does and why it is safe to repeat.
 */
export async function POST(request: Request) {
  const secret = serverEnv.ANCHOR_CRON_SECRET;
  if (!secret) {
    // Same answer as a wrong secret, so a probe cannot tell the route is
    // unconfigured. The operator sees the real reason in the server log.
    console.error(
      "anchor batch: ANCHOR_CRON_SECRET is unset, blank or shorter than 32 characters",
    );
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const presented = bearerToken(request.headers.get("authorization"));
  if (!secretMatches(presented, secret)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runAnchorBatch({
      listPending: listPendingLeaves,
      createBatch: createAnchorBatch,
      listSubmitted: listSubmittedBatches,
      markChecked: markBatchChecked,
      listStale: listStaleSubmittedBatches,
      updateBatch: updateBatchProof,
      ots: { fetch: fetch as unknown as FetchLike },
      now: Date.now,
    });
    return Response.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    console.error("anchor batch run failed", e);
    return Response.json({ ok: false, error: "Anchor run failed." }, { status: 500 });
  }
}
