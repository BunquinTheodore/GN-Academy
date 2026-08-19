import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft } from "lucide-react";
import { getPublishedPostBySlug, listPublishedPosts } from "@/lib/db/posts";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await listPublishedPosts().catch(() => []);
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug).catch(() => null);
  if (!post) return { title: "Post not found", robots: { index: false } };

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.published_at ?? undefined,
      authors: [post.author_name],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug).catch(() => null);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author_name },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: env.NEXT_PUBLIC_SITE_URL,
    },
    mainEntityOfPage: `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Blog
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{post.category}</Badge>
          {post.published_at && (
            <span className="text-xs text-muted-foreground">
              {formatDate(post.published_at)}
            </span>
          )}
        </div>

        <h1 className="mt-3 font-display text-3xl font-semibold text-balance">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          By {post.author_name}
        </p>

        <article className="mt-10 flex flex-col gap-4 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
          {post.content_mdx ? (
            <MDXRemote source={post.content_mdx} />
          ) : (
            <p className="text-muted-foreground">
              This post has no body yet.
            </p>
          )}
        </article>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Wondering where you actually stand? The AI Readiness Test scores
            you in ten minutes and tells you what to work on next.
          </p>
          <Button asChild className="mt-3">
            <Link href="/ai-test">Take the free test</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
