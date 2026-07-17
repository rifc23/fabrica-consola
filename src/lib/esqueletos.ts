/**
 * Esqueletos por stack (§ backlog "esqueletos por stack"). El template
 * `rifc23/fabrica-agentes-template` nace con un esqueleto Next.js mínimo (ver Errores Conocidos
 * de su CLAUDE.md). Si el usuario elige Vite/Estático en el formulario, el repo nacería con un
 * mismatch (esqueleto Next + proyecto Vercel `nextjs`) — este módulo resuelve ese mismatch de
 * forma pura: qué framework de Vercel usar, y qué archivos borrar/sembrar para reemplazar el
 * esqueleto Next por uno Vite equivalente (mismo invariante de gate: lint/build/test:run).
 */

/** Texto libre del campo "stack" del formulario → familia de esqueleto real. */
export function stackEfectivo(stack: string): "next" | "vite" {
  const s = stack.toLowerCase();
  if (s.includes("vite") || s.includes("estático") || s.includes("estatico") || s.includes("github pages")) {
    return "vite";
  }
  return "next";
}

/** Preset de framework a declarar en el proyecto Vercel (`POST /v9/projects`). */
export function frameworkVercel(stack: string): "nextjs" | "vite" {
  return stackEfectivo(stack) === "vite" ? "vite" : "nextjs";
}

/**
 * El stack "Otro" no tiene esqueleto propio en v1: se queda con el esqueleto Next del template
 * como placeholder y se estaciona una tarea manual para que el arquitecto-stack lo instale en
 * Fase 1. Distinto de `stackEfectivo`, que solo distingue next/vite (Otro cae en "next").
 */
export function esStackOtro(stack: string): boolean {
  return stack.toLowerCase().includes("otro");
}

/**
 * Tarea manual estacionada en `docs/TAREAS-MANUALES.md` del repo nuevo cuando el stack elegido es
 * "Otro": el esqueleto Next del template se queda como placeholder (nunca deploya roto) hasta que
 * el arquitecto-stack lo reemplace en Fase 1.
 */
export function agregarTareaManualStackOtro(tareasMd: string, stackTexto: string): string {
  const bloque = `
## 🟠 N. Instalar el stack "${stackTexto}" elegido para este proyecto

**Qué:** el formulario "Nuevo proyecto" de fabrica-consola no tiene un esqueleto propio para el
stack "Otro" — el repo nació con el esqueleto Next.js del template como placeholder para no
deployar roto.
**Cómo:** El stack 'Otro' requiere que el arquitecto-stack lo instale en Fase 1 (y ajustar el
framework del proyecto Vercel).
**Tiempo:** depende del stack.
`;
  return `${tareasMd.replace(/\n+$/, "")}\n${bloque}`;
}

export interface ArchivoEsqueleto {
  ruta: string;
  contenido: string;
}

/**
 * Rutas del esqueleto Next del template que deben eliminarse al sembrar Vite en su lugar.
 * `package.json` y `tsconfig.json` NO están aquí: se SOBREESCRIBEN (conservan el path pero su
 * contenido pasa a ser el de Vite), nunca se borran.
 */
export function archivosABorrarDeNext(): string[] {
  return [
    "next.config.ts",
    "eslint.config.mjs",
    "vitest.config.ts",
    "package-lock.json",
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/lib/esqueleto.ts",
    "src/lib/esqueleto.test.ts",
  ];
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa lo mínimo para insertar `texto` dentro de un template literal (backtick) de JS. */
function escaparParaTemplateLiteral(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/**
 * Esqueleto Vite + vanilla TypeScript MÍNIMO, con el mismo invariante de gate que el esqueleto
 * Next del template: `dev`/`build`/`lint`/`test:run` corribles desde el día 0 (Errores Conocidos
 * del CLAUDE.md del template).
 */
export function archivosEsqueletoVite(nombreProyecto: string): ArchivoEsqueleto[] {
  const nombreHtml = escaparHtml(nombreProyecto);
  const nombreJs = escaparParaTemplateLiteral(nombreProyecto);

  const packageJson = {
    name: "proyecto-fabrica",
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc --noEmit && vite build",
      lint: "tsc --noEmit",
      "test:run": "vitest run",
    },
    devDependencies: {
      vite: "^7.1.5",
      typescript: "^5",
      vitest: "^4.1.10",
    },
  };

  const viteConfig = `import { defineConfig } from "vite";

export default defineConfig({});
`;

  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      lib: ["ES2020", "DOM"],
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      isolatedModules: true,
      resolveJsonModule: true,
    },
    include: ["src"],
  };

  const indexHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${nombreHtml} — Fábrica de agentes</title>
  </head>
  <body style="margin: 0; min-height: 100dvh; background: #0a0a0a; color: #ededed; font-family: system-ui, sans-serif;">
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

  const mainTs = `import { estadoFabrica } from "./lib/esqueleto";

// Placeholder del esqueleto andante: la routine del proyecto lo reemplaza con el producto real
// en su primer tick ("primer tick = producto funcional"). Mantiene el deploy de Vercel en verde
// y el gate corrible desde el día 0.
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = \`
    <main style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 1.5rem; text-align: center;">
      <span style="font-size: 3rem" aria-hidden="true">🏭</span>
      <h1 style="margin: 0; font-size: 1.4rem;">🏭 ${nombreJs} — proyecto \${estadoFabrica()} por la Fábrica de agentes</h1>
      <p style="margin: 0; max-width: 34rem; opacity: 0.75; line-height: 1.5;">
        La Fábrica de agentes está construyendo este proyecto. El primer tick de su routine
        entregará la idea principal funcionando — el avance vive en <code>docs/backlog.md</code> y
        los reportes en <code>docs/reportes/</code>.
      </p>
    </main>
  \`;
}
`;

  const esqueletoTs = `/** Estado del placeholder del esqueleto andante (lo reemplaza el producto real en el primer tick). */
export function estadoFabrica(): string {
  return "en construcción";
}
`;

  const esqueletoTestTs = `import { describe, expect, it } from "vitest";
import { estadoFabrica } from "./esqueleto";

describe("esqueleto andante", () => {
  it("reporta el estado del placeholder", () => {
    expect(estadoFabrica()).toBe("en construcción");
  });
});
`;

  return [
    { ruta: "package.json", contenido: `${JSON.stringify(packageJson, null, 2)}\n` },
    { ruta: "vite.config.ts", contenido: viteConfig },
    { ruta: "tsconfig.json", contenido: `${JSON.stringify(tsconfig, null, 2)}\n` },
    { ruta: "index.html", contenido: indexHtml },
    { ruta: "src/main.ts", contenido: mainTs },
    { ruta: "src/lib/esqueleto.ts", contenido: esqueletoTs },
    { ruta: "src/lib/esqueleto.test.ts", contenido: esqueletoTestTs },
  ];
}
