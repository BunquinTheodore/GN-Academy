import { CircleCheck, Clock, Link2, ShieldAlert } from "lucide-react";

import { loadProofBundle } from "@/lib/anchor/load";
import {
  explorerUrl,
  PANEL_COPY,
  panelState,
  type PanelState,
} from "@/lib/anchor/panel-state";
import type { Credential } from "@/lib/db/credentials";
import { formatDate } from "@/lib/format";

const short = (hex: string) => `${hex.slice(0, 10)}...${hex.slice(-8)}`;

function Headline({ state }: { state: Exclude<PanelState, { kind: "hidden" }> }) {
  if (state.kind === "pending") {
    return (
      <>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4 text-muted-foreground" aria-hidden />
          {PANEL_COPY.pending}
        </p>
        <p className="text-sm text-muted-foreground">{PANEL_COPY.pendingDetail}</p>
      </>
    );
  }
  const confirmed = state.kind === "confirmed" && state.bitcoinBlock !== null;
  return (
    <>
      <p className="flex items-center gap-2 text-sm font-medium">
        <CircleCheck className="size-4 text-verified-text" aria-hidden />
        {confirmed
          ? PANEL_COPY.confirmed(state.bitcoinBlock as number)
          : PANEL_COPY.submitted}
      </p>
      <p className="text-sm text-muted-foreground">
        {confirmed ? PANEL_COPY.confirmedDetail : PANEL_COPY.submittedDetail}
      </p>
    </>
  );
}

function Details({
  state,
  code,
}: {
  state: Extract<PanelState, { leafHash: string }>;
  code: string;
}) {
  return (
    <>
      <p
        role="status"
        className={`flex items-start gap-2 text-sm ${
          state.hashMatches ? "text-verified-text" : "text-destructive"
        }`}
      >
        {state.hashMatches ? (
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        {state.hashMatches ? PANEL_COPY.matchOk : PANEL_COPY.matchFail}
      </p>
      <dl className="grid gap-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-2">
          <dt>Credential hash</dt>
          <dd className="font-mono text-foreground" title={state.leafHash}>
            {short(state.leafHash)}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt>Batch root</dt>
          <dd className="font-mono text-foreground" title={state.merkleRoot}>
            {short(state.merkleRoot)}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt>Stamped</dt>
          <dd className="text-foreground">{formatDate(state.stampedAt)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {state.kind === "confirmed" && state.bitcoinBlock !== null && (
          <a
            href={explorerUrl(state.bitcoinBlock)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-4"
          >
            <Link2 className="size-3.5" aria-hidden />
            View block on mempool.space
          </a>
        )}
        <a
          href={`/api/credentials/${encodeURIComponent(code)}/proof`}
          className="underline underline-offset-4"
        >
          Download proof (JSON)
        </a>
      </div>
    </>
  );
}

/**
 * The "Blockchain proof" section of /verify/[code]. Renders nothing for
 * credentials that are not anchored (demo records, older rows, expired ones)
 * and nothing if the proof cannot be loaded: a broken proof lookup must never
 * break the verification page itself.
 */
export async function AnchorProofPanel({ credential }: { credential: Credential }) {
  let state: PanelState = { kind: "hidden" };
  try {
    const bundle =
      credential.anchor_status === "anchored" ? await loadProofBundle(credential) : null;
    state = panelState(credential.anchor_status, bundle);
  } catch (e) {
    console.error("anchor panel failed", credential.credential_code, e);
  }
  if (state.kind === "hidden") return null;

  return (
    <section
      aria-labelledby="anchor-proof-heading"
      className="glass-panel-bright gn-shine overflow-hidden mt-6 flex flex-col gap-3 rounded-lg p-5"
    >
      <h2 id="anchor-proof-heading" className="text-sm font-semibold">
        {PANEL_COPY.heading}
      </h2>
      <Headline state={state} />
      {state.kind !== "pending" && (
        <Details state={state} code={credential.credential_code} />
      )}
      <p className="text-xs text-muted-foreground">{PANEL_COPY.scope}</p>
    </section>
  );
}
