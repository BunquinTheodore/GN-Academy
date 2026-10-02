import { describe, expect, it } from "vitest";
import { buildVerifyUrl } from "@/lib/credentials/verify-url";

describe("buildVerifyUrl", () => {
  it("joins origin and code", () => {
    expect(buildVerifyUrl("https://gnacademy.institute", "CAVA-2026-001248")).toBe(
      "https://gnacademy.institute/verify/CAVA-2026-001248",
    );
  });

  it("trims trailing slashes from the origin", () => {
    expect(buildVerifyUrl("https://gnacademy.institute//", "A-1")).toBe(
      "https://gnacademy.institute/verify/A-1",
    );
  });

  it("encodes the code", () => {
    expect(buildVerifyUrl("https://x.test", "a/b?c")).toBe(
      "https://x.test/verify/a%2Fb%3Fc",
    );
  });
});
