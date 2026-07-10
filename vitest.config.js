import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.mjs"],
    include: ["tests/**/*.test.mjs"],
  },
});
