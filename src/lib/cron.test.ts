import { describe, it, expect } from "vitest";
import {
  parsearCron,
  proximaEjecucion,
  proximoDespachoEfectivo,
  generarCadenciaEscalonada,
  CRON_DESPACHADOR_MADRE,
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
