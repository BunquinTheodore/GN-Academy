import {
  applyUpgrades,
  bitcoinHeights,
  collectPending,
  decodeOtsFile,
  encodeOtsFile,
  mergeTimestamps,
  parseTimestamp,
  upgradeKey,
  type Timestamp,
} from "@/lib/anchor/ots-format";

/**
 * OpenTimestamps over the public calendar HTTP API, with no client library.
 *
 * The `opentimestamps` npm package was last published in 2022 and drags in
 * bitcore-lib and the deprecated `request` stack, which is far more than two
 * HTTP calls need. The protocol surface used here is:
 *
 *   POST {calendar}/digest              body: 32 raw bytes -> serialized timestamp
 *   GET  {calendar}/timestamp/{hex}     -> serialized timestamp once the calendar
 *                                          has the Bitcoin attestation, else 404
 *
 * Nothing here throws into a caller: submit and upgrade return result objects,
 * because a calendar being down must never affect issuance or the batch run.
 * fetch is injected so tests never touch the network.
 */

export const DEFAULT_CALENDARS = [
  "https://alice.btc.calendar.opentimestamps.org",
  "https://bob.btc.calendar.opentimestamps.org",
  "https://finney.calendar.eternitywall.com",
] as const;

const OTS_ACCEPT = "application/vnd.opentimestamps.v1";
const DEFAULT_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const ROOT_HEX = /^[0-9a-f]{64}$/;
const MAX_PENDING_PER_PROOF = 16;
const CALENDAR_CONCURRENCY = 4;

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: Uint8Array;
    signal?: AbortSignal;
    /** Always "error": a calendar must never bounce us to another host. */
    redirect?: "error";
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get: (name: string) => string | null };
  /** When present the body is read incrementally so the size cap holds mid-stream. */
  body?: { getReader: () => StreamReader } | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

type StreamReader = {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
  cancel: () => Promise<void>;
};

export type OtsDeps = {
  fetch: FetchLike;
  calendars?: readonly string[];
  timeoutMs?: number;
};

export type SubmitResult =
  | { ok: true; proofBase64: string; accepted: number }
  | { ok: false; error: string };

export type UpgradeResult = {
  proofBase64: string;
  status: "submitted" | "confirmed";
  bitcoinBlock: number | null;
  changed: boolean;
};

/** Reads at most MAX_RESPONSE_BYTES, aborting the stream as soon as it is exceeded. */
async function readCapped(
  res: Awaited<ReturnType<FetchLike>>,
  controller: AbortController,
): Promise<Buffer | null> {
  const declared = Number(res.headers?.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    controller.abort();
    return null;
  }

  if (!res.body) {
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_RESPONSE_BYTES ? bytes : null;
  }

  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      controller.abort();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return total > 0 ? Buffer.concat(chunks) : null;
}

async function callCalendar(
  deps: OtsDeps,
  url: string,
  init: { method: string; body?: Uint8Array },
): Promise<Buffer | null> {
  if (!isHttps(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await deps.fetch(url, {
      ...init,
      headers: { Accept: OTS_ACCEPT, "Content-Type": "application/octet-stream" },
      signal: controller.signal,
      redirect: "error",
    });
    if (!res.ok) return null;
    return await readCapped(res, controller);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isHttps(url: string): boolean {
  return url.startsWith("https://");
}

/** Runs `task` over `items` with at most `limit` in flight, keeping input order. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function tryParse(bytes: Buffer | null): Timestamp | null {
  if (!bytes) return null;
  try {
    return parseTimestamp(bytes);
  } catch {
    return null;
  }
}

/** Submits a 32 byte SHA-256 root to every calendar and merges what comes back. */
export async function submitDigest(
  rootHex: string,
  deps: OtsDeps,
): Promise<SubmitResult> {
  if (!ROOT_HEX.test(rootHex)) return { ok: false, error: "Root must be 64 hex characters." };
  const digest = Buffer.from(rootHex, "hex");
  const calendars = (deps.calendars ?? DEFAULT_CALENDARS).filter(isHttps);

  const responses = await Promise.all(
    calendars.map((base) =>
      callCalendar(deps, `${base}/digest`, { method: "POST", body: digest }),
    ),
  );
  const stamps = responses.map(tryParse).filter((t): t is Timestamp => t !== null);
  if (stamps.length === 0) {
    return { ok: false, error: "No OpenTimestamps calendar accepted the digest." };
  }

  const timestamp = stamps.reduce(mergeTimestamps);
  return {
    ok: true,
    accepted: stamps.length,
    proofBase64: encodeOtsFile({ digest, timestamp }).toString("base64"),
  };
}

function isAllowedCalendar(uri: string, allowed: readonly string[]): boolean {
  return allowed.some((base) => uri.replace(/\/+$/, "") === base);
}

/**
 * Asks each calendar named in the proof whether its Bitcoin attestation is
 * ready, and splices the answers in. Only calendars on the allowlist are
 * contacted: the URI is read out of a proof, so it is not trusted.
 */
export async function upgradeProof(
  proofBase64: string,
  deps: OtsDeps,
): Promise<UpgradeResult> {
  const unchanged: UpgradeResult = {
    proofBase64,
    status: "submitted",
    bitcoinBlock: null,
    changed: false,
  };

  try {
    const file = decodeOtsFile(Buffer.from(proofBase64, "base64"));
    const allowed = (deps.calendars ?? DEFAULT_CALENDARS).filter(isHttps);
    const seen = new Set<string>();
    const pending = collectPending(file.timestamp, file.digest)
      .filter((p) => isAllowedCalendar(p.uri, allowed))
      .filter((p) => {
        const key = upgradeKey(p.uri, p.commitment);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_PENDING_PER_PROOF);

    const fetched = await mapLimited(pending, CALENDAR_CONCURRENCY, async (p) => {
      const base = p.uri.replace(/\/+$/, "");
      const url = `${base}/timestamp/${p.commitment.toString("hex")}`;
      const stamp = tryParse(await callCalendar(deps, url, { method: "GET" }));
      return stamp ? ([upgradeKey(p.uri, p.commitment), stamp] as const) : null;
    });
    const upgrades = new Map(fetched.filter((f) => f !== null));

    const timestamp =
      upgrades.size > 0
        ? applyUpgrades(file.timestamp, file.digest, upgrades)
        : file.timestamp;
    const heights = bitcoinHeights(timestamp);
    if (upgrades.size === 0 && heights.length === 0) return unchanged;

    return {
      proofBase64: encodeOtsFile({ digest: file.digest, timestamp }).toString("base64"),
      status: heights.length > 0 ? "confirmed" : "submitted",
      bitcoinBlock: heights.length > 0 ? Math.min(...heights) : null,
      changed: upgrades.size > 0,
    };
  } catch {
    return unchanged;
  }
}
