import { describe, it, expect, vi } from "vitest";
import { obtenerProyectos, leerManifest, listarProyectosPorTopic } from "./github";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("listarProyectosPorTopic", () => {
  it("devuelve los items de la búsqueda por topic", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          { name: "mi-calculadora", full_name: "rifc23/mi-calculadora", html_url: "https://github.com/rifc23/mi-calculadora", owner: { login: "rifc23" } },
        ],
      }),
    );
    const items = await listarProyectosPorTopic("fake-token", fetchMock);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("mi-calculadora");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("topic:fabrica-agentes"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer fake-token" }) }),
    );
  });

  it("lanza si la API de GitHub responde con error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 403));
    await expect(listarProyectosPorTopic("fake-token", fetchMock)).rejects.toThrow("403");
  });
});

describe("leerManifest", () => {
  it("parsea el .fabrica.json codificado en base64", async () => {
    const manifest = {
      id: "fab-mi-calc",
      nombre: "Mi Calculadora",
      creado: "2026-07-14",
      peldano: 3,
      estado: "iterando" as const,
    };
    const encoded = Buffer.from(JSON.stringify(manifest), "utf-8").toString("base64");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: encoded, encoding: "base64" }));

    const result = await leerManifest("fake-token", "rifc23", "mi-calculadora", fetchMock);
    expect(result).toEqual(manifest);
  });

  it("devuelve null si el repo no tiene manifest (404)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));
    const result = await leerManifest("fake-token", "rifc23", "sin-manifest", fetchMock);
    expect(result).toBeNull();
  });

  it("devuelve null si el contenido no es JSON válido", async () => {
    const encoded = Buffer.from("no es json", "utf-8").toString("base64");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: encoded, encoding: "base64" }));
    const result = await leerManifest("fake-token", "rifc23", "roto", fetchMock);
    expect(result).toBeNull();
  });
});

describe("obtenerProyectos", () => {
  it("combina el listado por topic con su manifest respectivo", async () => {
    const manifest = {
      id: "fab-mi-calc",
      nombre: "Mi Calculadora",
      creado: "2026-07-14",
      peldano: 3,
      estado: "iterando" as const,
    };
    const encoded = Buffer.from(JSON.stringify(manifest), "utf-8").toString("base64");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(
          jsonResponse({
            items: [{ name: "mi-calculadora", full_name: "rifc23/mi-calculadora", html_url: "https://github.com/rifc23/mi-calculadora", owner: { login: "rifc23" } }],
          }),
        );
      }
      return Promise.resolve(jsonResponse({ content: encoded, encoding: "base64" }));
    });

    const proyectos = await obtenerProyectos("fake-token", fetchMock);
    expect(proyectos).toHaveLength(1);
    expect(proyectos[0]).toMatchObject({
      repo: "mi-calculadora",
      owner: "rifc23",
      manifest,
    });
  });
});
