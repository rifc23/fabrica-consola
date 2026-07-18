import { describe, it, expect } from "vitest";
import { calcularSerieBurndown } from "./burndown";

const backlogConNPendientes = (n: number, hechas: number) => {
  const pendientes = Array.from({ length: n }, (_, i) => `- [ ] tarea pendiente ${i}`);
  const completadas = Array.from({ length: hechas }, (_, i) => `- [x] tarea hecha ${i}`);
  return `# Backlog\n\n## P0 — Features MVP\n\n${[...pendientes, ...completadas].join("\n")}\n`;
};

describe("calcularSerieBurndown", () => {
  it("cuenta los checkboxes pendientes de cada punto y preserva la fecha", () => {
    const puntos = [
      { fecha: "2026-07-14T10:00:00Z", contenidoMarkdown: backlogConNPendientes(5, 0) },
      { fecha: "2026-07-15T10:00:00Z", contenidoMarkdown: backlogConNPendientes(2, 3) },
    ];
    const serie = calcularSerieBurndown(puntos);
    expect(serie).toEqual([
      { fecha: "2026-07-14T10:00:00Z", pendientes: 5 },
      { fecha: "2026-07-15T10:00:00Z", pendientes: 2 },
    ]);
  });

  it("serie decreciente: el burndown baja con cada tick que completa tareas", () => {
    const puntos = [
      { fecha: "2026-07-14", contenidoMarkdown: backlogConNPendientes(8, 0) },
      { fecha: "2026-07-15", contenidoMarkdown: backlogConNPendientes(5, 3) },
      { fecha: "2026-07-16", contenidoMarkdown: backlogConNPendientes(1, 7) },
    ];
    const serie = calcularSerieBurndown(puntos);
    expect(serie.map((p) => p.pendientes)).toEqual([8, 5, 1]);
  });

  it("serie creciente: el burndown sube si se agregan tareas nuevas al backlog", () => {
    const puntos = [
      { fecha: "2026-07-14", contenidoMarkdown: backlogConNPendientes(1, 0) },
      { fecha: "2026-07-15", contenidoMarkdown: backlogConNPendientes(4, 0) },
      { fecha: "2026-07-16", contenidoMarkdown: backlogConNPendientes(9, 0) },
    ];
    const serie = calcularSerieBurndown(puntos);
    expect(serie.map((p) => p.pendientes)).toEqual([1, 4, 9]);
  });

  it("reordena por fecha aunque los puntos de entrada vengan desordenados", () => {
    const puntos = [
      { fecha: "2026-07-16", contenidoMarkdown: backlogConNPendientes(1, 0) },
      { fecha: "2026-07-14", contenidoMarkdown: backlogConNPendientes(8, 0) },
      { fecha: "2026-07-15", contenidoMarkdown: backlogConNPendientes(5, 0) },
    ];
    const serie = calcularSerieBurndown(puntos);
    expect(serie.map((p) => p.fecha)).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"]);
  });

  it("degrada sin explotar con 0 puntos", () => {
    expect(calcularSerieBurndown([])).toEqual([]);
  });

  it("degrada sin explotar con 1 solo punto", () => {
    const serie = calcularSerieBurndown([{ fecha: "2026-07-14", contenidoMarkdown: backlogConNPendientes(3, 1) }]);
    expect(serie).toEqual([{ fecha: "2026-07-14", pendientes: 3 }]);
  });

  it("un backlog sin checkboxes da 0 pendientes, no explota", () => {
    const serie = calcularSerieBurndown([
      { fecha: "2026-07-14", contenidoMarkdown: "# Backlog\n\nSin tareas todavía.\n" },
    ]);
    expect(serie).toEqual([{ fecha: "2026-07-14", pendientes: 0 }]);
  });
});
