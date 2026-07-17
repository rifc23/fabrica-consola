import { describe, it, expect } from "vitest";
import {
  extraerSecciones,
  parseCheckboxes,
  calcularProgreso,
  extraerDecisiones,
  primerasPalabras,
  formatearRespuestaDecision,
  formatearEntradaInbox,
  insertarEnInbox,
  sembrarBacklogNuevoProyecto,
  parseRegistroTrabajo,
} from "./backlog";

const BACKLOG_EJEMPLO = `# Backlog — mi-proyecto

Texto de protocolo.

## Estado general

- 2026-07-14: arrancado.

## 📥 Inbox — entradas del usuario (sin triaje)

Texto explicativo del inbox.

- (vacío)

## P0 — Features MVP

- [x] **Feature A.** Ya está lista.
- [ ] 🔄 **Feature B.** En curso ahora mismo.
- [ ] **Feature C.** Pendiente.

## P1 — Siguientes

- [ ] **Feature D.** Pendiente P1.

## Decisiones estacionadas [USUARIO]

- **Diseño visual**: ¿iteramos sobre lo mínimo o esperamos un sistema de diseño?
- **Nombre del producto**: ¿hay un nombre distinto?

## Registro de trabajo

| Fecha | Tarea | Rama | Commits | Gate | Estado |
|-------|-------|------|---------|------|--------|
| 2026-07-14 | Fase 0-1 | main | abc123 | lint OK | Completado |
`;

describe("extraerSecciones", () => {
  it("divide el markdown por encabezados de nivel 2", () => {
    const secciones = extraerSecciones(BACKLOG_EJEMPLO);
    const titulos = secciones.map((s) => s.titulo);
    expect(titulos).toContain("Estado general");
    expect(titulos).toContain("P0 — Features MVP");
    expect(titulos.some((t) => t.includes("Inbox"))).toBe(true);
  });
});

describe("parseCheckboxes", () => {
  it("detecta hecho/pendiente y el marcador 🔄 de en-curso", () => {
    const seccion = extraerSecciones(BACKLOG_EJEMPLO).find((s) => s.titulo.startsWith("P0"))!;
    const items = parseCheckboxes(seccion.contenido);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ hecho: true, enCurso: false, texto: "**Feature A.** Ya está lista." });
    expect(items[1]).toMatchObject({ hecho: false, enCurso: true });
    expect(items[1].texto.startsWith("🔄")).toBe(false);
    expect(items[2]).toMatchObject({ hecho: false, enCurso: false });
  });
});

describe("calcularProgreso", () => {
  it("cuenta checkboxes reales de P0/P1/P2 con su prioridad", () => {
    const progreso = calcularProgreso(BACKLOG_EJEMPLO);
    expect(progreso.total).toBe(4);
    expect(progreso.hechas).toBe(1);
    expect(progreso.porcentaje).toBe(25);
    expect(progreso.items.filter((i) => i.prioridad === "P0")).toHaveLength(3);
    expect(progreso.items.filter((i) => i.prioridad === "P1")).toHaveLength(1);
  });

  it("no falla con un backlog sin secciones de prioridad", () => {
    const progreso = calcularProgreso("# Backlog\n\nsin secciones\n");
    expect(progreso).toEqual({ total: 0, hechas: 0, porcentaje: 0, items: [] });
  });
});

describe("extraerDecisiones", () => {
  it("extrae las preguntas exactas de la sección [USUARIO]", () => {
    const decisiones = extraerDecisiones(BACKLOG_EJEMPLO);
    expect(decisiones).toHaveLength(2);
    expect(decisiones[0]).toContain("Diseño visual");
    expect(decisiones[1]).toContain("Nombre del producto");
  });

  it("devuelve [] si no hay sección de decisiones", () => {
    expect(extraerDecisiones("# Backlog\n\nsin nada\n")).toEqual([]);
  });
});

describe("primerasPalabras / formatearRespuestaDecision", () => {
  it("toma las primeras N palabras sin markdown", () => {
    expect(primerasPalabras("**Diseño visual**: ¿iteramos sobre lo mínimo primero?")).toBe(
      "Diseño visual: ¿iteramos sobre lo mínimo",
    );
  });

  it("formatea la respuesta con el formato exacto exigido por CLAUDE.md", () => {
    const resultado = formatearRespuestaDecision("**Diseño visual**: ¿iteramos?", "sí, iteremos primero");
    expect(resultado).toBe('Respuesta a decisión "Diseño visual: ¿iteramos?": sí, iteremos primero');
  });
});

describe("formatearEntradaInbox", () => {
  it("antepone la fecha y indenta líneas de continuación", () => {
    const resultado = formatearEntradaInbox("Primera línea\nSegunda línea", "2026-07-17");
    expect(resultado).toBe("- (2026-07-17) Primera línea\n  Segunda línea");
  });
});

describe("insertarEnInbox", () => {
  it("reemplaza el placeholder '(vacío)' con la primera entrada real", () => {
    const resultado = insertarEnInbox(BACKLOG_EJEMPLO, "Se me ocurrió una mejora", "2026-07-18");
    expect(resultado).not.toContain("- (vacío)");
    expect(resultado).toContain("- (2026-07-18) Se me ocurrió una mejora");
    // el resto del archivo permanece intacto
    expect(resultado).toContain("- [x] **Feature A.**");
    expect(resultado).toContain("**Diseño visual**");
  });

  it("agrega entradas sucesivas sin pisar las anteriores", () => {
    const conUna = insertarEnInbox(BACKLOG_EJEMPLO, "Primera entrada", "2026-07-18");
    const conDos = insertarEnInbox(conUna, "Segunda entrada", "2026-07-19");
    expect(conDos).toContain("- (2026-07-18) Primera entrada");
    expect(conDos).toContain("- (2026-07-19) Segunda entrada");
  });

  it("solo escribe dentro de la sección Inbox — nunca en P0/Decisiones", () => {
    const resultado = insertarEnInbox(BACKLOG_EJEMPLO, "feedback nuevo", "2026-07-18");
    const antes = extraerSecciones(BACKLOG_EJEMPLO).find((s) => s.titulo.startsWith("P0"))!.contenido;
    const despues = extraerSecciones(resultado).find((s) => s.titulo.startsWith("P0"))!.contenido;
    expect(despues).toBe(antes);
  });

  it("lanza si el backlog no tiene sección Inbox", () => {
    expect(() => insertarEnInbox("# Backlog\n\nsin inbox\n", "algo")).toThrow(/Inbox/);
  });
});

describe("sembrarBacklogNuevoProyecto", () => {
  const PLANTILLA = `# Backlog — <NOMBRE-PROYECTO>

Protocolo.

## Estado general

- <fecha>: proyecto arrancado con la Fábrica; esqueleto andante desplegado en <URL>; gate: <comandos> en verde.

## 📥 Inbox — entradas del usuario (sin triaje)

Texto explicativo.

- (vacío)

## P0 — Features MVP (sembradas desde las specs de la Fase 0)

- [ ] **<Feature 1>.** Criterios de aceptación: <dado X, cuando Y, entonces Z>. Archivos previstos: <...>.

## P1 — Siguientes

- [ ] ...

## Decisiones estacionadas [USUARIO]

- <pregunta exacta pendiente de decisión humana>

## Registro de trabajo

| Fecha | Tarea | Rama | Commits | Gate | Estado |
|-------|-------|------|---------|------|--------|
`;

  it("personaliza título, estado general, P0 y decisiones sin tocar el Inbox", () => {
    const resultado = sembrarBacklogNuevoProyecto(PLANTILLA, {
      nombre: "Mi Calculadora",
      fechaCreacion: "2026-07-17",
      repoUrl: "https://github.com/rifc23/mi-calculadora",
      comandosGate: "npm run lint && npm run build && npm run test:run",
      features: [
        { nombre: "Sumar", descripcion: "Permite sumar dos números.", criterios: "dado 2+2, entonces 4" },
        { nombre: "Restar", descripcion: "Permite restar dos números." },
      ],
      decisionesReservadas: ["Diseño visual", "Nombre del producto"],
    });

    expect(resultado).toContain("# Backlog — Mi Calculadora");
    expect(resultado).toContain("proyecto arrancado desde fabrica-consola");
    expect(resultado).toContain("mi-calculadora");
    expect(resultado).toContain("- [ ] **Sumar.** Permite sumar dos números. Criterios de aceptación: dado 2+2, entonces 4.");
    expect(resultado).toContain("- [ ] **Restar.** Permite restar dos números.");
    expect(resultado).toContain("- Diseño visual");
    expect(resultado).toContain("- Nombre del producto");
    expect(resultado).not.toContain("<Feature 1>");
    expect(resultado).not.toContain("<pregunta exacta");
    // el Inbox del template queda intacto (vacío, listo para la consola)
    expect(resultado).toContain("- (vacío)");
  });

  it("es robusto si falta alguna sección esperada (no-op sobre esa sección)", () => {
    const sinP0 = PLANTILLA.replace(/## P0[\s\S]*?(?=## P1)/, "");
    const resultado = sembrarBacklogNuevoProyecto(sinP0, {
      nombre: "X",
      fechaCreacion: "2026-07-17",
      repoUrl: "https://github.com/rifc23/x",
      comandosGate: "npm test",
      features: [],
      decisionesReservadas: [],
    });
    expect(resultado).toContain("# Backlog — X");
  });
});

describe("parseRegistroTrabajo", () => {
  it("extrae las filas de la tabla Registro de trabajo", () => {
    const filas = parseRegistroTrabajo(BACKLOG_EJEMPLO);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ fecha: "2026-07-14", tarea: "Fase 0-1", rama: "main", estado: "Completado" });
  });

  it("devuelve [] si no hay tabla", () => {
    expect(parseRegistroTrabajo("# Backlog\n\nsin registro\n")).toEqual([]);
  });
});
