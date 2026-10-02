"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  decideSiteBackground,
  type BackgroundCapabilities,
  type SiteBackgroundMode,
} from "@/lib/site-background-policy";

const SiteBackgroundCanvas = dynamic(() => import("./site-background-canvas"), {
  ssr: false,
});

const IDLE_TIMEOUT_MS = 2000;

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

/** Run after first paint so the animation never competes with LCP. */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 200);
  return () => window.clearTimeout(id);
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
 */
export function SiteBackground() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [caps, setCaps] = useState<BackgroundCapabilities | null>(null);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    setCaps(readCapabilities());
    return whenIdle(() => setIdle(true));
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
      {mode === "animated" && idle ? (
        <div className="shader-frame absolute inset-0">
          <SiteBackgroundCanvas mode={canvasMode} />
        </div>
      ) : null}
      <div className="gn-site-bg-scrim absolute inset-0" />
    </div>
  );
}
