"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The FAQ accordion, paired with "How it works" in the combined section.
 *
 * A plain `<details>` tree would have been enough for the content, but the
 * combined section sits an accordion next to a three-step ladder, and a
 * client-driven single-open-at-a-time accordion reads as considered there in
 * a way that a column of native disclosure triangles does not. Everything
 * still renders as real text in the server HTML — only the open/closed state
 * is client-side, so nothing here can leave a question stuck invisible.
 */
export function FaqAccordion({
  items,
}: {
  items: readonly { readonly q: string; readonly a: string }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border/70">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium sm:text-base"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                    open && "rotate-180 text-primary",
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-all duration-300 ease-out",
                open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
