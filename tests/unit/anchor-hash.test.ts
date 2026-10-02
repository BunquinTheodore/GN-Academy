import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  computeLeafHash,
  generateSalt,
  isDemoHolder,
  leafPayloadFromCredential,
} from "@/lib/anchor/hash";

const SALT = "00112233445566778899aabbccddeeff";

const base = {
  credential_code: "CAVA-2026-000001",
  holder_name: "Maria Dela Cruz",
  title: "Certified AI Virtual Assistant",
  level: "foundation",
  issued_at: "2026-08-16T04:00:00.000Z",
  competencies: [{ key: "prompting", label: "Prompting", score: 90 }],
};

describe("anchor leaf hash", () => {
  it("is deterministic for the same credential and salt", () => {
    const a = computeLeafHash(leafPayloadFromCredential(base), SALT);
    const b = computeLeafHash(leafPayloadFromCredential(base), SALT);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not depend on object key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 2 }, b: 1 }),
    );
    const shuffled = {
      competencies: [{ score: 90, label: "Prompting", key: "prompting" }],
      issued_at: base.issued_at,
      level: base.level,
      title: base.title,
      holder_name: base.holder_name,
      credential_code: base.credential_code,
    };
    expect(computeLeafHash(leafPayloadFromCredential(shuffled), SALT)).toBe(
      computeLeafHash(leafPayloadFromCredential(base), SALT),
    );
  });

  it("normalises unicode to NFC", () => {
    const composed = leafPayloadFromCredential({ ...base, holder_name: "Jos\u00e9" });
    const decomposed = leafPayloadFromCredential({ ...base, holder_name: "Jose\u0301" });
    expect(computeLeafHash(composed, SALT)).toBe(computeLeafHash(decomposed, SALT));
  });

  it("changes when the salt changes", () => {
    const payload = leafPayloadFromCredential(base);
    expect(computeLeafHash(payload, SALT)).not.toBe(
      computeLeafHash(payload, "ffeeddccbbaa99887766554433221100"),
    );
  });

  it("changes when any field changes", () => {
    const original = computeLeafHash(leafPayloadFromCredential(base), SALT);
    const renamed = computeLeafHash(
      leafPayloadFromCredential({ ...base, holder_name: "Maria Dela Cruz Jr." }),
      SALT,
    );
    expect(renamed).not.toBe(original);
  });

  it("normalises issued_at to ISO UTC regardless of input offset", () => {
    const utc = leafPayloadFromCredential(base);
    const offset = leafPayloadFromCredential({
      ...base,
      issued_at: "2026-08-16T12:00:00+08:00",
    });
    expect(offset.issuedAt).toBe(utc.issuedAt);
  });

  it("treats null competencies and level as empty and null", () => {
    const payload = leafPayloadFromCredential({
      ...base,
      level: null,
      competencies: null,
    });
    expect(payload.level).toBeNull();
    expect(payload.competencies).toEqual([]);
    expect(payload.issuer).toBe("GN Academy");
    expect(payload.v).toBe(1);
  });

  it("generates 16 byte hex salts that differ", () => {
    const a = generateSalt();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(generateSalt()).not.toBe(a);
  });

  it("rejects a malformed salt", () => {
    expect(() => computeLeafHash(leafPayloadFromCredential(base), "xyz")).toThrow();
  });

  it("recognises demo records", () => {
    expect(isDemoHolder("Ana Reyes (Demo Record)")).toBe(true);
    expect(isDemoHolder("Ana Reyes")).toBe(false);
  });
});
