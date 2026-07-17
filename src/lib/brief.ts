/**
 * Deriva el "📋 Brief" hecho/en-curso/pendiente del dashboard POR PARSING del backlog — sin LLM
 * (regla no negociable de v1). Se apoya en `src/lib/backlog.ts` (checkboxes, marcador `🔄` y la
 * tabla "Registro de trabajo").
 */

import { calcularProgreso, parseRegistroTrabajo } from "./backlog";

export interface PendienteBrief {
  texto: string;
  prioridad: string;
  posicion: number;
}

export interface ConteoPrioridad {
  hechas: number;
  total: number;
}

export interface BriefProyecto {
  hechoReciente: string[];
  enCurso: string[];
  pendientes: PendienteBrief[];
  conteos: Record<string, ConteoPrioridad>;
}

const MAX_HECHO_RECIENTE = 5;

/** Hecho/en-curso/pendiente + conteos por prioridad, derivado del backlog completo. */
export function derivarBrief(backlogMd: string): BriefProyecto {
  const progreso = calcularProgreso(backlogMd);

  const enCurso = progreso.items.filter((i) => i.enCurso && !i.hecho).map((i) => i.texto);

  const registro = parseRegistroTrabajo(backlogMd)
    .filter((f) => /completad/i.test(f.estado))
    .slice(-MAX_HECHO_RECIENTE)
    .map((f) => `${f.tarea} (rama ${f.rama})`);

  const hechoChecklist = progreso.items.filter((i) => i.hecho).map((i) => i.texto);
  const hechoReciente = (registro.length ? registro : hechoChecklist).slice(-MAX_HECHO_RECIENTE);

  let posicion = 0;
  const pendientes: PendienteBrief[] = progreso.items
    .filter((i) => !i.hecho)
    .map((i) => ({ texto: i.texto, prioridad: i.prioridad, posicion: ++posicion }));

  const conteos: Record<string, ConteoPrioridad> = {};
  for (const item of progreso.items) {
    conteos[item.prioridad] ??= { hechas: 0, total: 0 };
    conteos[item.prioridad].total += 1;
    if (item.hecho) conteos[item.prioridad].hechas += 1;
  }

  return { hechoReciente, enCurso, pendientes, conteos };
}

/** Espera estimada de una tarea pendiente: lotes de ~4 tareas por tick (ver §2.2 del diseño). */
export function esperaEstimadaTicks(posicion: number, tareasPorLote = 4): number {
  return Math.ceil(posicion / tareasPorLote);
}
