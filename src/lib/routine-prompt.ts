/**
 * Parametriza `docs/plantilla-routine-prompt.md` (bloque A, routine DEDICADA a un proyecto) con
 * sus datos reales. Sin consumidor en el dashboard desde que el Motor A-pool (despachadora +
 * rutinas trabajadoras, ver docs/diseno-consola-web.md §4) es el default automático para
 * proyectos nuevos — cero pasos manuales. Se conserva para quien decida instalar una routine
 * dedicada a mano vía /schedule (mismo camino usado para fabrica-consola), no para instalación
 * programática (`create_trigger` nace sin permisos de escritura — Error Conocido #2). Pura, sin
 * I/O: la lectura del archivo va por `src/lib/github.ts`.
 */

export interface ParametrosRoutine {
  nombreProyecto: string;
  repoUrl: string;
  ramaPrincipal?: string;
  comandosGate: string;
  fechaRatificacion?: string;
  idioma?: string;
}

export function parametrizarPromptRoutine(plantilla: string, params: ParametrosRoutine): string {
  return plantilla
    .replaceAll("<PROYECTO>", params.nombreProyecto)
    .replaceAll("<URL-REPO>", params.repoUrl)
    .replaceAll("<RAMA-PRINCIPAL>", params.ramaPrincipal ?? "main")
    .replaceAll("<COMANDOS-DEL-GATE-SEPARADOS-POR-+>", params.comandosGate)
    .replaceAll("<FECHA-RATIFICACIÓN>", params.fechaRatificacion ?? "pendiente")
    .replaceAll("<IDIOMA>", params.idioma ?? "español");
}
