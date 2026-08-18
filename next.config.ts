import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The radix-ui umbrella package is a barrel file; without this, one
    // <Button> import drags a ~244 kB shared chunk onto every page.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
