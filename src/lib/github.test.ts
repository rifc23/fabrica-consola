import { describe, it, expect, vi } from "vitest";
import {
  eliminarRepo,
  obtenerProyectos,
  leerManifest,
  listarProyectosPorTopic,
  obtenerUsuarioAutenticado,
  crearDesdeTemplate,
  agregarTopic,
  leerArchivo,
  listarArchivosDirectorio,
  escribirArchivo,
  actualizarArchivoConReintento,
} from "./github";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
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

describe("obtenerUsuarioAutenticado", () => {
  it("devuelve el login del token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ login: "rifc23" }));
    const usuario = await obtenerUsuarioAutenticado("fake-token", fetchMock);
    expect(usuario).toEqual({ login: "rifc23" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/user", expect.any(Object));
  });

  it("lanza si la API responde con error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));
    await expect(obtenerUsuarioAutenticado("fake-token", fetchMock)).rejects.toThrow("401");
  });
});

describe("crearDesdeTemplate", () => {
  it("hace POST a /generate y devuelve los datos del repo creado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        name: "mi-calculadora",
        full_name: "rifc23/mi-calculadora",
        html_url: "https://github.com/rifc23/mi-calculadora",
        owner: { login: "rifc23" },
        default_branch: "main",
      }),
    );

    const resultado = await crearDesdeTemplate(
      "fake-token",
      {
        templateOwner: "rifc23",
        templateRepo: "fabrica-agentes-template",
        owner: "rifc23",
        nombre: "mi-calculadora",
        privado: true,
      },
      fetchMock,
    );

    expect(resultado).toEqual({
      owner: "rifc23",
      repo: "mi-calculadora",
      fullName: "rifc23/mi-calculadora",
      htmlUrl: "https://github.com/rifc23/mi-calculadora",
      defaultBranch: "main",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/rifc23/fabrica-agentes-template/generate",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ owner: "rifc23", name: "mi-calculadora", private: true });
  });

  it("lanza con detalle si GitHub responde con error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "ya existe" }, false, 422));
    await expect(
      crearDesdeTemplate(
        "fake-token",
        { templateOwner: "rifc23", templateRepo: "t", owner: "rifc23", nombre: "x", privado: true },
        fetchMock,
      ),
    ).rejects.toThrow("422");
  });
});

describe("agregarTopic", () => {
  it("hace PUT a /topics con la lista de nombres", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ names: ["fabrica-agentes"] }));
    await agregarTopic("fake-token", "rifc23", "mi-calculadora", ["fabrica-agentes"], fetchMock);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/rifc23/mi-calculadora/topics",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("lanza si la API responde con error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 403));
    await expect(agregarTopic("fake-token", "rifc23", "x", ["fabrica-agentes"], fetchMock)).rejects.toThrow("403");
  });
});

describe("leerArchivo", () => {
  it("decodifica el contenido base64 y devuelve el sha", async () => {
    const encoded = Buffer.from("# Backlog", "utf-8").toString("base64");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: encoded, encoding: "base64", sha: "sha123" }));
    const archivo = await leerArchivo("fake-token", "rifc23", "mi-calculadora", "docs/backlog.md", fetchMock);
    expect(archivo).toEqual({ contenido: "# Backlog", sha: "sha123" });
  });

  it("devuelve null si el archivo no existe (404)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));
    const archivo = await leerArchivo("fake-token", "rifc23", "mi-calculadora", "no-existe.md", fetchMock);
    expect(archivo).toBeNull();
  });
});

describe("listarArchivosDirectorio", () => {
  it("devuelve los nombres de archivo (filtrando directorios)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        { name: "2026-07-14-rutina.md", type: "file" },
        { name: "subcarpeta", type: "dir" },
      ]),
    );
    const archivos = await listarArchivosDirectorio("fake-token", "rifc23", "mi-calculadora", "docs/reportes", fetchMock);
    expect(archivos).toEqual(["2026-07-14-rutina.md"]);
  });

  it("devuelve [] si el directorio no existe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));
    const archivos = await listarArchivosDirectorio("fake-token", "rifc23", "x", "docs/reportes", fetchMock);
    expect(archivos).toEqual([]);
  });
});

describe("escribirArchivo", () => {
  it("codifica en base64 y envía el sha solo si se pasa (actualización)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ commit: { sha: "abc123", html_url: "https://github.com/rifc23/x/commit/abc123" } }),
    );
    const resultado = await escribirArchivo(
      "fake-token",
      "rifc23",
      "mi-calculadora",
      "docs/SPECS.md",
      "contenido",
      "docs: agrega specs",
      undefined,
      fetchMock,
    );
    expect(resultado).toEqual({ commitSha: "abc123", htmlUrl: "https://github.com/rifc23/x/commit/abc123" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.sha).toBeUndefined();
    expect(Buffer.from(body.content, "base64").toString("utf-8")).toBe("contenido");
  });

  it("lanza con status accesible cuando GitHub responde con error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "conflicto" }, false, 409));
    await expect(
      escribirArchivo("fake-token", "rifc23", "x", "docs/backlog.md", "c", "m", "sha-vieja", fetchMock),
    ).rejects.toThrow("409");
  });
});

describe("actualizarArchivoConReintento", () => {
  it("lee, transforma y escribe con el sha vigente", async () => {
    const encoded = Buffer.from("# Backlog\n\n## 📥 Inbox\n\n- (vacío)\n", "utf-8").toString("base64");
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(jsonResponse({ commit: { sha: "nuevo-sha", html_url: "https://github.com/rifc23/x/commit/nuevo-sha" } }));
      }
      return Promise.resolve(jsonResponse({ content: encoded, encoding: "base64", sha: "sha-actual" }));
    });

    const resultado = await actualizarArchivoConReintento(
      "fake-token",
      "rifc23",
      "mi-calculadora",
      "docs/backlog.md",
      "feat(inbox): agrega entrada",
      (actual) => actual.replace("- (vacío)", "- (2026-07-17) feedback"),
      fetchMock,
    );

    expect(resultado.commitSha).toBe("nuevo-sha");
    const putCall = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT")!;
    const body = JSON.parse((putCall[1] as RequestInit).body as string);
    expect(body.sha).toBe("sha-actual");
    expect(Buffer.from(body.content, "base64").toString("utf-8")).toContain("- (2026-07-17) feedback");
  });

  it("reintenta con el sha fresco si el primer PUT devuelve 409", async () => {
    const encoded = Buffer.from("contenido base", "utf-8").toString("base64");
    let intentosPUT = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        intentosPUT += 1;
        if (intentosPUT === 1) return Promise.resolve(jsonResponse({ message: "conflicto" }, false, 409));
        return Promise.resolve(jsonResponse({ commit: { sha: "sha-final", html_url: "url" } }));
      }
      return Promise.resolve(jsonResponse({ content: encoded, encoding: "base64", sha: `sha-${intentosPUT}` }));
    });

    const resultado = await actualizarArchivoConReintento(
      "fake-token",
      "rifc23",
      "x",
      "docs/backlog.md",
      "mensaje",
      (actual) => `${actual} modificado`,
      fetchMock,
    );

    expect(resultado.commitSha).toBe("sha-final");
    expect(intentosPUT).toBe(2);
  });
});

describe("eliminarRepo", () => {
  it("hace DELETE al repo y devuelve true si existía", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, true, 204));
    await expect(eliminarRepo("tok", "rifc23", "proyecto-fallido", fetchMock)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/rifc23/proyecto-fallido",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("devuelve false si el repo ya no existía (404) sin lanzar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, false, 404));
    await expect(eliminarRepo("tok", "rifc23", "nada", fetchMock)).resolves.toBe(false);
  });

  it("lanza con el status si el PAT no tiene permiso (403)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, false, 403));
    await expect(eliminarRepo("tok", "rifc23", "x", fetchMock)).rejects.toThrow("403");
  });
});
