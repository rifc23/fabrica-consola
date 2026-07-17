import { describe, it, expect } from "vitest";
import { parametrizarPromptRoutine } from "./routine-prompt";

const PLANTILLA = `Eres el orquestador continuo de <PROYECTO> (repo <URL-REPO>).

PASO 0: 'git fetch origin <RAMA-PRINCIPAL>'.

GATE OBLIGATORIO por merge, corriendo DE VERDAD: <COMANDOS-DEL-GATE-SEPARADOS-POR-+>.

[Peldaño 4] mergea con --no-ff y haz PUSH a <RAMA-PRINCIPAL> — tienes autorización ratificada del
usuario (fecha: <FECHA-RATIFICACIÓN> en el backlog).

Commits en <IDIOMA>, revertibles por unidad.`;

describe("parametrizarPromptRoutine", () => {
  it("reemplaza todos los placeholders con los datos del proyecto", () => {
    const resultado = parametrizarPromptRoutine(PLANTILLA, {
      nombreProyecto: "Mi Calculadora",
      repoUrl: "https://github.com/rifc23/mi-calculadora",
      comandosGate: "npm run lint && npm run build && npm run test:run",
    });

    expect(resultado).toContain("orquestador continuo de Mi Calculadora");
    expect(resultado).toContain("repo https://github.com/rifc23/mi-calculadora");
    expect(resultado).toContain("git fetch origin main");
    expect(resultado).toContain("npm run lint && npm run build && npm run test:run");
    expect(resultado).toContain("fecha: pendiente en el backlog");
    expect(resultado).toContain("Commits en español");
    expect(resultado).not.toMatch(/<[A-ZÁ-Ú-]+>/);
  });

  it("permite sobreescribir rama, fecha e idioma", () => {
    const resultado = parametrizarPromptRoutine(PLANTILLA, {
      nombreProyecto: "X",
      repoUrl: "https://github.com/rifc23/x",
      comandosGate: "npm test",
      ramaPrincipal: "trunk",
      fechaRatificacion: "2026-07-20",
      idioma: "inglés",
    });
    expect(resultado).toContain("git fetch origin trunk");
    expect(resultado).toContain("fecha: 2026-07-20");
    expect(resultado).toContain("Commits en inglés");
  });
});
