import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["packages/**/*.spec.ts"],
    pool: "forks",
    setupFiles: ["reflect-metadata"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
