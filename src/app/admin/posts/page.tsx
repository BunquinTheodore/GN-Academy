import type { Metadata } from "next";
import Link from "next/link";
import { listAllPosts } from "@/lib/db/posts";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await listAllPosts().catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Blog</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Posts live in the database, so publishing one needs no deploy.
            Drafts are invisible to everyone but this screen.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">New post</Link>
        </Button>
      </div>

      {posts === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load posts. Refresh to try again.
        </p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-muted-foreground">
          No posts yet. Write the first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/admin/posts/${post.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50"
              >
                <div>
                  <p className="font-medium">{post.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    /blog/{post.slug} · {post.category}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {post.published_at
                      ? formatDate(post.published_at)
                      : `drafted ${formatDate(post.created_at)}`}
                  </span>
                  <Badge
                    variant={
                      post.status === "published" ? "default" : "secondary"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
