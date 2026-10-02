import { describe, expect, it } from "vitest";

import {
  classifyDevice,
  type DeviceSignals,
} from "@/components/certificate-3d/device-eligibility";

const base: DeviceSignals = {
  hasWebGL: true,
  prefersReducedMotion: false,
  saveData: false,
};

describe("classifyDevice", () => {
  it("is ready on a capable device", () => {
    expect(classifyDevice({ ...base, deviceMemory: 8, hardwareConcurrency: 8 })).toBe(
      "ready",
    );
  });

  it("is ready when the memory and core signals are unknown", () => {
    expect(classifyDevice(base)).toBe("ready");
  });

  it("reports missing WebGL first", () => {
    expect(
      classifyDevice({ ...base, hasWebGL: false, saveData: true }),
    ).toBe("no-webgl");
  });

  it("keeps the 3D view for reduced motion, which the viewer handles itself", () => {
    expect(classifyDevice({ ...base, prefersReducedMotion: true })).toBe("ready");
  });

  it("falls back to the flat card only when Data Saver is on", () => {
    expect(classifyDevice({ ...base, saveData: true })).toBe("save-data");
  });

  it("marks low memory or few cores as low-end (still shown, at lower quality)", () => {
    expect(classifyDevice({ ...base, deviceMemory: 2 })).toBe("low-end");
    expect(classifyDevice({ ...base, hardwareConcurrency: 2 })).toBe("low-end");
    expect(classifyDevice({ ...base, deviceMemory: 4, hardwareConcurrency: 4 })).toBe(
      "ready",
    );
  });
});
