import { createHash } from "node:crypto";

/**
 * Minimal reader/writer for the OpenTimestamps proof format, enough to merge
 * calendar responses into one .ots file and to splice in the Bitcoin
 * attestation when a calendar later returns it. Pure: bytes in, bytes out.
 *
 * Format reference: the python-opentimestamps serialization. A timestamp is a
 * tree. Each node holds attestations (pending calendar promises or Bitcoin
 * block headers) and edges (an operation applied to the node message, leading
 * to a child node). All items except the last are prefixed with 0xff.
 */

const HEADER_MAGIC = Buffer.from(
  "004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294",
  "hex",
);
const MAJOR_VERSION = 1;
const OP_SHA256 = 0x08;
const OP_SHA1 = 0x02;
const OP_RIPEMD160 = 0x03;
const OP_APPEND = 0xf0;
const OP_PREPEND = 0xf1;
const FORK = 0xff;
const ATTESTATION = 0x00;
const TAG_LENGTH = 8;
const DIGEST_LENGTH = 32;
const MAX_DEPTH = 256;
const MAX_BYTES = 256 * 1024;

export const PENDING_TAG = Buffer.from("83dfe30d2ef90c8e", "hex");
export const BITCOIN_TAG = Buffer.from("0588960d73d71901", "hex");

export type Attestation =
  | { kind: "pending"; uri: string }
  | { kind: "bitcoin"; height: number }
  | { kind: "unknown"; tag: Buffer; payload: Buffer };

export type Op = { tag: number; arg: Buffer | null };
export type Edge = { op: Op; next: Timestamp };
export type Timestamp = {
  attestations: readonly Attestation[];
  edges: readonly Edge[];
};

// Varint helpers

function writeVarUint(value: number): Buffer {
  const out: number[] = [];
  let rest = value;
  do {
    const byte = rest % 128;
    rest = Math.floor(rest / 128);
    out.push(rest > 0 ? byte | 0x80 : byte);
  } while (rest > 0);
  return Buffer.from(out);
}

const writeVarBytes = (bytes: Buffer): Buffer =>
  Buffer.concat([writeVarUint(bytes.length), bytes]);

class Reader {
  private pos = 0;
  constructor(private readonly buf: Buffer) {}

  get done(): boolean {
    return this.pos >= this.buf.length;
  }

  rest(): Buffer {
    return this.buf.subarray(this.pos);
  }

  byte(): number {
    if (this.pos >= this.buf.length) throw new Error("Unexpected end of proof.");
    return this.buf[this.pos++];
  }

  bytes(length: number): Buffer {
    if (length < 0 || this.pos + length > this.buf.length) {
      throw new Error("Unexpected end of proof.");
    }
    const out = this.buf.subarray(this.pos, this.pos + length);
    this.pos += length;
    return out;
  }

  varUint(): number {
    let result = 0;
    let scale = 1;
    for (let i = 0; i < 6; i++) {
      const b = this.byte();
      result += (b & 0x7f) * scale;
      if ((b & 0x80) === 0) return result;
      scale *= 128;
    }
    throw new Error("Varint too long.");
  }

  varBytes(): Buffer {
    return this.bytes(this.varUint());
  }
}

// Attestations

function readAttestation(r: Reader): Attestation {
  const tag = Buffer.from(r.bytes(TAG_LENGTH));
  const payload = Buffer.from(r.varBytes());
  if (tag.equals(PENDING_TAG)) {
    return { kind: "pending", uri: new Reader(payload).varBytes().toString("utf8") };
  }
  if (tag.equals(BITCOIN_TAG)) {
    return { kind: "bitcoin", height: new Reader(payload).varUint() };
  }
  return { kind: "unknown", tag, payload };
}

function writeAttestation(a: Attestation): Buffer {
  if (a.kind === "unknown") {
    return Buffer.concat([a.tag, writeVarBytes(a.payload)]);
  }
  if (a.kind === "pending") {
    const inner = writeVarBytes(Buffer.from(a.uri, "utf8"));
    return Buffer.concat([PENDING_TAG, writeVarBytes(inner)]);
  }
  return Buffer.concat([BITCOIN_TAG, writeVarBytes(writeVarUint(a.height))]);
}

// Operations

const UNARY_OPS = new Set([OP_SHA256, OP_SHA1, OP_RIPEMD160, 0x67, 0xf2, 0xf3]);

function readOp(tag: number, r: Reader): Op {
  if (tag === OP_APPEND || tag === OP_PREPEND) {
    return { tag, arg: Buffer.from(r.varBytes()) };
  }
  if (UNARY_OPS.has(tag)) return { tag, arg: null };
  throw new Error(`Unknown operation 0x${tag.toString(16)}.`);
}

function writeOp(op: Op): Buffer {
  return op.arg
    ? Buffer.concat([Buffer.from([op.tag]), writeVarBytes(op.arg)])
    : Buffer.from([op.tag]);
}

/** Applies an operation to a message; null when this module cannot compute it. */
export function applyOp(op: Op, message: Buffer): Buffer | null {
  try {
    switch (op.tag) {
      case OP_SHA256:
        return createHash("sha256").update(message).digest();
      case OP_SHA1:
        return createHash("sha1").update(message).digest();
      case OP_RIPEMD160:
        return createHash("ripemd160").update(message).digest();
      case OP_APPEND:
        return Buffer.concat([message, op.arg ?? Buffer.alloc(0)]);
      case OP_PREPEND:
        return Buffer.concat([op.arg ?? Buffer.alloc(0), message]);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Timestamps

function readTimestamp(r: Reader, depth: number): Timestamp {
  if (depth > MAX_DEPTH) throw new Error("Proof nesting too deep.");
  const attestations: Attestation[] = [];
  const edges: Edge[] = [];

  for (;;) {
    let tag = r.byte();
    const isLast = tag !== FORK;
    if (!isLast) tag = r.byte();
    if (tag === ATTESTATION) {
      attestations.push(readAttestation(r));
    } else {
      const op = readOp(tag, r);
      edges.push({ op, next: readTimestamp(r, depth + 1) });
    }
    if (isLast) break;
  }
  return { attestations, edges };
}

function readWholeTimestamp(r: Reader): Timestamp {
  const ts = readTimestamp(r, 0);
  if (!r.done) throw new Error("Trailing bytes after timestamp.");
  return ts;
}

export function parseTimestamp(bytes: Buffer): Timestamp {
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new Error("Timestamp has an unreasonable size.");
  }
  return readWholeTimestamp(new Reader(bytes));
}

export function serializeTimestamp(ts: Timestamp): Buffer {
  const items: Buffer[] = [
    ...ts.attestations.map((a) =>
      Buffer.concat([Buffer.from([ATTESTATION]), writeAttestation(a)]),
    ),
    ...ts.edges.map((e) => Buffer.concat([writeOp(e.op), serializeTimestamp(e.next)])),
  ];
  if (items.length === 0) throw new Error("Cannot serialize an empty timestamp.");
  return Buffer.concat(
    items.map((item, i) =>
      i < items.length - 1 ? Buffer.concat([Buffer.from([FORK]), item]) : item,
    ),
  );
}

/** Merges two timestamps over the same message into one that holds both. */
export function mergeTimestamps(a: Timestamp, b: Timestamp): Timestamp {
  return {
    attestations: [...a.attestations, ...b.attestations],
    edges: [...a.edges, ...b.edges],
  };
}

// Whole .ots files

export type OtsFile = { digest: Buffer; timestamp: Timestamp };

export function encodeOtsFile(file: OtsFile): Buffer {
  if (file.digest.length !== DIGEST_LENGTH) throw new Error("Digest must be 32 bytes.");
  return Buffer.concat([
    HEADER_MAGIC,
    writeVarUint(MAJOR_VERSION),
    Buffer.from([OP_SHA256]),
    file.digest,
    serializeTimestamp(file.timestamp),
  ]);
}

export function decodeOtsFile(bytes: Buffer): OtsFile {
  if (bytes.length > MAX_BYTES) throw new Error("Proof is too large.");
  const r = new Reader(bytes);
  if (!r.bytes(HEADER_MAGIC.length).equals(HEADER_MAGIC)) {
    throw new Error("Not an OpenTimestamps proof.");
  }
  if (r.varUint() !== MAJOR_VERSION) throw new Error("Unsupported proof version.");
  if (r.byte() !== OP_SHA256) throw new Error("Unsupported digest type.");
  const digest = Buffer.from(r.bytes(DIGEST_LENGTH));
  return { digest, timestamp: readWholeTimestamp(r) };
}

// Walking

export type PendingLeaf = { uri: string; commitment: Buffer };

/** Every pending attestation with the message (commitment) it vouches for. */
export function collectPending(ts: Timestamp, message: Buffer): PendingLeaf[] {
  const here = ts.attestations.flatMap((a) =>
    a.kind === "pending" ? [{ uri: a.uri, commitment: message }] : [],
  );
  const below = ts.edges.flatMap((e) => {
    const next = applyOp(e.op, message);
    return next ? collectPending(e.next, next) : [];
  });
  return [...here, ...below];
}

export function bitcoinHeights(ts: Timestamp): number[] {
  return [
    ...ts.attestations.flatMap((a) => (a.kind === "bitcoin" ? [a.height] : [])),
    ...ts.edges.flatMap((e) => bitcoinHeights(e.next)),
  ];
}

export const upgradeKey = (uri: string, commitment: Buffer): string =>
  `${uri}|${commitment.toString("hex")}`;

/**
 * Returns a copy of the tree where each pending attestation that has an
 * upgrade (keyed by upgradeKey) is replaced by that upgrade content.
 */
export function applyUpgrades(
  ts: Timestamp,
  message: Buffer,
  upgrades: ReadonlyMap<string, Timestamp>,
): Timestamp {
  const kept: Attestation[] = [];
  const spliced: Timestamp[] = [];

  for (const a of ts.attestations) {
    const upgrade =
      a.kind === "pending" ? upgrades.get(upgradeKey(a.uri, message)) : undefined;
    if (upgrade) spliced.push(upgrade);
    else kept.push(a);
  }

  const edges: Edge[] = ts.edges.map((e) => {
    const next = applyOp(e.op, message);
    return { op: e.op, next: next ? applyUpgrades(e.next, next, upgrades) : e.next };
  });

  return spliced.reduce(mergeTimestamps, { attestations: kept, edges });
}
