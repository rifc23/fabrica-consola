import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next, ampliados a `**/` para que
    // hagan match sin importar la profundidad (worktrees de agentes viven
    // en subdirectorios como `.claude/worktrees/agent-*/` y generan su
    // propio `.next/` al correr `npm run build` ahí — ver CLAUDE.md
    // "Errores Conocidos" 2026-07-18).
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
    // Nunca lintear árboles de worktrees de agentes desde el checkout
    // principal, contengan o no artefactos de build.
    ".claude/**",
  ]),
]);

export default eslintConfig;
