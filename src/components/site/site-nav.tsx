"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Whether a nav link should read as "current page". Most routes need an
 * exact match, but a link like /verify should stay lit while a visitor is
 * on a sub-page such as /verify/[code] — otherwise the nav goes dark the
 * moment they're looking at the very thing it pointed them to. The root
 * link ("/", if it's ever added here) is the one exception that always
 * needs an exact match, since every route starts with "/".
 */
function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop, top-bar nav for the public site. Split out from header.tsx so it
 * can be a client component (active-route styling needs usePathname) while
 * the header itself stays a server component that reads the session.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="hidden min-w-0 flex-1 items-center justify-center gap-0 min-[1120px]:flex xl:gap-1"
    >
      {nav.links.map((link) => {
        const active = isNavLinkActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative shrink-0 rounded-md px-3 py-2 text-sm font-medium tracking-[0.1em] whitespace-nowrap uppercase transition-colors xl:px-4",
              active
                ? "text-primary"
                : "text-foreground hover:bg-accent hover:text-primary",
            )}
          >
            {link.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none xl:inset-x-4",
                active
                  ? "scale-x-100 opacity-100"
                  : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-40",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
