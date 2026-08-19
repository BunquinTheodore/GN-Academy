import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listPublishedCertifications } from "@/lib/db/certifications";
import { listPublishedPosts } from "@/lib/db/posts";

export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/ai-test", priority: 0.9 },
  { path: "/certifications", priority: 0.9 },
  { path: "/verify", priority: 0.8 },
  { path: "/how-it-works", priority: 0.7 },
  { path: "/blog", priority: 0.7 },
  { path: "/employers", priority: 0.6 },
  { path: "/about", priority: 0.5 },
  { path: "/start-free", priority: 0.5 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/data-request", priority: 0.3 },
];

/**
 * Individual /verify/[code] pages are deliberately absent. There could
 * eventually be tens of thousands, they are reached by code rather than by
 * browsing, and each one carries a real person's name — listing them all
 * turns a lookup tool into a directory of holders. Any that get linked from
 * outside are still indexable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;

  const [certifications, posts] = await Promise.all([
    listPublishedCertifications().catch(() => []),
    listPublishedPosts().catch(() => []),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${base}${route.path}`,
      changeFrequency: "weekly" as const,
      priority: route.priority,
    })),
    ...certifications.map((cert) => ({
      url: `${base}/certifications/${cert.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
