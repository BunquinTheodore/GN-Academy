import { describe, expect, it } from "vitest";
import {
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schemas";

describe("safeNextPath", () => {
  it("accepts same-origin pathnames", () => {
    expect(safeNextPath("/dashboard/courses")).toBe("/dashboard/courses");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.example.com")).toBe("/dashboard");
  });

  it("rejects backslash tricks", () => {
    expect(safeNextPath("/\\evil.example.com")).toBe("/dashboard");
  });

  it("falls back on empty values", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("honours a custom fallback", () => {
    expect(safeNextPath(null, "/")).toBe("/");
  });
});

describe("signUpSchema", () => {
  it("requires an 8+ character password", () => {
    const result = signUpSchema.safeParse({
      fullName: "Juana Dela Cruz",
      email: "juana@example.com",
      password: "short",
      marketingConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid signup", () => {
    const result = signUpSchema.safeParse({
      fullName: "Juana Dela Cruz",
      email: "juana@example.com",
      password: "longenough1",
      marketingConsent: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("signInSchema", () => {
  it("rejects a malformed email", () => {
    expect(
      signInSchema.safeParse({ email: "not-an-email", password: "x" }).success,
    ).toBe(false);
  });
});
