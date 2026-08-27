import type { Metadata } from "next";
import { BookOpenCheck, Layers3, Search } from "lucide-react";
import { listPublishedPosts } from "@/lib/db/posts";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { GuideCatalog } from "./guide-catalog";

export const metadata: Metadata = {
  title: "Short Guides",
  description:
    "Quick, practical GN Academy guides for tools, platforms, and digital work.",
  alternates: { canonical: "/short-guides" },
};

export const revalidate = 300;

export default async function ShortGuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const filters = await searchParams;
  const guides = await listPublishedPosts(undefined, "short_guide").catch(
    () => null,
  );

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                Learn it in one sitting
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold text-balance sm:text-5xl">
                Short Guides
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Straightforward steps for the tools and platforms people use
                to learn, work, and earn online.
              </p>
            </div>

            <div className="relative mx-auto hidden h-56 w-full max-w-md sm:block" aria-hidden>
              <div className="absolute top-4 right-10 flex size-36 rotate-3 items-center justify-center rounded-3xl border border-border bg-card shadow-lg">
                <BookOpenCheck className="size-16 text-primary" />
              </div>
              <div className="absolute bottom-3 left-10 flex size-28 -rotate-6 items-center justify-center rounded-3xl bg-brand text-brand-foreground shadow-lg">
                <Search className="size-12" />
              </div>
              <div className="absolute right-0 bottom-0 flex size-24 rotate-6 items-center justify-center rounded-3xl bg-brand-cyan text-ink shadow-lg">
                <Layers3 className="size-11" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
          {guides === null ? (
            <p className="rounded-xl border border-destructive/40 bg-card p-6 text-sm">
              Short guides could not load. Refresh to try again.
            </p>
          ) : guides.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-8 text-muted-foreground">
              No short guides have been published yet.
            </p>
          ) : (
            <GuideCatalog
              guides={guides}
              initialQuery={filters.q?.slice(0, 80)}
              initialCategory={filters.category?.slice(0, 80)}
            />
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
