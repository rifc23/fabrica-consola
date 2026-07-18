import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Excluye los worktrees de subagentes (.claude/worktrees/agent-*/), que son
    // copias completas del repo: sin esto, vitest recolecta también sus
    // src/**/*.test.ts y duplica todos los tests si el worktree sigue presente
    // al correr `npm run test:run` desde el checkout principal.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
