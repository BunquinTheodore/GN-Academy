import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInputActivityGate } from "@/lib/input-activity-gate";

function setup(timeoutMs = 25_000) {
  const target = new EventTarget();
  const changes: boolean[] = [];
  const gate = createInputActivityGate({
    target,
    timeoutMs,
    onChange: (active) => changes.push(active),
  });
  return { target, changes, gate };
}

describe("createInputActivityGate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays inactive until the first real input", () => {
    const { changes } = setup();
    vi.advanceTimersByTime(60_000);
    expect(changes).toEqual([]);
  });

  it.each(["pointermove", "pointerdown", "touchstart", "keydown", "wheel"])(
    "becomes active on %s",
    (type) => {
      const { target, changes } = setup();
      target.dispatchEvent(new Event(type));
      expect(changes).toEqual([true]);
    },
  );

  it("reports activity once while input keeps coming", () => {
    const { target, changes } = setup();
    for (let i = 0; i < 5; i++) {
      target.dispatchEvent(new Event("pointermove"));
      vi.advanceTimersByTime(1_000);
    }
    expect(changes).toEqual([true]);
  });

  it("goes inactive after the timeout without input, and wakes on the next input", () => {
    const { target, changes } = setup(25_000);
    target.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(24_999);
    expect(changes).toEqual([true]);
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([true, false]);
    target.dispatchEvent(new Event("touchstart"));
    expect(changes).toEqual([true, false, true]);
  });

  it("input before the timeout pushes the deadline back", () => {
    const { target, changes } = setup(10_000);
    target.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(9_000);
    target.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(9_000);
    expect(changes).toEqual([true]);
    vi.advanceTimersByTime(1_000);
    expect(changes).toEqual([true, false]);
  });

  it("ignores scroll events that did not move the page", () => {
    const { target, changes } = setup();
    target.dispatchEvent(new Event("scroll"));
    expect(changes).toEqual([]);
  });

  it("stops listening and clears its timer after dispose", () => {
    const { target, changes, gate } = setup(1_000);
    target.dispatchEvent(new Event("pointermove"));
    gate.dispose();
    vi.advanceTimersByTime(5_000);
    target.dispatchEvent(new Event("pointermove"));
    expect(changes).toEqual([true]);
  });
});
