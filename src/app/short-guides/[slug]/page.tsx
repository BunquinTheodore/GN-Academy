import type { ComponentPropsWithoutRef } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import {
  getPublishedPostBySlug,
  listPublishedPosts,
} from "@/lib/db/posts";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";

export const revalidate = 300;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const guides = await listPublishedPosts(undefined, "short_guide").catch(
    () => [],
  );
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedPostBySlug(slug, "short_guide").catch(
    () => null,
  );
  if (!guide) return { title: "Guide not found", robots: { index: false } };

  return {
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: { canonical: `/short-guides/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.excerpt ?? undefined,
      publishedTime: guide.published_at ?? undefined,
      modifiedTime: guide.updated_at,
      authors: [guide.author_name],
      images: guide.cover_image_url ? [guide.cover_image_url] : undefined,
    },
  };
}

function GuideLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  const external = href?.startsWith("http://") || href?.startsWith("https://");
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
        <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

function GuideImage(props: ComponentPropsWithoutRef<"img">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ""} loading="lazy" />;
}

export default async function ShortGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getPublishedPostBySlug(slug, "short_guide").catch(
    () => null,
  );
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt ?? undefined,
    image: guide.cover_image_url ?? undefined,
    datePublished: guide.published_at ?? guide.created_at,
    dateModified: guide.updated_at,
    author: { "@type": "Organization", name: guide.author_name },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: env.NEXT_PUBLIC_SITE_URL,
    },
    mainEntityOfPage: `${env.NEXT_PUBLIC_SITE_URL}/short-guides/${guide.slug}`,
  };

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link
          href="/short-guides"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Short Guides
        </Link>

        {guide.cover_image_url && (
          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={guide.cover_image_url}
              alt=""
              className="max-h-[28rem] w-full object-cover"
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{guide.category}</Badge>
          <span className="text-xs text-muted-foreground">
            Last updated {formatDate(guide.updated_at)}
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">
          {guide.title}
        </h1>
        {guide.excerpt && (
          <p className="mt-4 text-lg text-muted-foreground">{guide.excerpt}</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          By {guide.author_name}
        </p>

        {guide.disclosure && (
          <aside className="mt-8 flex gap-3 rounded-xl border border-primary/30 bg-accent p-4 text-sm">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>{guide.disclosure}</p>
          </aside>
        )}

        <article className="mt-10 flex flex-col gap-5 text-[1.0625rem] leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-muted [&_blockquote]:px-5 [&_blockquote]:py-3 [&_h2]:mt-7 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_img]:bg-card [&_img]:object-contain [&_li]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
          {guide.content_mdx ? (
            <MDXRemote
              source={guide.content_mdx}
              components={{ a: GuideLink, img: GuideImage }}
            />
          ) : (
            <p className="text-muted-foreground">
              This guide has no body yet.
            </p>
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
