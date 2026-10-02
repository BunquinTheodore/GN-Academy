import { describe, expect, it } from "vitest";
import {
  decideSiteBackground,
  type BackgroundCapabilities,
} from "@/lib/site-background-policy";

const capable: BackgroundCapabilities = {
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
};

describe("decideSiteBackground", () => {
  it("animates on a default page for a capable device", () => {
    expect(decideSiteBackground("/", capable)).toBe("animated");
    expect(decideSiteBackground("/about", capable)).toBe("animated");
    expect(decideSiteBackground("/verify/CAVA-2026-000001", capable)).toBe(
      "animated",
    );
  });

  it.each([
    "/dashboard",
    "/dashboard/credentials",
    "/dashboard/learn/abc",
    "/dashboard/assessments/some-exam",
    "/admin",
    "/admin/assignments",
    "/login",
    "/signup",
    "/forgot-password",
    "/api/anything",
  ])("returns none on excluded route %s", (path) => {
    expect(decideSiteBackground(path, capable)).toBe("none");
  });

  it("does not exclude routes that merely share a prefix", () => {
    expect(decideSiteBackground("/dashboards-info", capable)).toBe("animated");
    expect(decideSiteBackground("/administration", capable)).toBe("animated");
  });

  it("tolerates a null pathname and trailing slashes", () => {
    expect(decideSiteBackground(null, capable)).toBe("none");
    expect(decideSiteBackground("/login/", capable)).toBe("none");
  });

  it("falls back to static for reduced motion", () => {
    expect(
      decideSiteBackground("/", { ...capable, reducedMotion: true }),
    ).toBe("static");
  });

  it("falls back to static when Save-Data is on", () => {
    expect(decideSiteBackground("/", { ...capable, saveData: true })).toBe(
      "static",
    );
  });

  it("falls back to static on low memory or few cores", () => {
    expect(decideSiteBackground("/", { ...capable, deviceMemory: 2 })).toBe(
      "static",
    );
    expect(decideSiteBackground("/", { ...capable, deviceMemory: 0.5 })).toBe(
      "static",
    );
    expect(
      decideSiteBackground("/", { ...capable, hardwareConcurrency: 2 }),
    ).toBe("static");
  });

  it("treats unknown capabilities as capable", () => {
    expect(
      decideSiteBackground("/", {
        reducedMotion: false,
        saveData: false,
        deviceMemory: undefined,
        hardwareConcurrency: undefined,
      }),
    ).toBe("animated");
  });

  it("excluded routes win over every capability flag", () => {
    expect(
      decideSiteBackground("/dashboard", { ...capable, reducedMotion: true }),
    ).toBe("none");
  });
});
