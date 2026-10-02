import type { DeviceSignals } from "./device-eligibility";

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

let webglCache: boolean | undefined;

/** Probes WebGL once, then releases the probe context right away. */
export function detectWebGL(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    webglCache = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Some privacy modes throw instead of returning null: same answer, no WebGL.
    webglCache = false;
  }
  return webglCache;
}

export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as NavigatorExtras;
  return {
    hasWebGL: detectWebGL(),
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
  };
}
