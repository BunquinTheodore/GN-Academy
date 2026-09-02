import { describe, expect, it } from "vitest";
import { getRecommendation } from "@/content/recommendations";

describe("getRecommendation", () => {
  it("recommends the free AI Foundations course for beginner", () => {
    const rec = getRecommendation("beginner", undefined);
    expect(rec.certification.slug).toBe("ai-foundations");
    expect(rec.tone).toBe("standard");
  });

  it("recommends the free AI Foundations course for developing", () => {
    const rec = getRecommendation("developing", undefined);
    expect(rec.certification.slug).toBe("ai-foundations");
  });

  it("recommends the paid CAVA certification for jobReady", () => {
    const rec = getRecommendation("jobReady", undefined);
    expect(rec.certification.slug).toBe("certified-ai-virtual-assistant");
    expect(rec.tone).toBe("standard");
  });

  it("recommends the paid CAVA certification with urgent tone for advanced (top performers)", () => {
    const rec = getRecommendation("advanced", undefined);
    expect(rec.certification.slug).toBe("certified-ai-virtual-assistant");
    expect(rec.tone).toBe("urgent");
  });

  it("flavors the pitch by stated goal: remote", () => {
    const remote = getRecommendation("advanced", "remote");
    const exploring = getRecommendation("advanced", "exploring");
    expect(remote.pitch).not.toBe(exploring.pitch);
    expect(remote.pitch.toLowerCase()).toContain("remote");
  });

  it("flavors the pitch by stated goal: freelance", () => {
    const freelance = getRecommendation("jobReady", "freelance");
    const remote = getRecommendation("jobReady", "remote");
    expect(freelance.pitch).not.toBe(remote.pitch);
    expect(freelance.pitch.toLowerCase()).toContain("client");
  });

  it("falls back to a sensible pitch when no intent answer is present", () => {
    const rec = getRecommendation("beginner", undefined);
    expect(rec.pitch.length).toBeGreaterThan(0);
  });

  it("points the CTA at the recommended certification's own page", () => {
    const rec = getRecommendation("jobReady", undefined);
    expect(rec.cta.href).toBe(
      "/signup?next=%2Fcertifications%2Fcertified-ai-virtual-assistant",
    );
  });
});
