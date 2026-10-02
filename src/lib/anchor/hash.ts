import { createHash, randomBytes } from "node:crypto";

/**
 * Canonical leaf hash for a credential.
 *
 * leaf = SHA-256( saltBytes || utf8(canonicalJson(payload)) )
 *
 * The payload is the credential's public facts (the same ones /verify prints).
 * The per-credential random salt is what stops someone who only sees the
 * Bitcoin-anchored root from confirming a guess about a person: without the
 * salt the hash cannot be recomputed. Anyone who is handed the payload and the
 * salt (the proof endpoint does this) can recompute it with any SHA-256 tool.
 *
 * Pure functions only. No database, no network.
 */

export const LEAF_VERSION = 1;
export const ISSUER = "GN Academy";
const SALT_BYTES = 16;
const SALT_HEX = /^[0-9a-f]{32}$/;
const DEMO_MARKER = "(Demo Record)";

export type LeafCompetency = { key: string; label: string; score: number };

export type LeafPayload = {
  v: number;
  code: string;
  holderName: string;
  title: string;
  level: string | null;
  issuedAt: string;
  competencies: LeafCompetency[];
  issuer: string;
};

/** The slice of a credential row the hash needs. */
export type CredentialHashSource = {
  credential_code: string;
  holder_name: string;
  title: string;
  level: string | null;
  issued_at: string;
  competencies: LeafCompetency[] | null;
};

const nfc = (value: string): string => value.normalize("NFC");

export function isDemoHolder(holderName: string): boolean {
  return holderName.includes(DEMO_MARKER);
}

export function generateSalt(): string {
  return randomBytes(SALT_BYTES).toString("hex");
}

/** JSON with every object's keys sorted, so key order never changes a hash. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

export function leafPayloadFromCredential(
  credential: CredentialHashSource,
): LeafPayload {
  const issued = new Date(credential.issued_at);
  if (Number.isNaN(issued.getTime())) {
    throw new Error("Credential has an invalid issued_at.");
  }
  return {
    v: LEAF_VERSION,
    code: credential.credential_code,
    holderName: nfc(credential.holder_name),
    title: nfc(credential.title),
    level: credential.level === null ? null : nfc(credential.level),
    issuedAt: issued.toISOString(),
    competencies: (credential.competencies ?? []).map((c) => ({
      key: c.key,
      label: nfc(c.label),
      score: c.score,
    })),
    issuer: ISSUER,
  };
}

export function computeLeafHash(payload: LeafPayload, saltHex: string): string {
  if (!SALT_HEX.test(saltHex)) throw new Error("Salt must be 32 lowercase hex characters.");
  return createHash("sha256")
    .update(Buffer.from(saltHex, "hex"))
    .update(Buffer.from(canonicalJson(payload), "utf8"))
    .digest("hex");
}
