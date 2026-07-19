import { describe, it, expect, vi } from "vitest";
import {
  CLAVE_BORRADOR,
  borradorEstaVacio,
  guardarBorrador,
  leerBorrador,
  borrarBorrador,
  type BorradorNuevoProyecto,
} from "./borrador-nuevo-proyecto";

const BORRADOR_VACIO: BorradorNuevoProyecto = {
  nombre: "",
  objetivo: "",
  esGem: false,
  rolGem: "",
  features: [{ id: "f1", nombre: "", descripcion: "", criterios: "" }],
  queNoEsV1: "",
  stackSeleccionado: "🏭 Recomiéndame (menor costo)",
  stackOtro: "",
  presupuesto: "Capa gratuita estricta",
  decisiones: [{ texto: "diseño visual", marcada: true }],
  decisionOtra: "",
  visibilidad: "private",
  cadencia: "cada-2h",
  notificacionesTelegram: "",
};

function storageFalso() {
  const datos = new Map<string, string>();
  return {
    getItem: vi.fn((k: string) => datos.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void datos.set(k, v)),
    removeItem: vi.fn((k: string) => void datos.delete(k)),
  };
}

describe("borradorEstaVacio", () => {
  it("es true para el estado inicial del formulario", () => {
    expect(borradorEstaVacio(BORRADOR_VACIO)).toBe(true);
  });

  it("es false apenas hay un campo con contenido", () => {
    expect(borradorEstaVacio({ ...BORRADOR_VACIO, nombre: "Mi app" })).toBe(false);
  });

  it("es false si una feature tiene contenido aunque los campos top-level estén vacíos", () => {
    const conFeature = {
      ...BORRADOR_VACIO,
      features: [{ id: "f1", nombre: "Login", descripcion: "", criterios: "" }],
    };
    expect(borradorEstaVacio(conFeature)).toBe(false);
  });
});

describe("guardarBorrador / leerBorrador", () => {
  it("guarda y recupera un borrador con contenido", () => {
    const storage = storageFalso();
    const borrador = { ...BORRADOR_VACIO, nombre: "Ticket-OCR", objetivo: "Leer tickets" };
    guardarBorrador(storage, borrador);
    expect(leerBorrador(storage)).toEqual(borrador);
  });

  it("no escribe nada (y limpia lo previo) si el borrador está vacío", () => {
    const storage = storageFalso();
    storage.setItem(CLAVE_BORRADOR, JSON.stringify({ ...BORRADOR_VACIO, nombre: "viejo" }));
    guardarBorrador(storage, BORRADOR_VACIO);
    expect(storage.removeItem).toHaveBeenCalledWith(CLAVE_BORRADOR);
    expect(leerBorrador(storage)).toBeNull();
  });

  it("leerBorrador devuelve null si no hay nada guardado", () => {
    expect(leerBorrador(storageFalso())).toBeNull();
  });

  it("leerBorrador descarta en silencio un JSON corrupto", () => {
    const storage = storageFalso();
    storage.setItem(CLAVE_BORRADOR, "{esto no es json");
    expect(leerBorrador(storage)).toBeNull();
  });

  it("leerBorrador descarta un objeto sin la forma esperada", () => {
    const storage = storageFalso();
    storage.setItem(CLAVE_BORRADOR, JSON.stringify({ algo: "distinto" }));
    expect(leerBorrador(storage)).toBeNull();
  });
});

describe("borrarBorrador", () => {
  it("quita la clave del storage", () => {
    const storage = storageFalso();
    storage.setItem(CLAVE_BORRADOR, "algo");
    borrarBorrador(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(CLAVE_BORRADOR);
  });
});
