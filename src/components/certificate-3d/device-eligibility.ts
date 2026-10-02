/**
 * Decides whether the 3D view is offered, from a bag of device signals.
 * Pure on purpose: the browser probing lives in `read-device-signals.ts`.
 */

export type DeviceSignals = {
  hasWebGL: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  /** navigator.deviceMemory in GB, when the browser exposes it. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

/**
 * The 3D certificate is the default view, so it shows on every device that can
 * run it.
 * - ready, low-end: show the 3D view (the viewer lowers texture quality on
 *   low-end devices, and under reduced motion it drops the idle float and
 *   inertia but stays 3D).
 * - no-webgl, save-data: show the flat certificate with a short message. Data
 *   Saver is an explicit request to use less data, so it is respected.
 */
export type DeviceClass = "ready" | "low-end" | "no-webgl" | "save-data";

const LOW_MEMORY_GB = 2;
const LOW_CORES = 2;

export function classifyDevice(signals: DeviceSignals): DeviceClass {
  if (!signals.hasWebGL) return "no-webgl";
  if (signals.saveData) return "save-data";
  const lowMemory =
    signals.deviceMemory !== undefined && signals.deviceMemory <= LOW_MEMORY_GB;
  const fewCores =
    signals.hardwareConcurrency !== undefined &&
    signals.hardwareConcurrency <= LOW_CORES;
  return lowMemory || fewCores ? "low-end" : "ready";
}

export const UNAVAILABLE_MESSAGES: Readonly<Record<DeviceClass, string>> = {
  ready: "",
  "low-end": "",
  "no-webgl":
    "The 3D view needs WebGL, which this browser does not offer. Showing the flat certificate.",
  "save-data":
    "The 3D view is off while Data Saver is on. Showing the flat certificate.",
};
