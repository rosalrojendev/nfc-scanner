import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Pure-function tests don't need a browser env; node is fast and avoids
    // hauling in jsdom for every run. Switch to "jsdom" later if you add
    // React Testing Library smoke tests.
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.{ts,tsx}"],
    // Skip the Next.js app folder so test scanning doesn't accidentally
    // execute route handlers / "use client" boundaries.
    exclude: ["node_modules", ".next", "app/**", "prisma/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
