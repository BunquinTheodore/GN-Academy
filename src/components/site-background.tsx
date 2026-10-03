"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createInputActivityGate } from "@/lib/input-activity-gate";
import {
  decideSiteBackground,
  type BackgroundCapabilities,
  type SiteBackgroundMode,
} from "@/lib/site-background-policy";

const SiteBackgroundCanvas = dynamic(() => import("./site-background-canvas"), {
  ssr: false,
});

/** How long the canvas keeps running with nobody using the page. */
const INACTIVITY_TIMEOUT_MS = 25_000;

interface NetworkInformationLike {
  readonly saveData?: boolean;
}

function readCapabilities(): BackgroundCapabilities {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: NetworkInformationLike;
  };
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
  };
}

/**
 * Start `begin` once the window has loaded, and return how to undo it.
 * Inputs before the load event are ignored so nothing here can slow the load.
 */
function afterLoad(begin: () => () => void): () => void {
  if (document.readyState === "complete") return begin();
  let stop: (() => void) | undefined;
  const onLoad = () => {
    stop = begin();
  };
  window.addEventListener("load", onLoad, { once: true });
  return () => {
    window.removeEventListener("load", onLoad);
    stop?.();
  };
}

/**
 * Sitewide animated background (ThreeUI data-pixel arc, Canvas 2D).
 *
 * Mounted once in the root layout so route changes never restart it. The
 * wrapper is decorative: aria-hidden, non-interactive, behind everything.
 * The first render is a static brand gradient on both server and client, so
 * hydration matches and there is never a blank frame; the canvas fades in
 * over it once loaded. A scrim sits above the canvas to keep body text at
 * WCAG AA contrast against the moving pixels.
 *
 * The canvas redraws thousands of cells every frame, which is real main-thread
 * work. So it only mounts after the first real input (a PageSpeed run never
 * gives one) and unmounts again, which stops its loop, after a while with no
 * input.
 */
export function SiteBackground() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [caps, setCaps] = useState<BackgroundCapabilities | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setCaps(readCapabilities());
    return afterLoad(() => {
      const gate = createInputActivityGate({
        target: window,
        timeoutMs: INACTIVITY_TIMEOUT_MS,
        onChange: setActive,
      });
      return () => gate.dispose();
    });
  }, []);

  // Until capabilities are known, assume the safe static case.
  const mode: SiteBackgroundMode = caps
    ? decideSiteBackground(pathname, caps)
    : decideSiteBackground(pathname, {
        reducedMotion: true,
        saveData: false,
        deviceMemory: undefined,
        hardwareConcurrency: undefined,
      });

  if (mode === "none") return null;

  const canvasMode = resolvedTheme === "light" ? "light" : "dark";

  return (
    <div
      aria-hidden="true"
      data-site-background={mode}
      className="gn-site-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {mode === "animated" && active ? (
        <div className="shader-frame absolute inset-0">
          <SiteBackgroundCanvas mode={canvasMode} />
        </div>
      ) : null}
      <div className="gn-site-bg-scrim absolute inset-0" />
    </div>
  );
}
