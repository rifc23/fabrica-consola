import { describe, it, expect } from "vitest";
import {
  stackEfectivo,
  frameworkVercel,
  esStackOtro,
  archivosEsqueletoVite,
  archivosABorrarDeNext,
  agregarTareaManualStackOtro,
} from "./esqueletos";

describe("stackEfectivo", () => {
  it("mapea recomiéndame/Next.js/Otro a next", () => {
    expect(stackEfectivo("🏭 Recomiéndame (menor costo)")).toBe("next");
    expect(stackEfectivo("Next.js + Vercel")).toBe("next");
    expect(stackEfectivo("Otro")).toBe("next");
    expect(stackEfectivo("Otro (sin especificar)")).toBe("next");
  });

  it("mapea Vite/Estático a vite", () => {
    expect(stackEfectivo("Vite + Vercel")).toBe("vite");
    expect(stackEfectivo("Estático (GitHub Pages)")).toBe("vite");
  });

  it("es insensible a mayúsculas/minúsculas", () => {
    expect(stackEfectivo("VITE + VERCEL")).toBe("vite");
    expect(stackEfectivo("estático (github pages)")).toBe("vite");
  });
});

describe("frameworkVercel", () => {
  it("devuelve nextjs para el stack Next/recomiéndame/otro", () => {
    expect(frameworkVercel("🏭 Recomiéndame (menor costo)")).toBe("nextjs");
    expect(frameworkVercel("Next.js + Vercel")).toBe("nextjs");
    expect(frameworkVercel("Otro")).toBe("nextjs");
  });

  it("devuelve vite para el stack Vite/Estático", () => {
    expect(frameworkVercel("Vite + Vercel")).toBe("vite");
    expect(frameworkVercel("Estático (GitHub Pages)")).toBe("vite");
  });
});

describe("esStackOtro", () => {
  it("detecta el stack Otro sin importar mayúsculas ni texto adicional", () => {
    expect(esStackOtro("Otro")).toBe(true);
    expect(esStackOtro("otro (sin especificar)")).toBe(true);
    expect(esStackOtro("OTRO: Ruby on Rails")).toBe(true);
  });

  it("no marca los demás stacks como Otro", () => {
    expect(esStackOtro("Next.js + Vercel")).toBe(false);
    expect(esStackOtro("Vite + Vercel")).toBe(false);
    expect(esStackOtro("🏭 Recomiéndame (menor costo)")).toBe(false);
  });
});

describe("archivosEsqueletoVite", () => {
  const archivos = archivosEsqueletoVite("Mi Calculadora");
  const porRuta = Object.fromEntries(archivos.map((a) => [a.ruta, a.contenido]));

  it("incluye package.json con los 4 scripts exactos del gate", () => {
    const pkg = JSON.parse(porRuta["package.json"]);
    expect(pkg.scripts).toEqual({
      dev: "vite",
      build: "tsc --noEmit && vite build",
      lint: "tsc --noEmit",
      "test:run": "vitest run",
    });
  });

  it("las devDependencies de package.json son solo vite, typescript y vitest", () => {
    const pkg = JSON.parse(porRuta["package.json"]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(["typescript", "vite", "vitest"]);
    expect(pkg.dependencies).toBeUndefined();
  });

  it("index.html referencia src/main.ts y embebe el nombre del proyecto", () => {
    expect(porRuta["index.html"]).toContain('src="/src/main.ts"');
    expect(porRuta["index.html"]).toContain("Mi Calculadora");
  });

  it("src/main.ts usa estadoFabrica() y embebe el nombre del proyecto", () => {
    expect(porRuta["src/main.ts"]).toContain("estadoFabrica()");
    expect(porRuta["src/main.ts"]).toContain("Mi Calculadora");
    expect(porRuta["src/main.ts"]).toContain('import { estadoFabrica } from "./lib/esqueleto";');
  });

  it("tsconfig.json es strict, sin JSX y limitado a src", () => {
    const tsconfig = JSON.parse(porRuta["tsconfig.json"]);
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.jsx).toBeUndefined();
    expect(tsconfig.include).toEqual(["src"]);
  });

  it("incluye src/lib/esqueleto.ts y su test vitest", () => {
    expect(porRuta["src/lib/esqueleto.ts"]).toContain("export function estadoFabrica");
    expect(porRuta["src/lib/esqueleto.test.ts"]).toContain("describe(");
    expect(porRuta["src/lib/esqueleto.test.ts"]).toContain("estadoFabrica()).toBe(\"en construcción\")");
  });

  it("escapa nombres con backticks/${} para no romper el template literal generado", () => {
    const conNombreRaro = archivosEsqueletoVite("Proyecto `${malicioso}`");
    const mainTs = conNombreRaro.find((a) => a.ruta === "src/main.ts")!.contenido;
    expect(mainTs).toContain("Proyecto \\`\\${malicioso}\\`");
    // El template literal de app.innerHTML sigue delimitado por exactamente 2 backticks propios
    // (los demás, si los hay, vienen escapados con \\` y no cuentan como delimitadores).
    const soloDelimitadores = mainTs.match(/(?<!\\)`/g) ?? [];
    expect(soloDelimitadores).toHaveLength(2);
  });
});

describe("archivosABorrarDeNext", () => {
  const rutas = archivosABorrarDeNext();

  it("no incluye package.json ni tsconfig.json (se sobreescriben, no se borran)", () => {
    expect(rutas).not.toContain("package.json");
    expect(rutas).not.toContain("tsconfig.json");
  });

  it("incluye los archivos exclusivos de Next del esqueleto del template", () => {
    expect(rutas).toEqual(
      expect.arrayContaining([
        "next.config.ts",
        "eslint.config.mjs",
        "vitest.config.ts",
        "package-lock.json",
        "src/app/layout.tsx",
        "src/app/page.tsx",
      ]),
    );
  });
});

describe("agregarTareaManualStackOtro", () => {
  it("agrega el bloque con el stack y la instrucción para el arquitecto-stack", () => {
    const resultado = agregarTareaManualStackOtro("# Tareas manuales\n\n- algo previo\n", "Otro: Ruby on Rails");
    expect(resultado).toContain("- algo previo");
    expect(resultado).toContain("Otro: Ruby on Rails");
    expect(resultado).toContain("arquitecto-stack lo instale en Fase 1");
  });
});
