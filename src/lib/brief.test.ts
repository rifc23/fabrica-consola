import { describe, it, expect } from "vitest";
import { derivarBrief, esperaEstimadaTicks } from "./brief";

const BACKLOG = `# Backlog — mi-proyecto

## P0 — Features MVP

- [x] **Feature A.** Lista.
- [ ] 🔄 **Feature B.** En curso.
- [ ] **Feature C.** Pendiente 1.
- [ ] **Feature D.** Pendiente 2.

## P1 — Siguientes

- [ ] **Feature E.** Pendiente P1.

## Registro de trabajo

| Fecha | Tarea | Rama | Commits | Gate | Estado |
|-------|-------|------|---------|------|--------|
| 2026-07-14 | Feature A | feat/a | abc123 | lint OK | Completado |
`;

describe("derivarBrief", () => {
  it("separa hecho reciente, en curso y pendientes con posición", () => {
    const brief = derivarBrief(BACKLOG);
    expect(brief.enCurso).toEqual(["**Feature B.** En curso."]);
    expect(brief.hechoReciente).toEqual(["Feature A (rama feat/a)"]);
    expect(brief.pendientes).toEqual([
      { texto: "🔄 **Feature B.** En curso.".replace("🔄 ", ""), prioridad: "P0", posicion: 1 },
      { texto: "**Feature C.** Pendiente 1.", prioridad: "P0", posicion: 2 },
      { texto: "**Feature D.** Pendiente 2.", prioridad: "P0", posicion: 3 },
      { texto: "**Feature E.** Pendiente P1.", prioridad: "P1", posicion: 4 },
    ]);
  });

  it("cuenta hechas/total por prioridad", () => {
    const brief = derivarBrief(BACKLOG);
    expect(brief.conteos.P0).toEqual({ hechas: 1, total: 4 });
    expect(brief.conteos.P1).toEqual({ hechas: 0, total: 1 });
  });

  it("cae a los checkboxes hechos si no hay filas 'Completado' en el registro", () => {
    const sinRegistro = BACKLOG.replace(/\| 2026-07-14.*\n/, "");
    const brief = derivarBrief(sinRegistro);
    expect(brief.hechoReciente).toEqual(["**Feature A.** Lista."]);
  });

  it("backlog vacío no rompe nada", () => {
    const brief = derivarBrief("# Backlog\n\nsin secciones\n");
    expect(brief).toEqual({ hechoReciente: [], enCurso: [], pendientes: [], conteos: {} });
  });
});

describe("esperaEstimadaTicks", () => {
  it("redondea hacia arriba en lotes de 4", () => {
    expect(esperaEstimadaTicks(1)).toBe(1);
    expect(esperaEstimadaTicks(4)).toBe(1);
    expect(esperaEstimadaTicks(5)).toBe(2);
    expect(esperaEstimadaTicks(8)).toBe(2);
  });
});
