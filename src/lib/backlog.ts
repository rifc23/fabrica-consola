/**
 * Parsers puros de `docs/backlog.md` — la única fuente de progreso, decisiones estacionadas y
 * buzón de Inbox. Todas las funciones son de solo-texto (sin I/O): la lectura/escritura real vía
 * Contents API vive en `src/lib/github.ts`.
 */

export interface Seccion {
  titulo: string;
  contenido: string;
}

/** Divide el markdown en secciones por encabezado `## `. */
export function extraerSecciones(md: string): Seccion[] {
  const lineas = md.split("\n");
  const secciones: Seccion[] = [];
  let actual: { titulo: string; lineas: string[] } | null = null;

  for (const linea of lineas) {
    if (/^##\s/.test(linea)) {
      if (actual) secciones.push({ titulo: actual.titulo, contenido: actual.lineas.join("\n") });
      actual = { titulo: linea.replace(/^##\s+/, "").trim(), lineas: [] };
    } else if (actual) {
      actual.lineas.push(linea);
    }
  }
  if (actual) secciones.push({ titulo: actual.titulo, contenido: actual.lineas.join("\n") });
  return secciones;
}

export function buscarSeccion(md: string, patron: RegExp): Seccion | undefined {
  return extraerSecciones(md).find((s) => patron.test(s.titulo));
}

export interface ItemBacklog {
  texto: string;
  hecho: boolean;
  enCurso: boolean;
}

const RE_CHECKBOX = /^-\s\[( |x|X)\]\s*(.*)$/;

/** Extrae los checkboxes `- [ ]`/`- [x]` de una sección, detectando el marcador `🔄` (en curso). */
export function parseCheckboxes(contenidoSeccion: string): ItemBacklog[] {
  const items: ItemBacklog[] = [];
  for (const linea of contenidoSeccion.split("\n")) {
    const m = linea.trim().match(RE_CHECKBOX);
    if (!m) continue;
    const hecho = m[1].toLowerCase() === "x";
    let resto = m[2];
    const enCurso = /^(\*\*)?\s*🔄/.test(resto);
    if (enCurso) {
      resto = resto.replace(/^(\*\*)?\s*🔄\s*/, (_match, bold: string | undefined) => bold ?? "");
    }
    items.push({ texto: resto.trim(), hecho, enCurso });
  }
  return items;
}

export interface ItemProgreso extends ItemBacklog {
  prioridad: string;
}

export interface ProgresoBacklog {
  total: number;
  hechas: number;
  porcentaje: number;
  items: ItemProgreso[];
}

/** Progreso real (P0/P1/P2) contando checkboxes — la barra de progreso del dashboard. */
export function calcularProgreso(md: string): ProgresoBacklog {
  const secciones = extraerSecciones(md).filter((s) => /^P[0-2]\s*—/.test(s.titulo));
  const items: ItemProgreso[] = secciones.flatMap((s) => {
    const prioridad = (s.titulo.match(/^P[0-2]/) ?? ["?"])[0];
    return parseCheckboxes(s.contenido).map((it) => ({ ...it, prioridad }));
  });
  const hechas = items.filter((i) => i.hecho).length;
  const porcentaje = items.length ? Math.round((hechas / items.length) * 100) : 0;
  return { total: items.length, hechas, porcentaje, items };
}

/** Bullets de la sección "Decisiones estacionadas [USUARIO]" — la pregunta EXACTA de cada una. */
export function extraerDecisiones(md: string): string[] {
  const seccion = buscarSeccion(md, /Decisiones estacionadas/);
  if (!seccion) return [];
  return seccion.contenido
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^-\s/.test(l))
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter((texto) => texto && !/^\(sin decisiones/i.test(texto) && !/^<.*>$/.test(texto));
}

/** Primeras palabras de una pregunta (sin markdown) — para el formato de respuesta al Inbox. */
export function primerasPalabras(pregunta: string, maxPalabras = 6): string {
  const limpio = pregunta.replace(/\*\*/g, "").trim();
  return limpio.split(/\s+/).slice(0, maxPalabras).join(" ").replace(/[:.,;]+$/, "");
}

/**
 * Formato EXACTO exigido por CLAUDE.md para responder una decisión desde el Inbox:
 * `Respuesta a decisión "<primeras palabras>": <respuesta>`.
 */
export function formatearRespuestaDecision(pregunta: string, respuesta: string): string {
  return `Respuesta a decisión "${primerasPalabras(pregunta)}": ${respuesta.trim()}`;
}

const RE_INBOX_HEADING = /^##\s.*Inbox/;
const RE_HEADING = /^##\s/;
const RE_VACIO = /^-\s*\(vacío\)\s*$/i;

/** Una entrada nueva del Inbox, con fecha y soporte multi-línea (continuación indentada). */
export function formatearEntradaInbox(texto: string, fecha: string): string {
  const lineas = texto.trim().replace(/\r\n/g, "\n").split("\n");
  const primera = `- (${fecha}) ${lineas[0]}`;
  const resto = lineas.slice(1).map((l) => `  ${l}`);
  return [primera, ...resto].join("\n");
}

/**
 * Inserta `texto` DENTRO de la sección `📥 Inbox` de `md`, tal cual (sin LLM), con fecha. Es la
 * ÚNICA escritura permitida sobre backlogs de proyectos existentes (regla no negociable). Nunca
 * toca el resto del archivo.
 */
export function insertarEnInbox(md: string, texto: string, fecha: string = new Date().toISOString().slice(0, 10)): string {
  const lineas = md.split("\n");
  const idxInicio = lineas.findIndex((l) => RE_INBOX_HEADING.test(l));
  if (idxInicio === -1) {
    throw new Error("El backlog no tiene sección '📥 Inbox' — no se puede insertar la entrada.");
  }
  let idxFin = lineas.findIndex((l, i) => i > idxInicio && RE_HEADING.test(l));
  if (idxFin === -1) idxFin = lineas.length;

  const cuerpoActual = lineas.slice(idxInicio + 1, idxFin).filter((l) => !RE_VACIO.test(l.trim()));
  while (cuerpoActual.length && cuerpoActual[cuerpoActual.length - 1].trim() === "") {
    cuerpoActual.pop();
  }

  const entrada = formatearEntradaInbox(texto, fecha);
  const nuevoCuerpo = [...cuerpoActual, entrada, ""];

  return [...lineas.slice(0, idxInicio + 1), ...nuevoCuerpo, ...lineas.slice(idxFin)].join("\n");
}

/** Reemplaza el cuerpo de la sección cuyo encabezado matchea `tituloRegex`, dejando el título. */
function reemplazarSeccion(md: string, tituloRegex: RegExp, nuevoCuerpo: string): string {
  const lineas = md.split("\n");
  const idx = lineas.findIndex((l) => tituloRegex.test(l));
  if (idx === -1) return md; // sección no encontrada en la plantilla: no-op, robusto ante cambios
  let fin = lineas.findIndex((l, i) => i > idx && RE_HEADING.test(l));
  if (fin === -1) fin = lineas.length;
  const nuevas = [lineas[idx], ...nuevoCuerpo.split("\n")];
  return [...lineas.slice(0, idx), ...nuevas, ...lineas.slice(fin)].join("\n");
}

export interface FeatureMVPBacklog {
  nombre: string;
  descripcion: string;
  criterios?: string;
}

export interface SiembraBacklogOpts {
  nombre: string;
  fechaCreacion: string;
  repoUrl: string;
  comandosGate: string;
  features: FeatureMVPBacklog[];
  decisionesReservadas: string[];
}

/**
 * Personaliza el `docs/backlog.md` plantilla (recién copiado del template al crear el repo):
 * título, nota de arranque en "Estado general", features MVP como P0 y decisiones reservadas.
 * Nunca toca la sección `📥 Inbox` (queda como venga del template — vacía).
 */
export function sembrarBacklogNuevoProyecto(templateMd: string, opts: SiembraBacklogOpts): string {
  let md = templateMd;
  md = md.replace(/^# Backlog — .*/m, `# Backlog — ${opts.nombre}`);
  md = reemplazarSeccion(
    md,
    /^##\s+Estado general\s*$/,
    `\n- ${opts.fechaCreacion}: proyecto arrancado desde fabrica-consola (repo ${opts.repoUrl}). Gate objetivo: \`${opts.comandosGate}\`.\n`,
  );
  const cuerpoP0 = opts.features.length
    ? opts.features
        .map(
          (f) =>
            `- [ ] **${f.nombre}.** ${f.descripcion}${f.criterios ? ` Criterios de aceptación: ${f.criterios}.` : ""}`,
        )
        .join("\n")
    : "- [ ] (sin features MVP declaradas — agrégalas desde el Inbox)";
  md = reemplazarSeccion(md, /^##\s+P0\s+—/, `\n${cuerpoP0}\n`);
  const cuerpoDecisiones = opts.decisionesReservadas.length
    ? opts.decisionesReservadas.map((d) => `- ${d}`).join("\n")
    : "- (sin decisiones estacionadas por ahora)";
  md = reemplazarSeccion(md, /^##\s+Decisiones estacionadas/, `\n${cuerpoDecisiones}\n`);
  return md;
}

/** Filas de la tabla "Registro de trabajo" (usadas por el Brief para "completadas recientes"). */
export interface FilaRegistroTrabajo {
  fecha: string;
  tarea: string;
  rama: string;
  estado: string;
}

export function parseRegistroTrabajo(md: string): FilaRegistroTrabajo[] {
  const seccion = buscarSeccion(md, /Registro de trabajo/);
  if (!seccion) return [];
  const filas = seccion.contenido
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|[\s-|]+\|$/.test(l));
  if (filas.length <= 1) return [];
  return filas
    .slice(1) // primera fila es el encabezado
    .map((l) =>
      l
        .split("|")
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1),
    )
    .filter((cols) => cols.length >= 6)
    .map((cols) => ({ fecha: cols[0], tarea: cols[1], rama: cols[2], estado: cols[5] }));
}
