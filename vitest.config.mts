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
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**/*"],
      exclude: ["packages/*/src/**/*.spec.ts", "**/build/**"],
    },
  },
});
