"use client";

import { useEffect } from "react";
import { playClickSound } from "@/lib/click-sound";

const INTERACTIVE_SELECTOR = 'button, a, [role="button"], input[type="submit"], input[type="button"]';

/**
 * Site-wide click sound. One capture-phase listener on the document
 * covers every button/link/role=button by construction, no per-component
 * opt-in needed.
 */
export function ClickSoundProvider() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest(INTERACTIVE_SELECTOR);
      if (!trigger) return;
      if (trigger.hasAttribute("disabled") || trigger.getAttribute("aria-disabled") === "true") return;

      playClickSound();
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
