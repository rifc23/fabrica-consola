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
  if (features.length === 0) throw new Error("Agrega al menos una feature MVP.");

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
