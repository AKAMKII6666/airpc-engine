import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Studio V2 单测：仅跑 tests/，不扫业务旁平放用例。
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@studio-v2": path.resolve(__dirname, "."),
    },
  },
});
