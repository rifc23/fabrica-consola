/**
 * Validación y transformaciones puras del formulario "Nuevo proyecto" (§1 del diseño). Separado
 * del route handler para poder testearlo sin mockear HTTP.
 */

import type { CadenciaRoutine } from "./cron";

export type Cadencia = CadenciaRoutine;

export interface FeatureMVP {
  nombre: string;
  descripcion: string;
  criterios?: string;
}

export interface FormularioProyecto {
  nombre: string;
  objetivo: string;
  features: FeatureMVP[];
  queNoEsV1: string;
  stack: string;
  presupuesto: string;
  decisionesReservadas: string[];
  visibilidad: "private" | "public";
  cadencia: Cadencia;
  notificacionesTelegram?: string;
  /** §1.1 del diseño: tipo de proyecto "Gem" (chatbot con rol persistente). Sin marcar, el
   * formulario y toda la generación de contenido se comportan EXACTAMENTE como hoy. */
  esGem?: boolean;
  /** Rol del bot tal cual lo escribió el usuario (obligatorio si `esGem`). Viaja ÍNTEGRO a
   * `docs/SPECS.md` — la consola no llama a ningún LLM, el refinado lo hace la routine. */
  rolGem?: string;
}

export interface FormularioProyectoValidado extends FormularioProyecto {
  slug: string;
}

/** Nombre de proyecto → slug válido como nombre de repo GitHub y de proyecto Vercel. */
export function slugificar(nombre: string): string {
  const slug = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || "proyecto";
}

const CADENCIAS_VALIDAS: Cadencia[] = ["cada-2h", "cada-6h", "diaria", "manual"];

/** Valida y normaliza el body del POST /api/crear-proyecto. Lanza Error con mensaje de usuario. */
export function validarFormulario(input: unknown): FormularioProyectoValidado {
  if (typeof input !== "object" || input === null) {
    throw new Error("Cuerpo de la solicitud inválido.");
  }
  const b = input as Record<string, unknown>;

  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  if (!nombre) throw new Error("El nombre del proyecto es obligatorio.");

  const objetivo = typeof b.objetivo === "string" ? b.objetivo.trim() : "";
  if (!objetivo) throw new Error("El objetivo es obligatorio.");

  const featuresRaw = Array.isArray(b.features) ? b.features : [];
  const features: FeatureMVP[] = featuresRaw
    .map((f) => (typeof f === "object" && f !== null ? (f as Record<string, unknown>) : {}))
    .map((f) => ({
      nombre: typeof f.nombre === "string" ? f.nombre.trim() : "",
      descripcion: typeof f.descripcion === "string" ? f.descripcion.trim() : "",
      criterios: typeof f.criterios === "string" && f.criterios.trim() ? f.criterios.trim() : undefined,
    }))
    .filter((f) => f.nombre);

  const esGem = b.esGem === true;
  // Sin Gem: al menos 1 feature MVP (comportamiento de siempre). Con Gem: el blueprint fijo ya
  // cubre las P0 — las que teclea el usuario aquí son EXTRA, opcionales.
  if (!esGem && features.length === 0) throw new Error("Agrega al menos una feature MVP.");

  let rolGem: string | undefined;
  if (esGem) {
    rolGem = typeof b.rolGem === "string" ? b.rolGem.trim() : "";
    if (!rolGem) throw new Error("El rol del bot es obligatorio para un proyecto Gem.");
  }

  const cadencia = CADENCIAS_VALIDAS.includes(b.cadencia as Cadencia) ? (b.cadencia as Cadencia) : "cada-2h";
  const visibilidad = b.visibilidad === "public" ? "public" : "private";

  const decisionesReservadas = Array.isArray(b.decisionesReservadas)
    ? b.decisionesReservadas.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    : [];

  const notificacionesTelegram =
    typeof b.notificacionesTelegram === "string" && b.notificacionesTelegram.trim()
      ? b.notificacionesTelegram.trim()
      : undefined;

  return {
    nombre,
    objetivo,
    features,
    queNoEsV1: typeof b.queNoEsV1 === "string" ? b.queNoEsV1.trim() : "",
    stack: typeof b.stack === "string" && b.stack.trim() ? b.stack.trim() : "Recomiéndame (menor costo)",
    presupuesto: typeof b.presupuesto === "string" && b.presupuesto.trim() ? b.presupuesto.trim() : "Capa gratuita estricta",
    decisionesReservadas,
    visibilidad,
    cadencia,
    notificacionesTelegram,
    esGem,
    rolGem,
    slug: slugificar(nombre),
  };
}

/** `docs/SPECS.md` del repo nuevo — copia legible de las respuestas del formulario. */
export function generarSpecsMd(form: FormularioProyecto): string {
  const featuresMd = form.features
    .map(
      (f, i) =>
        `${i + 1}. **${f.nombre}** — ${f.descripcion}${f.criterios ? `\n   Criterios de aceptación: ${f.criterios}` : ""}`,
    )
    .join("\n");
  const decisionesMd = form.decisionesReservadas.length
    ? form.decisionesReservadas.map((d) => `- ${d}`).join("\n")
    : "- (ninguna declarada)";

  return `# SPECS — ${form.nombre}

Generado desde el formulario "Nuevo proyecto" de fabrica-consola.

## Objetivo

${form.objetivo}

## Features MVP

${featuresMd}

## Qué NO es v1

${form.queNoEsV1 || "(sin declarar)"}

## Stack

${form.stack}

## Presupuesto

${form.presupuesto}

## Decisiones que el usuario se reserva

${decisionesMd}

## Notificaciones

${form.notificacionesTelegram ? `Telegram chat_id: ${form.notificacionesTelegram}` : "(sin configurar)"}
`;
}

/**
 * Rellena los placeholders `<...>` del `CLAUDE.md` del template (Fase 1 del método `/fabrica`,
 * ver docs/metodo-fabrica-agentes.md) con los datos reales del formulario — sin esto, el proyecto
 * nace con el propio texto instructivo del template ("<2-3 párrafos: qué hace...>") en vez de sus
 * specs reales, y cualquier rutina que lo lea como "fuente de verdad" no tiene contexto real
 * (bug detectado 2026-07-18: `calculadora` nació con CLAUDE.md y TAREAS-MANUALES.md sin rellenar).
 * Solo toca los placeholders con dato NO ambiguo (nombre, rama, comandos de gate) — el resto
 * (reglas de dominio, decisiones arquitectónicas) los sigue completando la routine en su primer
 * tick, que ya tiene la regla "primer tick = producto funcional".
 */
export function personalizarClaudeMd(
  claudeMd: string,
  form: FormularioProyectoValidado,
  comandosGate: string,
): string {
  const comandos = comandosGate.split("&&").map((c) => c.trim());
  const [comandoLint, comandoBuild, comandoTests] = [
    comandos.find((c) => c.includes("lint")) ?? comandosGate,
    comandos.find((c) => c.includes("build")) ?? comandosGate,
    comandos.find((c) => c.includes("test")) ?? comandosGate,
  ];

  return claudeMd
    .replaceAll("<NOMBRE-PROYECTO>", form.nombre)
    .replaceAll("<RAMA-PRINCIPAL>", "main")
    .replace(
      "<2-3 párrafos: qué hace, para quién, modelo de negocio si aplica.>",
      form.objetivo,
    )
    .replace("**Stack:** <frontend · backend · base de datos · hosting/deploy>", `**Stack:** ${form.stack}`)
    .replace(
      '**Deploy:** <cómo se despliega; qué dispara el deploy — ej. "push a main despliega vía X">',
      "**Deploy:** push a `main` despliega vía integración GitHub↔Vercel (deploy automático por push).",
    )
    .replaceAll("<COMANDO-TESTS>            # ej. npm run test:run", comandoTests)
    .replaceAll("<COMANDO-LINT-O-RATCHET>   # ej. npm run lint", comandoLint)
    .replaceAll("<COMANDO-BUILD>            # ej. npm run build", comandoBuild)
    .replace(
      "- **Gate:** <comandos exactos, repetidos aquí para grep-abilidad>.",
      `- **Gate:** \`${comandosGate}\`.`,
    );
}

/**
 * Rellena el encabezado de `docs/TAREAS-MANUALES.md` del template con el nombre real del
 * proyecto (mismo bug que `personalizarClaudeMd`) y reemplaza el cuerpo instructivo genérico
 * (`<sembrar en la Fase 1 con: ...>`) por un placeholder neutro — las tareas manuales reales
 * (Vercel, key de IA, stack "Otro") ya se agregan encima vía `agregarTareaManual*`.
 */
export function personalizarTareasManuales(tareasMd: string, form: FormularioProyectoValidado): string {
  return tareasMd
    .replaceAll("<NOMBRE-PROYECTO>", form.nombre)
    .replace(
      "<sembrar en la Fase 1 con: crear cuentas/keys del stack, configurar secretos en el store, dominio,\nverificaciones en prod de cada feature mergeada>",
      "(vacío por ahora — las tareas manuales de este proyecto aparecen aquí cuando algún paso de\nla creación o del trabajo de la routine requiera una acción tuya).",
    );
}

/** Degradación elegante cuando no hay VERCEL_TOKEN: pasos manuales exactos en TAREAS-MANUALES.md. */
export function agregarTareaManualVercel(tareasMd: string, slug: string, repoFullName: string): string {
  const bloque = `
## 🟠 N. Conectar ${slug} a Vercel manualmente

**Qué:** el formulario "Nuevo proyecto" de fabrica-consola no encontró \`VERCEL_TOKEN\` configurado,
así que este proyecto no quedó conectado automáticamente a Vercel.
**Cómo:** vercel.com → Add New → Project → importa \`${repoFullName}\` desde GitHub (framework
Next.js autodetectado) → Deploy. Desde entonces cada push despliega y cada PR genera su preview.
**Tiempo:** 3 min.
`;
  return `${tareasMd.replace(/\n+$/, "")}\n${bloque}`;
}

/**
 * §1.1 del diseño — blueprint del tipo de proyecto "Gem" (chatbot con rol persistente).
 * Features P0 FIJAS: el usuario puede agregar features EXTRA en el formulario, pero nunca
 * reemplaza este bloque. Incluye la capa de abstracción de IA como P0 (obligatoria en todo Gem).
 */
export function featuresBlueprintGem(): FeatureMVP[] {
  return [
    {
      nombre: "CRUD de Gems",
      descripcion:
        "Crear, editar, listar y borrar Gems (nombre + rol en textarea). La lista de Gems es la " +
        "pantalla principal. Existe un Gem \"Asistente general\" sin rol por default.",
      criterios:
        "dado que no hay Gems creados, cuando se abre la app, entonces existe al menos el Gem " +
        '"Asistente general" en la lista',
    },
    {
      nombre: "Chat con streaming y rol persistente",
      descripcion:
        "Chat con streaming de respuesta vía la capa de abstracción de IA. El rol del Gem viaja " +
        "SIEMPRE como parámetro 'system' en cada llamada, FUERA del array de historial de " +
        "mensajes — si hay que truncar contexto se truncan mensajes viejos, JAMÁS el rol. " +
        "Historial y Gems persisten en localStorage (sin base de datos).",
      criterios:
        "dado un Gem con rol definido, cuando el historial de la conversación crece y se trunca, " +
        "entonces el rol sigue viajando íntegro como parámetro system en cada llamada",
    },
    {
      nombre: 'Botón "✨ Mejorar rol" con preview',
      descripcion:
        "Botón que reescribe el rol actual (identidad/tono/reglas/datos fijos) usando la MISMA " +
        "capa de abstracción de IA, mostrado en un preview editable — nunca se guarda sin " +
        "aprobación explícita del usuario.",
      criterios:
        'dado un rol escrito, cuando se presiona "Mejorar rol", entonces se muestra un preview ' +
        "editable que solo se aplica si el usuario lo aprueba",
    },
    {
      nombre: "Capa de abstracción de IA (ProveedorIA)",
      descripcion:
        "Interfaz server-side única `ProveedorIA` (p. ej. chat({sistema, mensajes, onDelta})) en " +
        "src/lib/ia/proveedor.ts, con un adaptador por proveedor (gemini.ts, anthropic.ts) " +
        "detrás. Ningún componente ni endpoint llama a un proveedor directamente. Proveedor " +
        "activo por env var IA_PROVEEDOR ('gemini' | 'anthropic', default 'gemini' por su capa " +
        "gratuita).",
      criterios:
        "dado IA_PROVEEDOR sin configurar, cuando el chat llama a la capa de abstracción, " +
        "entonces usa el adaptador de Gemini (default) sin que ningún componente conozca el " +
        "proveedor concreto",
    },
  ];
}

function featuresMd(features: FeatureMVP[]): string {
  return features
    .map(
      (f, i) =>
        `${i + 1}. **${f.nombre}** — ${f.descripcion}${f.criterios ? `\n   Criterios de aceptación: ${f.criterios}.` : ""}`,
    )
    .join("\n");
}

/**
 * `docs/SPECS.md` de un repo Gem — la sección "Rol inicial" lleva el texto del usuario ÍNTEGRO,
 * sin reescritura (la consola NO llama a ningún LLM; el refinado lo hace la routine en su primer
 * tick, §1.1 del diseño).
 */
export function generarSpecsMdGem(form: FormularioProyectoValidado): string {
  const rol = form.rolGem ?? "";
  const decisionesMd = form.decisionesReservadas.length
    ? form.decisionesReservadas.map((d) => `- ${d}`).join("\n")
    : "- (ninguna declarada)";

  return `# SPECS — ${form.nombre}

Generado desde el formulario "Nuevo proyecto" de fabrica-consola — tipo **Gem (chatbot con rol)**.

## Objetivo

${form.objetivo}

## Rol inicial

${rol}

(El refinado de este rol —wording/estructura— lo hace la routine del proyecto en su primer tick;
si el cambio es sustancial lo estaciona como decisión [USUARIO]. La consola NO llama a ningún LLM.)

## Blueprint Gem (features P0 fijas)

${featuresMd(featuresBlueprintGem())}

## Features extra agregadas por el usuario

${form.features.length ? featuresMd(form.features) : "(ninguna — solo el blueprint fijo)"}

## Capa de abstracción de IA

Interfaz \`ProveedorIA\` server-side (\`src/lib/ia/proveedor.ts\`) con un adaptador por proveedor
(\`gemini.ts\`, \`anthropic.ts\`). Proveedor activo por env var \`IA_PROVEEDOR\` (\`gemini\` |
\`anthropic\`, default \`gemini\` por su capa gratuita) + la key correspondiente
(\`GEMINI_API_KEY\` o \`ANTHROPIC_API_KEY\`), siempre server-side.

## Qué NO es v1

Multi-usuario, sync en la nube, compartir Gems, archivos/voz.${form.queNoEsV1 ? ` ${form.queNoEsV1}` : ""}

## Stack

${form.stack}

## Presupuesto

${form.presupuesto}

## Decisiones que el usuario se reserva

${decisionesMd}

## Notificaciones

${form.notificacionesTelegram ? `Telegram chat_id: ${form.notificacionesTelegram}` : "(sin configurar)"}
`;
}

/**
 * Tarea manual 🔴 (bloqueante) del repo nuevo cuando el proyecto es un Gem: sin la key del
 * proveedor de IA activo, el chat no responde. Sigue el mismo patrón que
 * `agregarTareaManualVercel`/`agregarTareaManualStackOtro`.
 */
export function agregarTareaManualClaveIA(tareasMd: string): string {
  const bloque = `
## 🔴 N. Crear la key de IA del Gem y configurarla en Vercel

**Qué:** este proyecto es un Gem (chatbot con rol) — la capa de abstracción \`ProveedorIA\`
necesita la key del proveedor activo para poder responder. Sin esto el chat no funciona.
**Cómo:** crea una \`GEMINI_API_KEY\` gratuita en aistudio.google.com (proveedor default,
\`IA_PROVEEDOR=gemini\`) — o \`ANTHROPIC_API_KEY\` si cambias \`IA_PROVEEDOR\` a \`anthropic\` — y
configúrala en el Vercel del proyecto (Settings → Environment Variables) → redeploy.
**Tiempo:** 3 min.
`;
  return `${tareasMd.replace(/\n+$/, "")}\n${bloque}`;
}

export interface ContenidoProyecto {
  specsMd: string;
  /** Features a sembrar en el backlog P0: para Gem, blueprint fijo + extras del usuario; para el
   * resto, exactamente `form.features` (sin cambios respecto a la generación de siempre). */
  featuresBacklog: FeatureMVP[];
  esGem: boolean;
}

/**
 * Combina la generación de `docs/SPECS.md` y las features del backlog según el tipo de proyecto.
 * Con `esGem`, usa el blueprint Gem (§1.1 del diseño). Sin `esGem`, es EXACTAMENTE la generación
 * genérica de siempre — cero campos Gem, cero diferencias de comportamiento.
 */
export function generarContenidoProyecto(form: FormularioProyectoValidado): ContenidoProyecto {
  if (form.esGem) {
    return {
      specsMd: generarSpecsMdGem(form),
      featuresBacklog: [...featuresBlueprintGem(), ...form.features],
      esGem: true,
    };
  }
  return {
    specsMd: generarSpecsMd(form),
    featuresBacklog: form.features,
    esGem: false,
  };
}
