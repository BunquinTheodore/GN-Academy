import Image from "next/image";
import Link from "next/link";
import { nav, site } from "@/content/site";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The public header knows whether you are signed in, because the catalogue
 * moved behind the login: offering "Create free account" to someone who
 * already has one, with no way back to their dashboard, is the kind of small
 * wrongness that makes a site feel unmaintained.
 */
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between gap-3 px-5 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-display text-lg font-semibold tracking-tight"
        >
          {/* The mark is drawn for a black plate, so it keeps one — shrunk to
              the wordmark's height it reads as a badge rather than a logo
              pasted onto paper. */}
          <Image
            src="/brand/gn-academy-logo.png"
            alt=""
            width={512}
            height={512}
            className="size-8 rounded-md bg-black object-contain"
            priority
          />
          <span className="hidden sm:inline">{site.name}</span>
        </Link>

        <nav
          aria-label="Main"
          className="hidden min-w-0 flex-1 items-center justify-center gap-0 min-[1120px]:flex xl:gap-1"
        >
          {nav.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground xl:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" className="h-10">
              <Link href="/dashboard">My dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="h-10">
                <Link href={nav.cta.href}>
                  <span className="sm:hidden">Join free</span>
                  <span className="hidden sm:inline">{nav.cta.label}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
