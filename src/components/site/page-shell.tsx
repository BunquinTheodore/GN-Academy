import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export function PageShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {/*
        Body copy is foreground, not muted.

        Every page using this shell (/about, /privacy, /terms, /how-it-works,
        /companies) had its entire body set in --muted-foreground. That passes
        AA at 5.6:1, so it was never an accessibility failure, but grey is a
        signal: it means "this is secondary". Applying it to a whole page of
        prose tells the reader that none of it is the main thing, and reading
        several hundred words at reduced emphasis is tiring. Muted belongs on
        captions and asides, which set it themselves.

        The measure is capped at 68 characters. max-w-3xl alone ran to roughly
        90 characters a line at the new body size, and the eye loses its place
        on the return sweep well before that.
      */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-balance">
          {title}
        </h1>
        <div className="mt-8 flex max-w-[68ch] flex-col gap-5 text-base leading-[1.7] text-foreground">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
