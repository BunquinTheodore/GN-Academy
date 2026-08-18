import Link from "next/link";
import { nav, site } from "@/content/site";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight"
        >
          {site.name}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="h-10">
            <Link href={nav.cta.href}>{nav.cta.label}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
