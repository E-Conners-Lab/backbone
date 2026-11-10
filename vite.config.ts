import { defineConfig } from "vitest/config";

// base "./" keeps every URL relative so dist/ can be served from any sub-path.
export default defineConfig({
  base: "./",
  build: { outDir: "dist", emptyOutDir: true, target: "es2022", assetsInlineLimit: 0 },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
