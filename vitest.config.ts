import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next.js turns `import "server-only"` into a no-op at build time; it
      // throws in a plain Node environment, which Vitest is.
      "server-only": path.resolve(__dirname, "tests/unit/mocks/server-only.ts"),
    },
  },
});
