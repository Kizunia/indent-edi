import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests: no database, no network (DEC-024).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: { TZ: "UTC" },
  },
});
