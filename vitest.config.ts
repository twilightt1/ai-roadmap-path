import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: false,
    exclude: [...configDefaults.exclude, "e2e/**", "**/.worktrees/**", "**/.next/**", "public/pagefind/**"],
  },
});
