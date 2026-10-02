import { describe, expect, it } from "vitest";

import {
  normalizeCredentialCode,
  verifyPathForCode,
} from "@/lib/credentials/code-input";

describe("normalizeCredentialCode", () => {
  it("uppercases and strips all whitespace, like the verify page does", () => {
    expect(normalizeCredentialCode("  cava-2026-000001 ")).toBe("CAVA-2026-000001");
    expect(normalizeCredentialCode("cava 2026\t000001")).toBe("CAVA2026000001");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(normalizeCredentialCode("")).toBeNull();
    expect(normalizeCredentialCode("   \n ")).toBeNull();
  });
});

describe("verifyPathForCode", () => {
  it("builds the public verify path with the code encoded", () => {
    expect(verifyPathForCode("CAVA-2026-000001")).toBe("/verify/CAVA-2026-000001");
    expect(verifyPathForCode("A/B?C")).toBe("/verify/A%2FB%3FC");
  });
});
