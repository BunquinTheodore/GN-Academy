import { describe, expect, it } from "vitest";

import {
  MAX_PITCH,
  MAX_YAW,
  dragToPose,
  keyToNudge,
  lightFromPointer,
  stepInertia,
} from "@/components/certificate-3d/rotation-math";

describe("dragToPose", () => {
  it("rotates proportionally and clamps to the allowed range", () => {
    const small = dragToPose({ yaw: 0, pitch: 0 }, 10, 0, 400);
    expect(small.yaw).toBeGreaterThan(0);
    const huge = dragToPose({ yaw: 0, pitch: 0 }, 99999, 99999, 400);
    expect(huge.yaw).toBe(MAX_YAW);
    expect(huge.pitch).toBe(MAX_PITCH);
  });

  it("does not mutate the input pose", () => {
    const pose = { yaw: 0.1, pitch: 0.1 };
    dragToPose(pose, 50, 50, 400);
    expect(pose).toEqual({ yaw: 0.1, pitch: 0.1 });
  });
});

describe("stepInertia", () => {
  it("decays velocity toward zero", () => {
    const next = stepInertia({ yaw: 0, pitch: 0 }, { yaw: 1, pitch: 0 }, 0.016);
    expect(next.velocity.yaw).toBeLessThan(1);
    expect(next.velocity.yaw).toBeGreaterThan(0);
    expect(next.pose.yaw).toBeGreaterThan(0);
  });

  it("kills velocity when it hits the clamp", () => {
    const next = stepInertia(
      { yaw: MAX_YAW, pitch: 0 },
      { yaw: 5, pitch: 0 },
      0.016,
    );
    expect(next.pose.yaw).toBe(MAX_YAW);
    expect(next.velocity.yaw).toBe(0);
  });

  it("snaps tiny velocities to zero so the loop can sleep", () => {
    const next = stepInertia({ yaw: 0, pitch: 0 }, { yaw: 1e-6, pitch: 0 }, 0.016);
    expect(next.velocity).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe("keyToNudge", () => {
  it("maps arrows and ignores other keys", () => {
    expect(keyToNudge("ArrowLeft")?.yaw).toBeLessThan(0);
    expect(keyToNudge("ArrowRight")?.yaw).toBeGreaterThan(0);
    expect(keyToNudge("ArrowUp")?.pitch).toBeLessThan(0);
    expect(keyToNudge("ArrowDown")?.pitch).toBeGreaterThan(0);
    expect(keyToNudge("a")).toBeNull();
  });
});

describe("lightFromPointer", () => {
  it("clamps normalized coordinates to the unit square", () => {
    const light = lightFromPointer(5, -5);
    expect(light.x).toBeCloseTo(lightFromPointer(1, -1).x);
    expect(light.y).toBeCloseTo(lightFromPointer(1, -1).y);
  });

  it("keeps the light in front of the paper", () => {
    expect(lightFromPointer(0, 0).z).toBeGreaterThan(0);
  });
});
