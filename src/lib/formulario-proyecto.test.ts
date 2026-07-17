import { describe, it, expect } from "vitest";
import { slugificar, validarFormulario, generarSpecsMd, agregarTareaManualVercel } from "./formulario-proyecto";

describe("slugificar", () => {
  it("normaliza acentos, minúsculas y separadores", () => {
    expect(slugificar("Mi Calculadora Ñoña")).toBe("mi-calculadora-nona");
  });

  it("recorta guiones al inicio/fin y usa un default si queda vacío", () => {
    expect(slugificar("   ")).toBe("proyecto");
    expect(slugificar("---")).toBe("proyecto");
  });
});

const BODY_VALIDO = {
  nombre: "Mi Calculadora",
  objetivo: "Sumar y restar rápido",
  features: [{ nombre: "Sumar", descripcion: "Suma dos números" }],
  queNoEsV1: "multiplicación",
  stack: "Next.js+Vercel",
  presupuesto: "Capa gratuita estricta",
  decisionesReservadas: ["diseño visual"],
  visibilidad: "private",
  cadencia: "cada-2h",
};

describe("validarFormulario", () => {
  it("acepta un body válido y agrega el slug", () => {
    const resultado = validarFormulario(BODY_VALIDO);
    expect(resultado.slug).toBe("mi-calculadora");
    expect(resultado.features).toHaveLength(1);
  });

  it("rechaza sin nombre", () => {
    expect(() => validarFormulario({ ...BODY_VALIDO, nombre: "" })).toThrow(/nombre/i);
  });

  it("rechaza sin objetivo", () => {
    expect(() => validarFormulario({ ...BODY_VALIDO, objetivo: "" })).toThrow(/objetivo/i);
  });

  it("rechaza sin features MVP", () => {
    expect(() => validarFormulario({ ...BODY_VALIDO, features: [] })).toThrow(/feature/i);
  });

  it("filtra features sin nombre y cae a defaults en campos opcionales inválidos", () => {
    const resultado = validarFormulario({
      ...BODY_VALIDO,
      features: [{ nombre: "", descripcion: "sin nombre" }, { nombre: "Real", descripcion: "ok" }],
      cadencia: "algo-invalido",
      visibilidad: "otra-cosa",
    });
    expect(resultado.features).toHaveLength(1);
    expect(resultado.cadencia).toBe("cada-2h");
    expect(resultado.visibilidad).toBe("private");
  });

  it("rechaza un body que no es un objeto", () => {
    expect(() => validarFormulario(null)).toThrow();
    expect(() => validarFormulario("texto")).toThrow();
  });
});

describe("generarSpecsMd", () => {
  it("incluye objetivo, features y decisiones reservadas", () => {
    const md = generarSpecsMd(validarFormulario(BODY_VALIDO));
    expect(md).toContain("# SPECS — Mi Calculadora");
    expect(md).toContain("Sumar y restar rápido");
    expect(md).toContain("1. **Sumar** — Suma dos números");
    expect(md).toContain("- diseño visual");
  });
});

describe("agregarTareaManualVercel", () => {
  it("agrega el bloque de conexión manual al final del documento", () => {
    const resultado = agregarTareaManualVercel("# Tareas manuales\n\n- algo previo\n", "mi-calc", "rifc23/mi-calc");
    expect(resultado).toContain("- algo previo");
    expect(resultado).toContain("Conectar mi-calc a Vercel manualmente");
    expect(resultado).toContain("rifc23/mi-calc");
  });
});
