import { defineConfig } from "vitest/config";

// Default export: Vitest only reads a config file's default export.
export default defineConfig({
  // Resolve the "@/*" import alias from tsconfig.json, as Next.js does.
  resolve: { tsconfigPaths: true },
});
