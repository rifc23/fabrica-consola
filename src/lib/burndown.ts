/**
 * Burn-down del backlog: a partir de una serie de versiones históricas de `docs/backlog.md`
 * (una por commit muestreado, ver `obtenerHistorialArchivo` en `src/lib/github.ts`), cuenta
 * cuántos checkboxes pendientes (`- [ ]`) había en cada una. Función pura (sin I/O) — reutiliza
 * `parseCheckboxes` de `src/lib/backlog.ts` en vez de duplicar la lógica de conteo.
 */

import { parseCheckboxes } from "./backlog";

export interface PuntoBurndownEntrada {
  fecha: string;
  contenidoMarkdown: string;
}

export interface PuntoBurndown {
  fecha: string;
  pendientes: number;
}

/**
 * Cuenta los checkboxes pendientes de cada punto y ordena la serie cronológicamente por fecha
 * (los strings ISO 8601 ordenan correctamente como texto). Degrada sin explotar con 0 o 1 puntos
 * — el mínimo de 2 para MOSTRAR la gráfica es criterio del componente, no de esta función.
 */
export function calcularSerieBurndown(puntos: PuntoBurndownEntrada[]): PuntoBurndown[] {
  return puntos
    .map((p) => ({
      fecha: p.fecha,
      pendientes: parseCheckboxes(p.contenidoMarkdown).filter((item) => !item.hecho).length,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
