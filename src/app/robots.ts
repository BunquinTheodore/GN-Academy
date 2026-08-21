import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * /admin and /dashboard are already noindex per-page; disallowing them here
 * keeps crawlers from spending budget on routes that only redirect. The
 * verification pages are deliberately open — being checkable is the point.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api/", "/certifications", "/start-free"],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
