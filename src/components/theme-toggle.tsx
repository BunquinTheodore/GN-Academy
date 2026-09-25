"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * A three-way theme switch: light, dark, or follow the device.
 *
 * "System" is a real option rather than a hidden default, because a phone that
 * switches to dark at sunset should take the site with it, and someone who has
 * set that up should be able to see that the site is honouring it.
 *
 * Nothing renders until after mount. The server has no idea which theme the
 * visitor prefers, so drawing the highlighted state before hydration would
 * light up the wrong option and then jump.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn("h-9 w-[6.75rem] rounded-full border border-border", className)}
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border p-0.5 sm:gap-0.5",
        className,
      )}
    >
      {OPTIONS.map((option, index) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            // Roving tabindex: only the checked option sits in the page's
            // tab order, as the ARIA APG radiogroup pattern requires. Arrow
            // keys move focus (and selection) between the other options
            // instead of leaving all three independently tabbable.
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(option.value)}
            onKeyDown={(e) => {
              if (
                e.key !== "ArrowRight" &&
                e.key !== "ArrowDown" &&
                e.key !== "ArrowLeft" &&
                e.key !== "ArrowUp"
              ) {
                return;
              }
              e.preventDefault();
              const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
              const nextIndex =
                (index + (forward ? 1 : -1) + OPTIONS.length) % OPTIONS.length;
              const nextOption = OPTIONS[nextIndex];
              setTheme(nextOption.value);
              buttonRefs.current[nextIndex]?.focus();
            }}
            className={cn(
              "flex size-10 items-center justify-center rounded-full transition-colors sm:size-8",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
