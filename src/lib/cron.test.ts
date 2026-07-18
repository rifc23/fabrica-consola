import { describe, it, expect } from "vitest";
import {
  parsearCron,
  proximaEjecucion,
  proximoDespachoEfectivo,
  generarCadenciaEscalonada,
  derivarCadenciaMinutos,
  cronDeTrabajadoraPool,
  CRON_DESPACHADOR_MADRE,
  CRON_DESPACHADORA_POOL,
} from "./cron";

describe("parsearCron", () => {
  it("parsea los 5 campos", () => {
    expect(parsearCron("15 */2 * * *")).toEqual({
      minuto: "15",
      hora: "*/2",
      diaMes: "*",
      mes: "*",
      diaSemana: "*",
    });
  });

  it("lanza si no hay exactamente 5 campos", () => {
    expect(() => parsearCron("15 * * *")).toThrow(/inválida/);
  });
});

describe("proximaEjecucion", () => {
  it("calcula la próxima hora en punto para '0 * * * *'", () => {
    const desde = new Date("2026-07-17T06:10:00Z");
    const proxima = proximaEjecucion("0 * * * *", desde);
    expect(proxima.toISOString()).toBe("2026-07-17T07:00:00.000Z");
  });

  it("respeta el paso */2 en horas con offset de minutos", () => {
    const desde = new Date("2026-07-17T06:20:00Z");
    const proxima = proximaEjecucion("15 */2 * * *", desde);
    // 06:15 ya pasó -> siguiente coincidencia de */2 es 08:15
    expect(proxima.toISOString()).toBe("2026-07-17T08:15:00.000Z");
  });

  it("el despachador de la madre '50 * * * *' cae en :50 de cada hora", () => {
    const desde = new Date("2026-07-17T06:51:00Z");
    const proxima = proximaEjecucion(CRON_DESPACHADOR_MADRE, desde);
    expect(proxima.toISOString()).toBe("2026-07-17T07:50:00.000Z");
  });

  it("cadencia diaria '0 9 * * *' cae a las 9:00 del mismo día si aún no pasó, si no al día siguiente", () => {
    const antes = new Date("2026-07-17T06:00:00Z");
    expect(proximaEjecucion("0 9 * * *", antes).toISOString()).toBe("2026-07-17T09:00:00.000Z");
    const despues = new Date("2026-07-17T10:00:00Z");
    expect(proximaEjecucion("0 9 * * *", despues).toISOString()).toBe("2026-07-18T09:00:00.000Z");
  });
});

describe("derivarCadenciaMinutos", () => {
  it("deriva minutos de un paso en horas ('15 */2 * * *' -> 120)", () => {
    expect(derivarCadenciaMinutos("15 */2 * * *")).toBe(120);
  });

  it("deriva minutos de un paso en horas mayor ('30 */6 * * *' -> 360)", () => {
    expect(derivarCadenciaMinutos("30 */6 * * *")).toBe(360);
  });

  it("deriva minutos de una cadencia por hora en punto ('50 * * * *' -> 60)", () => {
    expect(derivarCadenciaMinutos(CRON_DESPACHADOR_MADRE)).toBe(60);
  });

  it("deriva minutos de una cadencia diaria ('0 9 * * *' -> 1440)", () => {
    expect(derivarCadenciaMinutos("0 9 * * *")).toBe(1440);
  });

  it("deriva minutos de un paso en minutos ('*/15 * * * *' -> 15)", () => {
    expect(derivarCadenciaMinutos("*/15 * * * *")).toBe(15);
  });

  it("devuelve null para patrones no simples (listas, rangos, día/mes específico) en vez de inventar", () => {
    expect(derivarCadenciaMinutos("15,45 * * * *")).toBeNull();
    expect(derivarCadenciaMinutos("0 9 * * 1-5")).toBeNull();
    expect(derivarCadenciaMinutos("0 9 1 * *")).toBeNull();
  });

  it("devuelve null para una expresión cron inválida en vez de lanzar", () => {
    expect(derivarCadenciaMinutos("no-es-cron")).toBeNull();
  });
});

describe("proximoDespachoEfectivo", () => {
  it("elige el mínimo entre el tick del proyecto y el despachador de la madre", () => {
    const desde = new Date("2026-07-17T06:00:00Z");
    // próximo tick del proyecto: 06:15 (en 15 min) — antes que el despachador (06:50, en 50 min)
    const resultado = proximoDespachoEfectivo("15 */2 * * *", desde);
    expect(resultado.minutos).toBe(15);
  });

  it("cuando el proyecto es de cadencia manual (sin cron), usa solo el despachador", () => {
    const desde = new Date("2026-07-17T06:00:00Z");
    const resultado = proximoDespachoEfectivo(null, desde);
    expect(resultado.minutos).toBe(50);
  });

  it("ignora una cadencia_cron inválida en el manifest y sigue devolviendo el despachador", () => {
    const desde = new Date("2026-07-17T06:00:00Z");
    const resultado = proximoDespachoEfectivo("no-es-cron", desde);
    expect(resultado.minutos).toBe(50);
  });
});

describe("generarCadenciaEscalonada", () => {
  it("rota el offset de minutos 0/15/30/45 según el índice del proyecto", () => {
    expect(generarCadenciaEscalonada("cada-2h", 0)).toBe("0 */2 * * *");
    expect(generarCadenciaEscalonada("cada-2h", 1)).toBe("15 */2 * * *");
    expect(generarCadenciaEscalonada("cada-2h", 2)).toBe("30 */2 * * *");
    expect(generarCadenciaEscalonada("cada-2h", 3)).toBe("45 */2 * * *");
    expect(generarCadenciaEscalonada("cada-2h", 4)).toBe("0 */2 * * *");
  });

  it("cada-6h y diaria generan sus propias expresiones", () => {
    expect(generarCadenciaEscalonada("cada-6h", 1)).toBe("15 */6 * * *");
    expect(generarCadenciaEscalonada("diaria", 2)).toBe("30 6 * * *");
  });

  it("manual no genera cron (null)", () => {
    expect(generarCadenciaEscalonada("manual", 0)).toBeNull();
  });
});

describe("cronDeTrabajadoraPool", () => {
  it("devuelve el cron fijo de una trabajadora conocida", () => {
    expect(cronDeTrabajadoraPool("rutina-trabajadora-1")).toBe("10 */2 * * *");
    expect(cronDeTrabajadoraPool("rutina-trabajadora-2")).toBe("40 */2 * * *");
  });

  it("devuelve null si el nombre no sigue el patrón esperado", () => {
    expect(cronDeTrabajadoraPool("rutina-despachadora")).toBeNull();
    expect(cronDeTrabajadoraPool("routine-fabrica-consola")).toBeNull();
    expect(cronDeTrabajadoraPool("")).toBeNull();
  });

  it("devuelve null si el número no está registrado en CRON_TRABAJADORAS_POOL", () => {
    expect(cronDeTrabajadoraPool("rutina-trabajadora-99")).toBeNull();
  });

  it("la despachadora corre antes que ambas trabajadoras en el mismo ciclo de 2h", () => {
    const despachadora = parsearCron(CRON_DESPACHADORA_POOL);
    const trabajadora1 = parsearCron(cronDeTrabajadoraPool("rutina-trabajadora-1")!);
    const trabajadora2 = parsearCron(cronDeTrabajadoraPool("rutina-trabajadora-2")!);
    expect(Number(despachadora.minuto)).toBeLessThan(Number(trabajadora1.minuto));
    expect(Number(despachadora.minuto)).toBeLessThan(Number(trabajadora2.minuto));
  });
});
