import { describe, it, expect } from "vitest";
import {
  slugificar,
  validarFormulario,
  generarSpecsMd,
  agregarTareaManualVercel,
  featuresBlueprintGem,
  generarSpecsMdGem,
  agregarTareaManualClaveIA,
  generarContenidoProyecto,
  personalizarClaudeMd,
  personalizarTareasManuales,
  personalizarAgente,
} from "./formulario-proyecto";

describe("slugificar", () => {
  it("normaliza acentos, minúsculas y separadores", () => {
    expect(slugificar("Mi Calculadora Ñoña")).toBe("mi-calculadora-nona");
  });

  it("recorta guiones al inicio/fin y usa un default si queda vacío", () => {
    expect(slugificar("   ")).toBe("proyecto");
    expect(slugificar("---")).toBe("proyecto");
  });
});

const BODY_VALIDO = {
  nombre: "Mi Calculadora",
  objetivo: "Sumar y restar rápido",
  features: [{ nombre: "Sumar", descripcion: "Suma dos números" }],
  queNoEsV1: "multiplicación",
  stack: "Next.js+Vercel",
  presupuesto: "Capa gratuita estricta",
  decisionesReservadas: ["diseño visual"],
  visibilidad: "private",
  cadencia: "cada-2h",
};

describe("validarFormulario", () => {
  it("acepta un body válido y agrega el slug", () => {
    const resultado = validarFormulario(BODY_VALIDO);
    expect(resultado.slug).toBe("mi-calculadora");
    expect(resultado.features).toHaveLength(1);
  });

  it("rechaza sin nombre", () => {
    expect(() => validarFormulario({ ...BODY_VALIDO, nombre: "" })).toThrow(/nombre/i);
  });

  it("rechaza sin objetivo", () => {
    expect(() => validarFormulario({ ...BODY_VALIDO, objetivo: "" })).toThrow(/objetivo/i);
  });

  it("rechaza sin features MVP", () => {
    expect(() => validarFormulario({ ...BODY_VALIDO, features: [] })).toThrow(/feature/i);
  });

  it("filtra features sin nombre y cae a defaults en campos opcionales inválidos", () => {
    const resultado = validarFormulario({
      ...BODY_VALIDO,
      features: [{ nombre: "", descripcion: "sin nombre" }, { nombre: "Real", descripcion: "ok" }],
      cadencia: "algo-invalido",
      visibilidad: "otra-cosa",
    });
    expect(resultado.features).toHaveLength(1);
    expect(resultado.cadencia).toBe("cada-2h");
    expect(resultado.visibilidad).toBe("private");
  });

  it("rechaza un body que no es un objeto", () => {
    expect(() => validarFormulario(null)).toThrow();
    expect(() => validarFormulario("texto")).toThrow();
  });
});

describe("generarSpecsMd", () => {
  it("incluye objetivo, features y decisiones reservadas", () => {
    const md = generarSpecsMd(validarFormulario(BODY_VALIDO));
    expect(md).toContain("# SPECS — Mi Calculadora");
    expect(md).toContain("Sumar y restar rápido");
    expect(md).toContain("1. **Sumar** — Suma dos números");
    expect(md).toContain("- diseño visual");
  });
});

describe("agregarTareaManualVercel", () => {
  it("agrega el bloque de conexión manual al final del documento", () => {
    const resultado = agregarTareaManualVercel("# Tareas manuales\n\n- algo previo\n", "mi-calc", "rifc23/mi-calc");
    expect(resultado).toContain("- algo previo");
    expect(resultado).toContain("Conectar mi-calc a Vercel manualmente");
    expect(resultado).toContain("rifc23/mi-calc");
  });
});

const BODY_GEM = {
  nombre: "Entrenador IA",
  objetivo: "Un chatbot que me arme rutinas de gym",
  features: [],
  queNoEsV1: "",
  stack: "Next.js+Vercel",
  presupuesto: "Capa gratuita estricta",
  decisionesReservadas: ["diseño visual"],
  visibilidad: "private",
  cadencia: "cada-2h",
  esGem: true,
  rolGem: "Eres un entrenador fitness y me darás dietas con estos ingredientes: aguacate, cebolla…",
};

describe("validarFormulario — tipo Gem", () => {
  it("acepta un Gem con rol y sin features (el blueprint cubre las P0)", () => {
    const resultado = validarFormulario(BODY_GEM);
    expect(resultado.esGem).toBe(true);
    expect(resultado.rolGem).toContain("entrenador fitness");
    expect(resultado.features).toHaveLength(0);
  });

  it("rechaza un Gem sin rol", () => {
    expect(() => validarFormulario({ ...BODY_GEM, rolGem: "  " })).toThrow(/rol/i);
  });

  it("no exige features cuando esGem es true (a diferencia del caso normal)", () => {
    expect(() => validarFormulario({ ...BODY_GEM, features: [] })).not.toThrow();
  });
});

describe("featuresBlueprintGem", () => {
  it("incluye la capa de abstracción de IA como P0 fija", () => {
    const nombres = featuresBlueprintGem().map((f) => f.nombre);
    expect(nombres).toContain("Capa de abstracción de IA (ProveedorIA)");
    expect(nombres.length).toBeGreaterThanOrEqual(4);
  });
});

describe("generarSpecsMdGem", () => {
  it("incluye el rol del usuario ÍNTEGRO en la sección Rol inicial", () => {
    const md = generarSpecsMdGem(validarFormulario(BODY_GEM));
    expect(md).toContain("## Rol inicial");
    expect(md).toContain(
      "Eres un entrenador fitness y me darás dietas con estos ingredientes: aguacate, cebolla…",
    );
  });

  it("menciona la capa de abstracción de IA y el proveedor default", () => {
    const md = generarSpecsMdGem(validarFormulario(BODY_GEM));
    expect(md).toContain("ProveedorIA");
    expect(md).toContain("IA_PROVEEDOR");
    expect(md).toContain("gemini");
  });
});

describe("agregarTareaManualClaveIA", () => {
  it("agrega el bloque 🔴 bloqueante de la key de IA al final del documento", () => {
    const resultado = agregarTareaManualClaveIA("# Tareas manuales\n\n- algo previo\n");
    expect(resultado).toContain("- algo previo");
    expect(resultado).toContain("🔴");
    expect(resultado).toContain("GEMINI_API_KEY");
    expect(resultado).toContain("aistudio.google.com");
  });
});

describe("generarContenidoProyecto", () => {
  it("caso Gem con rol: featuresBacklog = blueprint fijo (sin features extra)", () => {
    const contenido = generarContenidoProyecto(validarFormulario(BODY_GEM));
    expect(contenido.esGem).toBe(true);
    expect(contenido.featuresBacklog).toHaveLength(featuresBlueprintGem().length);
    expect(contenido.specsMd).toContain("## Rol inicial");
  });

  it("caso Gem con rol + features extra: featuresBacklog = blueprint + extras (nunca las reemplaza)", () => {
    const bodyConExtra = {
      ...BODY_GEM,
      features: [{ nombre: "Exportar chat", descripcion: "Exportar la conversación a texto plano" }],
    };
    const contenido = generarContenidoProyecto(validarFormulario(bodyConExtra));
    expect(contenido.featuresBacklog).toHaveLength(featuresBlueprintGem().length + 1);
    expect(contenido.featuresBacklog.map((f) => f.nombre)).toContain("Exportar chat");
    expect(contenido.featuresBacklog.map((f) => f.nombre)).toContain("CRUD de Gems");
    expect(contenido.specsMd).toContain("Exportar chat");
  });

  it("caso no-Gem: se comporta igual que la generación genérica de siempre, sin ningún campo Gem", () => {
    const form = validarFormulario(BODY_VALIDO);
    const contenido = generarContenidoProyecto(form);
    expect(contenido.esGem).toBe(false);
    expect(contenido.featuresBacklog).toEqual(form.features);
    expect(contenido.specsMd).toBe(generarSpecsMd(form));
    expect(contenido.specsMd).not.toContain("Rol inicial");
    expect(contenido.specsMd).not.toContain("ProveedorIA");
  });
});

const CLAUDE_MD_TEMPLATE = `# <NOMBRE-PROYECTO> — Guía para Claude Code y agentes

## Qué es este proyecto

<2-3 párrafos: qué hace, para quién, modelo de negocio si aplica.>

**Stack:** <frontend · backend · base de datos · hosting/deploy>
**Deploy:** <cómo se despliega; qué dispara el deploy — ej. "push a main despliega vía X">

## Regla de despliegue seguro (SIEMPRE, para cualquier cambio)

\`\`\`bash
git rev-parse <RAMA-PRINCIPAL>

<COMANDO-TESTS>            # ej. npm run test:run
<COMANDO-LINT-O-RATCHET>   # ej. npm run lint
<COMANDO-BUILD>            # ej. npm run build
<COMANDO-E2E>              # ej. npm run test:e2e — OBLIGATORIO desde que exista

git checkout <RAMA-PRINCIPAL> && git merge --no-ff <rama> && git push
\`\`\`

## Testing

- **Gate:** <comandos exactos, repetidos aquí para grep-abilidad>.
`;

const TAREAS_MANUALES_TEMPLATE = `# Tareas manuales del usuario — <NOMBRE-PROYECTO>

---

<sembrar en la Fase 1 con: crear cuentas/keys del stack, configurar secretos en el store, dominio,
verificaciones en prod de cada feature mergeada>
`;

describe("personalizarClaudeMd", () => {
  it("reemplaza <NOMBRE-PROYECTO> y <RAMA-PRINCIPAL> por los datos reales", () => {
    const form = validarFormulario(BODY_VALIDO);
    const resultado = personalizarClaudeMd(CLAUDE_MD_TEMPLATE, form, "npm run lint && npm run build && npm run test:run");
    expect(resultado).not.toContain("<NOMBRE-PROYECTO>");
    expect(resultado).not.toContain("<RAMA-PRINCIPAL>");
    expect(resultado).toContain("# Mi Calculadora — Guía para Claude Code y agentes");
    expect(resultado).toContain("git rev-parse main");
  });

  it("rellena el objetivo, stack y deploy con datos del formulario", () => {
    const form = validarFormulario(BODY_VALIDO);
    const resultado = personalizarClaudeMd(CLAUDE_MD_TEMPLATE, form, "npm run lint && npm run build && npm run test:run");
    expect(resultado).toContain("Sumar y restar rápido");
    expect(resultado).toContain("**Stack:** Next.js+Vercel");
    expect(resultado).toContain("deploy automático por push");
  });

  it("rellena los comandos del gate individuales y el bloque de Testing", () => {
    const form = validarFormulario(BODY_VALIDO);
    const resultado = personalizarClaudeMd(CLAUDE_MD_TEMPLATE, form, "npm run lint && npm run build && npm run test:run");
    expect(resultado).not.toContain("<COMANDO-TESTS>");
    expect(resultado).not.toContain("<COMANDO-LINT-O-RATCHET>");
    expect(resultado).not.toContain("<COMANDO-BUILD>");
    expect(resultado).toContain("npm run test:run");
    expect(resultado).toContain("npm run lint");
    expect(resultado).toContain("npm run build");
    expect(resultado).toContain("**Gate:** `npm run lint && npm run build && npm run test:run`.");
  });
});

describe("personalizarTareasManuales", () => {
  it("reemplaza <NOMBRE-PROYECTO> en el título", () => {
    const form = validarFormulario(BODY_VALIDO);
    const resultado = personalizarTareasManuales(TAREAS_MANUALES_TEMPLATE, form);
    expect(resultado).not.toContain("<NOMBRE-PROYECTO>");
    expect(resultado).toContain("# Tareas manuales del usuario — Mi Calculadora");
  });

  it("reemplaza el texto instructivo genérico por un placeholder neutro", () => {
    const form = validarFormulario(BODY_VALIDO);
    const resultado = personalizarTareasManuales(TAREAS_MANUALES_TEMPLATE, form);
    expect(resultado).not.toContain("<sembrar en la Fase 1");
  });
});

describe("personalizarAgente", () => {
  it("reemplaza <NOMBRE-PROYECTO> en cualquier ocurrencia del archivo de agente", () => {
    const form = validarFormulario(BODY_VALIDO);
    const agenteMd = "Eres el implementador de <NOMBRE-PROYECTO>. Trabaja en <NOMBRE-PROYECTO>.";
    const resultado = personalizarAgente(agenteMd, form);
    expect(resultado).not.toContain("<NOMBRE-PROYECTO>");
    expect(resultado).toBe("Eres el implementador de Mi Calculadora. Trabaja en Mi Calculadora.");
  });

  it("no toca el resto del contenido del agente", () => {
    const form = validarFormulario(BODY_VALIDO);
    const agenteMd = "# implementador\n\nSin placeholders aquí.";
    expect(personalizarAgente(agenteMd, form)).toBe(agenteMd);
  });
});
