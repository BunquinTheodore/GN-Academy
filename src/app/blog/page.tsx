import type { Metadata } from "next";
import Link from "next/link";
import { listPostCategories, listPublishedPosts } from "@/lib/db/posts";
import { formatDate } from "@/lib/format";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical writing on AI skills, certification, and hiring for Filipino students, VAs, freelancers, and jobseekers.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 300;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const requested = (await searchParams).category?.slice(0, 80);

  const categories = await listPostCategories().catch((): string[] => []);

  // An unknown ?category= would render an empty list under a highlighted
  // "All" chip. Resolve it against the real categories before querying.
  const activeCategory =
    requested && categories.includes(requested) ? requested : undefined;

  const posts = await listPublishedPosts(activeCategory).catch(() => null);

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Blog
        </h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          What actually works when you&apos;re building AI skills for Filipino
          work — written for people doing the job, not selling the hype.
        </p>

        {categories.length > 0 && (
          <nav aria-label="Categories" className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/blog"
              aria-current={!activeCategory ? "page" : undefined}
              className={
                !activeCategory
                  ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                  : "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:border-primary/50"
              }
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/blog?category=${encodeURIComponent(category)}`}
                aria-current={activeCategory === category ? "page" : undefined}
                className={
                  activeCategory === category
                    ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                    : "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:border-primary/50"
                }
              >
                {category}
              </Link>
            ))}
          </nav>
        )}

        {posts === null ? (
          <p className="mt-10 rounded-lg border border-destructive/40 p-6 text-sm">
            The blog couldn&apos;t load. Refresh to try again.
          </p>
        ) : posts.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-border p-8 text-muted-foreground">
            No posts here yet.
          </p>
        ) : (
          <ul className="mt-10 flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">{post.category}</Badge>
                    {post.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.published_at)}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-semibold group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
