import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@allcli/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@allcli/providers": resolve(__dirname, "packages/providers/src/index.ts"),
      "@allcli/orchestrator": resolve(__dirname, "packages/orchestrator/src/index.ts"),
      "@allcli/cli": resolve(__dirname, "packages/cli/src/index.tsx")
    }
  },
  test: {
    include: ["packages/**/tests/**/*.test.ts"],
    environment: "node"
  }
});
