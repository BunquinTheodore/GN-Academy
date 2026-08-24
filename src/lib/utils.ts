import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about font sizes this project invented, and
 * the failure when it is not told is silent.
 *
 * `text-micro` is a custom size in `@theme` (globals.css). tailwind-merge does
 * not read the Tailwind config: it recognises class groups from its own built
 * in list, and an unknown `text-*` falls into the text COLOUR group. So in a
 * `cn("text-micro ...", "text-white/70")` the two look like competing colours,
 * the later one wins, and the size is dropped from the output entirely.
 *
 * Measured on the live page before this fix: the credential card's eyebrow
 * rendered with `class="tracking-[0.18em] uppercase text-white/70"`, no size
 * class at all, inheriting 16px where 12px was intended. It failed only where
 * `cn()` was used with a colour as well, so the same token worked in plain
 * className strings a few lines away, which is exactly the kind of
 * inconsistency nobody tracks down from a screenshot.
 *
 * Any future custom font size has to be added here too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
