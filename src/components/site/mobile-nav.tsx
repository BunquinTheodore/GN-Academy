"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { nav } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Mirrors the desktop nav's rule in site-nav.tsx: exact match, except a
 * link like /verify should stay active for its sub-pages (e.g.
 * /verify/[code]) too.
 */
function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The public nav is a horizontal bar that only fits from 1120px up (see
 * header.tsx). Below that — the whole phone range and the 768px tablet
 * target — this renders instead: a hamburger button that opens a slide-down
 * sheet with the same links, so Questions/Verification/Speaker booking are
 * never only reachable by scrolling to the footer. The CTA button already
 * sits next to this in the header, so it isn't repeated here.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-[1120px]:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      <div
        id="mobile-nav-panel"
        className={cn(
          "absolute inset-x-0 top-full z-40 border-b border-border bg-background shadow-lg",
          open ? "block" : "hidden",
        )}
      >
        <nav aria-label="Main" className="flex flex-col px-5 py-3">
          {nav.links.map((link) => {
            const active = isNavLinkActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-3 pl-4 text-sm font-medium tracking-[0.05em] uppercase transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent hover:text-primary",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none",
                    active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                  )}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
