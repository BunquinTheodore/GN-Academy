import { buildMerkleTree, type ProofStep } from "@/lib/anchor/merkle";
import { submitDigest, upgradeProof, type OtsDeps } from "@/lib/anchor/ots";

/**
 * One run of the daily anchoring job. All side effects come in through `deps`
 * so the whole flow is testable without a database or a network.
 *
 * Idempotent by construction: only credentials that are still pending and
 * unbatched are gathered, and the database function that records a batch claims
 * exactly those rows in one transaction. A second run right after the first
 * finds nothing pending and creates nothing. Two overlapping runs cannot both
 * claim the same credentials; the loser rolls back and reports an error.
 *
 * Time budget: serverless functions are short-lived here, so the run stops
 * starting new work once `budgetMs` is spent. Pending credentials are taken in
 * chunks of `chunkSize`; whatever is left waits for the next run.
 */

export type RunDeps = {
  listPending: (limit: number) => Promise<{ id: string; anchor_hash: string }[]>;
  createBatch: (input: {
    root: string;
    otsProofBase64: string;
    items: { id: string; leaf: string; proof: ProofStep[] }[];
  }) => Promise<string>;
  /** Least recently checked first, so a stuck batch cannot starve newer ones. */
  listSubmitted: (limit: number) => Promise<
    { id: string; ots_proof: string | null }[]
  >;
  /** Records that a batch was checked, even when nothing changed. */
  markChecked?: (id: string) => Promise<void>;
  /** Batches still 'submitted' and created before the cutoff (ISO timestamp). */
  listStale?: (cutoffIso: string) => Promise<{ id: string }[]>;
  updateBatch: (
    id: string,
    input: {
      otsProofBase64: string;
      status: "submitted" | "confirmed";
      bitcoinBlock: number | null;
    },
  ) => Promise<void>;
  ots: OtsDeps;
  now: () => number;
};

export type RunOptions = {
  chunkSize: number;
  maxBatches: number;
  upgradeLimit: number;
  budgetMs: number;
};

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  chunkSize: 500,
  maxBatches: 3,
  upgradeLimit: 20,
  budgetMs: 12_000,
};

/** A timestamp unconfirmed after this long needs a human to look at it. */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type RunResult = {
  ok: boolean;
  batches: { id: string; leafCount: number; root: string }[];
  upgraded: number;
  confirmed: number;
  morePending: boolean;
  /** Ids of batches still 'submitted' after STALE_AFTER_MS. Makes `ok` false. */
  staleBatches: string[];
  /** Generic codes only: details go to the server log, never the response. */
  errors: string[];
};

type Batch = RunResult["batches"][number];

async function createOneBatch(
  deps: RunDeps,
  chunkSize: number,
): Promise<{ batch: Batch | null; full: boolean; error?: string }> {
  const pending = await deps.listPending(chunkSize);
  if (pending.length === 0) return { batch: null, full: false };

  const tree = buildMerkleTree(pending.map((p) => p.anchor_hash));
  const submitted = await submitDigest(tree.root, deps.ots);
  if (!submitted.ok) {
    return { batch: null, full: false, error: submitted.error };
  }

  const id = await deps.createBatch({
    root: tree.root,
    otsProofBase64: submitted.proofBase64,
    items: pending.map((p, i) => ({
      id: p.id,
      leaf: p.anchor_hash,
      proof: tree.proofs[i],
    })),
  });
  return {
    batch: { id, leafCount: pending.length, root: tree.root },
    full: pending.length >= chunkSize,
  };
}

async function createBatches(
  deps: RunDeps,
  options: RunOptions,
  startedAt: number,
): Promise<Pick<RunResult, "batches" | "morePending" | "errors">> {
  let batches: Batch[] = [];
  let morePending = false;

  for (let i = 0; i < options.maxBatches; i++) {
    if (deps.now() - startedAt > options.budgetMs) {
      return { batches, morePending: true, errors: [] };
    }
    try {
      const step = await createOneBatch(deps, options.chunkSize);
      if (step.error) return { batches, morePending: true, errors: [step.error] };
      if (!step.batch) return { batches, morePending: false, errors: [] };
      batches = [...batches, step.batch];
      morePending = step.full;
      if (!step.full) break;
    } catch (e) {
      return { batches, morePending: true, errors: [errorText("create_batch_failed", e)] };
    }
  }
  return { batches, morePending, errors: [] };
}

async function upgradeBatches(
  deps: RunDeps,
  options: RunOptions,
  startedAt: number,
): Promise<{ upgraded: number; confirmed: number; errors: string[] }> {
  let upgraded = 0;
  let confirmed = 0;
  let errors: string[] = [];

  let submitted: Awaited<ReturnType<RunDeps["listSubmitted"]>> = [];
  try {
    submitted = await deps.listSubmitted(options.upgradeLimit);
  } catch (e) {
    return { upgraded, confirmed, errors: [errorText("list_submitted_failed", e)] };
  }

  for (const batch of submitted) {
    if (deps.now() - startedAt > options.budgetMs) break;
    if (!batch.ots_proof) continue;
    try {
      const result = await upgradeProof(batch.ots_proof, deps.ots);
      if (!result.changed) {
        await deps.markChecked?.(batch.id);
        continue;
      }
      await deps.updateBatch(batch.id, {
        otsProofBase64: result.proofBase64,
        status: result.status,
        bitcoinBlock: result.bitcoinBlock,
      });
      upgraded += 1;
      if (result.status === "confirmed") confirmed += 1;
    } catch (e) {
      errors = [...errors, errorText("upgrade_batch_failed", e)];
    }
  }
  return { upgraded, confirmed, errors };
}

/** Logs the detail server side and returns only the generic code. */
function errorText(code: string, e: unknown): string {
  console.error(`anchor batch step failed: ${code}`, e);
  return code;
}

async function findStale(deps: RunDeps): Promise<{ ids: string[]; errors: string[] }> {
  if (!deps.listStale) return { ids: [], errors: [] };
  try {
    const cutoff = new Date(deps.now() - STALE_AFTER_MS).toISOString();
    const stale = await deps.listStale(cutoff);
    return {
      ids: stale.map((b) => b.id),
      errors: stale.length > 0 ? ["stale_batches"] : [],
    };
  } catch (e) {
    return { ids: [], errors: [errorText("list_stale_failed", e)] };
  }
}

export async function runAnchorBatch(
  deps: RunDeps,
  options: RunOptions = DEFAULT_RUN_OPTIONS,
): Promise<RunResult> {
  const startedAt = deps.now();
  const created = await createBatches(deps, options, startedAt);
  const upgrades = await upgradeBatches(deps, options, startedAt);
  const stale = await findStale(deps);
  const errors = [...created.errors, ...upgrades.errors, ...stale.errors];

  return {
    ok: errors.length === 0,
    batches: created.batches,
    upgraded: upgrades.upgraded,
    confirmed: upgrades.confirmed,
    morePending: created.morePending,
    staleBatches: stale.ids,
    errors,
  };
}
