/**
 * Parser mínimo de cron de 5 campos (minuto hora día-mes mes día-semana) y utilidades derivadas:
 * próxima ejecución, cadencia escalonada para proyectos nuevos y el "próximo despacho efectivo"
 * (mínimo entre el tick del proyecto y el despachador de la routine madre, cada hora a los :50).
 *
 * Sin dependencias — usado tanto server-side (dashboard) como client-side (countdown de las
 * cards de decisiones), por eso es una función pura sin I/O.
 */

export type CadenciaRoutine = "cada-2h" | "cada-6h" | "diaria" | "manual";

export interface CronExpresion {
  minuto: string;
  hora: string;
  diaMes: string;
  mes: string;
  diaSemana: string;
}

/** El despachador de la routine madre revisa los Inbox cada hora a los :50 (ver CLAUDE.md). */
export const CRON_DESPACHADOR_MADRE = "50 * * * *";

/**
 * Cadencias reales del pool de rutinas genéricas (Motor A-pool, ver docs/diseno-consola-web.md
 * §4): la despachadora asigna ANTES de que corra cada trabajadora en el mismo ciclo de 2h.
 * `CRON_TRABAJADORAS_POOL` está indexado por el sufijo numérico del nombre de la rutina
 * (`rutina-trabajadora-1` → índice 1) — si se agrega una tercera rutina, se agrega aquí también.
 */
export const CRON_DESPACHADORA_POOL = "5 */2 * * *";
export const CRON_TRABAJADORAS_POOL: Record<number, string> = {
  1: "10 */2 * * *",
  2: "40 */2 * * *",
};

/** Cron fijo de la rutina trabajadora del pool cuyo nombre es `nombreRutina` (busca su índice
 *  numérico en CRON_TRABAJADORAS_POOL), o null si no coincide con el patrón esperado o no está
 *  registrada ahí (rutina nueva agregada sin actualizar la constante). */
export function cronDeTrabajadoraPool(nombreRutina: string): string | null {
  const match = nombreRutina.match(/^rutina-trabajadora-(\d+)$/);
  if (!match) return null;
  return CRON_TRABAJADORAS_POOL[Number(match[1])] ?? null;
}

const OFFSETS_ESCALONADOS = [0, 15, 30, 45];

export function parsearCron(expr: string): CronExpresion {
  const partes = expr.trim().split(/\s+/);
  if (partes.length !== 5) {
    throw new Error(`Expresión cron inválida (se esperaban 5 campos): "${expr}"`);
  }
  const [minuto, hora, diaMes, mes, diaSemana] = partes;
  return { minuto, hora, diaMes, mes, diaSemana };
}

function coincideCampo(valor: number, campo: string, min: number, max: number): boolean {
  return campo.split(",").some((parte) => {
    if (parte === "*") return true;
    if (parte.includes("/")) {
      const [rango, pasoStr] = parte.split("/");
      const paso = Number(pasoStr);
      if (!Number.isFinite(paso) || paso <= 0) return false;
      let ini = min;
      let fin = max;
      if (rango !== "*") {
        if (rango.includes("-")) {
          const [i, f] = rango.split("-").map(Number);
          ini = i;
          fin = f;
        } else {
          ini = Number(rango);
          fin = max;
        }
      }
      if (valor < ini || valor > fin) return false;
      return (valor - ini) % paso === 0;
    }
    if (parte.includes("-")) {
      const [ini, fin] = parte.split("-").map(Number);
      return valor >= ini && valor <= fin;
    }
    return Number(parte) === valor;
  });
}

const LIMITE_MINUTOS_BUSQUEDA = 60 * 24 * 8; // 8 días — suficiente para cualquier cadencia de la fábrica

/** Próxima fecha (estrictamente después de `desde`) en que la expresión cron coincide. */
export function proximaEjecucion(expr: string, desde: Date = new Date()): Date {
  const cron = parsearCron(expr);
  const fecha = new Date(desde.getTime());
  fecha.setSeconds(0, 0);
  fecha.setMinutes(fecha.getMinutes() + 1);

  for (let i = 0; i < LIMITE_MINUTOS_BUSQUEDA; i++) {
    const coincide =
      coincideCampo(fecha.getMinutes(), cron.minuto, 0, 59) &&
      coincideCampo(fecha.getHours(), cron.hora, 0, 23) &&
      coincideCampo(fecha.getDate(), cron.diaMes, 1, 31) &&
      coincideCampo(fecha.getMonth() + 1, cron.mes, 1, 12) &&
      coincideCampo(fecha.getDay(), cron.diaSemana, 0, 6);
    if (coincide) return fecha;
    fecha.setMinutes(fecha.getMinutes() + 1);
  }
  throw new Error(`No se encontró próxima ejecución de "${expr}" dentro de los próximos 8 días`);
}

export interface ProximoDespacho {
  fecha: Date;
  minutos: number;
}

/**
 * Mínimo entre el próximo tick del proyecto (`cadenciaCron`, si existe) y el próximo paso del
 * despachador de la routine madre (`CRON_DESPACHADOR_MADRE`). Usado por las cards de decisiones
 * para el countdown "la fábrica la tomará en ~X min" — sin ningún link a claude.ai.
 */
export function proximoDespachoEfectivo(
  cadenciaCron: string | null | undefined,
  desde: Date = new Date(),
): ProximoDespacho {
  const candidatos: Date[] = [proximaEjecucion(CRON_DESPACHADOR_MADRE, desde)];
  if (cadenciaCron) {
    try {
      candidatos.push(proximaEjecucion(cadenciaCron, desde));
    } catch {
      // cron inválido en el manifest: se ignora, queda solo el despachador de la madre
    }
  }
  const fecha = candidatos.reduce((a, b) => (b.getTime() < a.getTime() ? b : a));
  const minutos = Math.max(1, Math.round((fecha.getTime() - desde.getTime()) / 60000));
  return { fecha, minutos };
}

const COMODIN_TOTAL = (c: CronExpresion) => c.diaMes === "*" && c.mes === "*" && c.diaSemana === "*";

/**
 * Deriva el intervalo TÍPICO (en minutos) de una `cadencia_cron` simple de la fábrica — usado
 * para la espera estimada por posición en la cola (`ceil(posicion/4) × cadencia`, ver §2.2 del
 * diseño). Solo reconoce los patrones que de hecho genera `generarCadenciaEscalonada` (minuto
 * fijo + paso en horas con notación asterisco-barra-N, minuto fijo + hora fija diaria, minuto
 * fijo cada hora, paso asterisco-barra-N en minutos) — cualquier otra forma (rangos, listas,
 * día/mes específico…) devuelve `null` para que el caller muestre "—" en vez de inventar un
 * número.
 */
export function derivarCadenciaMinutos(expr: string): number | null {
  let cron: CronExpresion;
  try {
    cron = parsearCron(expr);
  } catch {
    return null;
  }
  if (!COMODIN_TOTAL(cron)) return null;

  const minutoEsPaso = cron.minuto.match(/^\*\/(\d+)$/);
  const minutoEsFijo = /^\d+$/.test(cron.minuto);
  const horaEsPaso = cron.hora.match(/^\*\/(\d+)$/);
  const horaEsFija = /^\d+$/.test(cron.hora);

  // "*/N * * * *" — cada N minutos.
  if (minutoEsPaso && cron.hora === "*") return Number(minutoEsPaso[1]);
  // "M */N * * *" — cada N horas con offset de minuto fijo.
  if (minutoEsFijo && horaEsPaso) return Number(horaEsPaso[1]) * 60;
  // "M * * * *" — cada hora en punto de minuto M.
  if (minutoEsFijo && cron.hora === "*") return 60;
  // "M H * * *" — una vez al día.
  if (minutoEsFijo && horaEsFija) return 24 * 60;

  return null;
}

/**
 * Genera la cadencia cron de un proyecto nuevo con offset de minutos escalonado (0/15/30/45,
 * rotando por índice de proyecto) para que N routines no se disparen todas a la misma hora
 * (ver diseño §4 Motor A). `manual` ("solo cuando yo la dispare") no genera cron.
 */
export function generarCadenciaEscalonada(cadencia: CadenciaRoutine, indice: number): string | null {
  const offset = OFFSETS_ESCALONADOS[((indice % OFFSETS_ESCALONADOS.length) + OFFSETS_ESCALONADOS.length) % OFFSETS_ESCALONADOS.length];
  switch (cadencia) {
    case "cada-2h":
      return `${offset} */2 * * *`;
    case "cada-6h":
      return `${offset} */6 * * *`;
    case "diaria":
      return `${offset} 6 * * *`;
    case "manual":
      return null;
    default:
      return `${offset} */2 * * *`;
  }
}
