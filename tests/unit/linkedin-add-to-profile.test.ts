import { describe, expect, it } from "vitest";
import {
  addToLinkedInPath,
  decideAddToProfile,
  type AddToProfileCredential,
} from "@/lib/linkedin/add-to-profile";

const NOW = new Date("2026-10-01T00:00:00Z");

const credential: AddToProfileCredential = {
  credential_code: "CAVA-2026-000001",
  user_id: "uid-owner",
  title: "AI Foundations",
  issued_at: "2026-09-01T00:00:00Z",
  expires_at: null,
  status: "active",
};

const base = {
  code: "CAVA-2026-000001", siteUrl: "https://gnacademy.test", organizationId: null, now: NOW };

describe("decideAddToProfile", () => {
  it("redirects anonymous visitors to login and returns here afterwards", () => {
    const decision = decideAddToProfile({ ...base, sessionUid: null, credential });
    expect(decision).toEqual({
      kind: "login",
      location: `/login?next=${encodeURIComponent("/credentials/CAVA-2026-000001/add-to-linkedin")}`,
    });
  });

  it("redirects the owner to the LinkedIn add form", () => {
    const decision = decideAddToProfile({
      ...base,
      sessionUid: "uid-owner",
      credential,
    });
    expect(decision.kind).toBe("redirect");
    if (decision.kind !== "redirect") return;
    expect(decision.location).toContain("https://www.linkedin.com/profile/add?");
    expect(decision.location).toContain("organizationName=GN+Academy");
    expect(decision.location).toContain("certId=CAVA-2026-000001");
  });

  it("uses the organization id and expiry when present", () => {
    const decision = decideAddToProfile({
      ...base,
      organizationId: "12345",
      sessionUid: "uid-owner",
      credential: { ...credential, expires_at: "2028-09-01T00:00:00Z" },
    });
    if (decision.kind !== "redirect") throw new Error("expected redirect");
    expect(decision.location).toContain("organizationId=12345");
    expect(decision.location).not.toContain("organizationName");
    expect(decision.location).toContain("expirationYear=2028");
  });

  it("answers not found for a signed-in non-owner", () => {
    const decision = decideAddToProfile({
      ...base,
      sessionUid: "uid-other",
      credential,
    });
    expect(decision).toEqual({ kind: "not-found" });
  });

  it("answers not found for an unknown code", () => {
    const decision = decideAddToProfile({
      ...base,
      sessionUid: "uid-owner",
      credential: null,
    });
    expect(decision).toEqual({ kind: "not-found" });
  });

  it("answers gone for a revoked credential of the owner", () => {
    const decision = decideAddToProfile({
      ...base,
      sessionUid: "uid-owner",
      credential: { ...credential, status: "revoked" },
    });
    expect(decision.kind).toBe("gone");
  });

  it("answers gone when expires_at is in the past", () => {
    const decision = decideAddToProfile({
      ...base,
      sessionUid: "uid-owner",
      credential: { ...credential, expires_at: "2026-09-15T00:00:00Z" },
    });
    expect(decision.kind).toBe("gone");
  });

  it("does not reveal a revoked credential to a non-owner", () => {
    const decision = decideAddToProfile({
      ...base,
      sessionUid: "uid-other",
      credential: { ...credential, status: "revoked" },
    });
    expect(decision).toEqual({ kind: "not-found" });
  });
});

describe("addToLinkedInPath", () => {
  it("builds the route path for a code", () => {
    expect(addToLinkedInPath("CAVA-2026-000001")).toBe(
      "/credentials/CAVA-2026-000001/add-to-linkedin",
    );
  });
});
