import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Integration tests run against the MySQL test database only (DEC-024).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    env: { TZ: "UTC" },
    // One DB, so run files one after another.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
