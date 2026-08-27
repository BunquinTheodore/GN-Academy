"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import type { PostSummary } from "@/lib/db/posts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const ALL = "All";

export function GuideCatalog({
  guides,
  initialQuery = "",
  initialCategory = ALL,
}: {
  guides: PostSummary[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const categories = useMemo(
    () => [...new Set(guides.map((guide) => guide.category))].sort(),
    [guides],
  );
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(
    categories.includes(initialCategory) ? initialCategory : ALL,
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== ALL) params.set("category", category);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [category, query]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return guides.filter((guide) => {
      const categoryMatches = category === ALL || guide.category === category;
      const searchMatches =
        !needle ||
        `${guide.title} ${guide.excerpt ?? ""} ${guide.category}`
          .toLocaleLowerCase()
          .includes(needle);
      return categoryMatches && searchMatches;
    });
  }, [category, guides, query]);

  return (
    <>
      <div className="relative mt-8 max-w-2xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search short guides"
          aria-label="Search short guides"
          className="h-12 rounded-full bg-card pl-11"
        />
      </div>

      <nav aria-label="Guide categories" className="mt-5 flex flex-wrap gap-2">
        {[ALL, ...categories].map((item) => {
          const active = category === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item)}
              className={
                active
                  ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                  : "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-primary/50"
              }
            >
              {item}
            </button>
          );
        })}
      </nav>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-display text-lg font-semibold">No guides found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another keyword or choose All.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((guide) => (
            <li key={guide.id} className="h-full">
              <Link
                href={`/short-guides/${guide.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,var(--color-accent),var(--color-secondary))]">
                  {guide.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={guide.cover_image_url}
                      alt=""
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                      <BookOpen className="size-9 text-primary" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <Badge variant="secondary" className="w-fit">
                    {guide.category}
                  </Badge>
                  <h2 className="mt-3 font-display text-xl font-semibold text-balance group-hover:text-primary">
                    {guide.title}
                  </h2>
                  {guide.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {guide.excerpt}
                    </p>
                  )}
                  <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium group-hover:border-primary group-hover:text-primary">
                    Read short guide
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
