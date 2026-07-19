/**
 * Persistencia del borrador de "Nuevo proyecto" en localStorage — evita perder el formulario si
 * el usuario recarga la página por error o cierra la pestaña sin querer (bug reportado
 * 2026-07-19: un envío fallido dejaba al usuario sin forma de volver al formulario ni de
 * recuperar lo que había escrito). Funciones puras separadas del componente para poder
 * testearlas sin mockear el DOM/localStorage real.
 */

export const CLAVE_BORRADOR = "fabrica-consola:borrador-nuevo-proyecto";

export interface BorradorNuevoProyecto {
  nombre: string;
  objetivo: string;
  esGem: boolean;
  rolGem: string;
  features: { id: string; nombre: string; descripcion: string; criterios?: string }[];
  queNoEsV1: string;
  stackSeleccionado: string;
  stackOtro: string;
  presupuesto: "Capa gratuita estricta" | "Puedo pagar servicios si se justifica";
  decisiones: { texto: string; marcada: boolean }[];
  decisionOtra: string;
  visibilidad: "private" | "public";
  cadencia: string;
  notificacionesTelegram: string;
}

/** Un borrador "vacío" (igual al estado inicial del formulario) no vale la pena persistir. */
export function borradorEstaVacio(b: BorradorNuevoProyecto): boolean {
  return (
    !b.nombre.trim() &&
    !b.objetivo.trim() &&
    !b.rolGem.trim() &&
    !b.queNoEsV1.trim() &&
    !b.stackOtro.trim() &&
    !b.decisionOtra.trim() &&
    !b.notificacionesTelegram.trim() &&
    b.features.every((f) => !f.nombre.trim() && !f.descripcion.trim() && !(f.criterios ?? "").trim())
  );
}

export function guardarBorrador(storage: Pick<Storage, "setItem" | "removeItem">, b: BorradorNuevoProyecto): void {
  if (borradorEstaVacio(b)) {
    storage.removeItem(CLAVE_BORRADOR);
    return;
  }
  storage.setItem(CLAVE_BORRADOR, JSON.stringify(b));
}

/** Nunca lanza — un borrador corrupto/de otra versión del formulario se descarta en silencio. */
export function leerBorrador(storage: Pick<Storage, "getItem">): BorradorNuevoProyecto | null {
  const crudo = storage.getItem(CLAVE_BORRADOR);
  if (!crudo) return null;
  try {
    const datos = JSON.parse(crudo) as Partial<BorradorNuevoProyecto>;
    if (typeof datos !== "object" || datos === null || typeof datos.nombre !== "string") return null;
    return datos as BorradorNuevoProyecto;
  } catch {
    return null;
  }
}

export function borrarBorrador(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(CLAVE_BORRADOR);
}
