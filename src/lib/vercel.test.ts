import { describe, it, expect, vi } from "vitest";
import { crearProyectoVercelConectado, eliminarProyectoVercel, obtenerEstadoDeploy } from "./vercel";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("crearProyectoVercelConectado", () => {
  it("hace POST a /v9/projects con gitRepository y devuelve la url de producción", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "prj_123", name: "mi-calculadora" }));

    const resultado = await crearProyectoVercelConectado(
      "fake-vercel-token",
      { nombre: "mi-calculadora", repoFullName: "rifc23/mi-calculadora" },
      fetchMock,
    );

    expect(resultado).toEqual({ id: "prj_123", nombre: "mi-calculadora", urlProduccion: "https://mi-calculadora.vercel.app" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vercel.com/v9/projects",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake-vercel-token" }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.gitRepository).toEqual({ type: "github", repo: "rifc23/mi-calculadora" });
    expect(body.framework).toBe("nextjs");
  });

  it("lanza con el detalle si la API de Vercel responde con error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "nombre en uso" }, false, 400));
    await expect(
      crearProyectoVercelConectado("fake-vercel-token", { nombre: "x", repoFullName: "rifc23/x" }, fetchMock),
    ).rejects.toThrow("400");
  });
});

describe("eliminarProyectoVercel", () => {
  it("hace DELETE por nombre y devuelve true si existía", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, true, 200));
    await expect(eliminarProyectoVercel("tok", "proyecto-fallido", fetchMock)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vercel.com/v9/projects/proyecto-fallido",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } }),
    );
  });

  it("devuelve false si el proyecto no existía (404) sin lanzar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));
    await expect(eliminarProyectoVercel("tok", "nada", fetchMock)).resolves.toBe(false);
  });

  it("lanza con el status en cualquier otro error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "forbidden" }, false, 403));
    await expect(eliminarProyectoVercel("tok", "x", fetchMock)).rejects.toThrow("403");
  });
});

describe("obtenerEstadoDeploy", () => {
  it("mapea READY a 'listo'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ deployments: [{ readyState: "READY" }] }));
    await expect(obtenerEstadoDeploy("tok", "calculadora", fetchMock)).resolves.toBe("listo");
    expect(fetchMock.mock.calls[0][0]).toContain("app=calculadora");
  });

  it("mapea BUILDING/QUEUED a 'desplegando'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ deployments: [{ readyState: "BUILDING" }] }));
    await expect(obtenerEstadoDeploy("tok", "x", fetchMock)).resolves.toBe("desplegando");
  });

  it("mapea ERROR a 'error' y lista vacía a 'sin-deploys'", async () => {
    const fetchError = vi.fn().mockResolvedValue(jsonResponse({ deployments: [{ readyState: "ERROR" }] }));
    await expect(obtenerEstadoDeploy("tok", "x", fetchError)).resolves.toBe("error");
    const fetchVacio = vi.fn().mockResolvedValue(jsonResponse({ deployments: [] }));
    await expect(obtenerEstadoDeploy("tok", "x", fetchVacio)).resolves.toBe("sin-deploys");
  });

  it("devuelve null si la API falla (degradación sin badge)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
    await expect(obtenerEstadoDeploy("tok", "x", fetchMock)).resolves.toBeNull();
  });
});
