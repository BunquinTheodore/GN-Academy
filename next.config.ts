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
  experimental: {
    // The radix-ui umbrella package is a barrel file; without this, one
    // <Button> import drags a ~244 kB shared chunk onto every page.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
