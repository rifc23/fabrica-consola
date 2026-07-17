/**
 * Parametriza `docs/plantilla-routine-prompt.md` (del repo del proyecto nuevo) con los datos
 * reales del proyecto, para la "pantalla de arranque" (sección colapsable con botón copiar):
 * instalar la routine SOLO desde la UI de routines de claude.ai (Error Conocido #2 — nunca
 * `create_trigger` programático). Pura, sin I/O: la lectura del archivo va por
 * `src/lib/github.ts`.
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
