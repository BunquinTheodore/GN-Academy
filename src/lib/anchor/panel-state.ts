import type { ProofBundle } from "@/lib/anchor/bundle";

/**
 * What the verify page shows for a credential, as plain data so the choice of
 * copy and state is testable without rendering.
 */

export type PanelState =
  | { kind: "hidden" }
  | { kind: "pending" }
  | {
      kind: "submitted" | "confirmed";
      bitcoinBlock: number | null;
      stampedAt: string;
      leafHash: string;
      merkleRoot: string;
      hashMatches: boolean;
    };

export const PANEL_COPY = {
  heading: "Blockchain proof",
  pending: "Queued for the next daily timestamp.",
  pendingDetail:
    "Once it is stamped, this page shows the proof and a way to check it yourself.",
  submitted: "Timestamped, Bitcoin confirmation pending.",
  submittedDetail:
    "The timestamp has been sent to the public OpenTimestamps calendars. Bitcoin confirmation usually follows within a day.",
  confirmed: (block: number) => `Reported confirmed in Bitcoin block ${block}.`,
  confirmedDetail:
    "This page reports what our records say. The trustless check is to download the proof and verify it yourself with open source tools, without trusting GN Academy.",
  matchOk:
    "Hash check passed: this record matches the hash that was timestamped.",
  matchFail:
    "Hash check failed: this record does not match the hash that was timestamped. Do not rely on it.",
  scope:
    "The timestamp proves this credential existed as issued on that date. Only a salted hash is published. Revocation is not recorded on Bitcoin, so the status above is checked live.",
} as const;

export function panelState(
  anchorStatus: "pending" | "anchored" | "skipped" | undefined,
  bundle: ProofBundle | null,
): PanelState {
  if (anchorStatus === "pending") return { kind: "pending" };
  if (anchorStatus !== "anchored" || !bundle) return { kind: "hidden" };

  const confirmed = bundle.batch.otsStatus === "confirmed";
  return {
    kind: confirmed ? "confirmed" : "submitted",
    bitcoinBlock: bundle.batch.bitcoinBlock,
    stampedAt: bundle.batch.createdAt,
    leafHash: bundle.leafHash,
    merkleRoot: bundle.merkle.root,
    hashMatches: bundle.checks.leafMatches && bundle.checks.merkleMatches,
  };
}

export const explorerUrl = (block: number): string =>
  `https://mempool.space/block/${block}`;
