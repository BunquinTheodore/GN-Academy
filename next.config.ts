import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The certificate route reads four TTFs from src/lib/pdf/fonts with fs at
   * runtime, and nothing imports them, so they only reach the serverless
   * function if the tracer is told about them. A build without this entry does
   * currently pick them up, because the tracer can evaluate the one literal
   * `join(process.cwd(), "src", "lib", "pdf", "fonts")` the module uses; that
   * is a coincidence of how the path is written, not a guarantee. Building it
   * from a variable would silently drop the fonts and the route would throw
   * ENOENT on Vercel while working perfectly on a local build, where the whole
   * repo is on disk. This states the dependency instead of inferring it.
   */
  outputFileTracingIncludes: {
    "/api/credentials/[code]/pdf": ["./src/lib/pdf/fonts/*.ttf"],
  },
  /**
   * Image optimization is off, because on this plan it is not available.
   *
   * Vercel Hobby caps image transformations, and that cap is now exhausted:
   * every `/_next/image` request on production answers **402 Payment Required**
   * with `OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`, while the same file served
   * raw from /public answers 200. So every `next/image` on the live site was
   * broken at once, which is subtle to spot because a browser that cached an
   * optimized variant before the cap was hit keeps showing it. The landing
   * page's photo band was the giveaway: two images rendered from cache and the
   * third showed its alt text.
   *
   * Turning optimization off costs this project almost nothing, which is why it
   * is the fix rather than a workaround. Every source that goes through
   * `next/image` here is a local file in /public that is already the right
   * size: the logo is 24 kB, the GCash QR 76 kB, and the landing photography
   * was downloaded pre-cropped through the Pexels API at the exact dimensions
   * its containers use, 54 to 76 kB each. There is no meaningful transformation
   * left to perform. User uploads are not affected either way: avatars and
   * portfolio images are compressed to WebP in the browser before upload and
   * render through a plain <img>.
   *
   * `next/image` is still doing its main job. Width, height and `fill` still
   * reserve layout, so nothing shifts as images arrive; only the resizing proxy
   * is gone.
   *
   * Revisit if the plan changes. See HANDOFF.md: Hobby's terms also bar
   * commercial use, so this is the second limit of that plan to bite.
   */
  images: {
    unoptimized: true,
  },
  experimental: {
    // The radix-ui umbrella package is a barrel file; without this, one
    // <Button> import drags a ~244 kB shared chunk onto every page.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
