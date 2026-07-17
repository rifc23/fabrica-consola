export const FABRICA_TOPIC = "fabrica-agentes";

export interface FabricaManifest {
  id: string;
  nombre: string;
  creado: string;
  peldano: number;
  trigger_id?: string;
  cadencia_cron?: string;
  ultimo_tick?: string;
  preview_url?: string;
  estado: "iterando" | "esperando-decisiones" | "completado";
}

export interface FabricaProyecto {
  repo: string;
  owner: string;
  fullName: string;
  htmlUrl: string;
  manifest: FabricaManifest | null;
}

interface GitHubRepoSearchItem {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Lista repos con el topic `fabrica-agentes` vía la API de búsqueda de GitHub. */
export async function listarProyectosPorTopic(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubRepoSearchItem[]> {
  const res = await fetchImpl(
    `https://api.github.com/search/repositories?q=topic:${FABRICA_TOPIC}`,
    { headers: githubHeaders(token), cache: "no-store" } as RequestInit,
  );
  if (!res.ok) {
    throw new Error(`GitHub API respondió ${res.status} al listar por topic`);
  }
  const data = (await res.json()) as { items: GitHubRepoSearchItem[] };
  return data.items;
}

/** Lee y parsea `.fabrica.json` de la raíz de un repo. Devuelve null si no existe o es inválido. */
export async function leerManifest(
  token: string,
  owner: string,
  repo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FabricaManifest | null> {
  const res = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repo}/contents/.fabrica.json`,
    { headers: githubHeaders(token), cache: "no-store" } as RequestInit,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding !== "base64") return null;

  try {
    const json = Buffer.from(data.content, "base64").toString("utf-8");
    return JSON.parse(json) as FabricaManifest;
  } catch {
    return null;
  }
}

/** Combina el listado por topic con su manifest — el contrato que consume el dropdown del dashboard. */
export async function obtenerProyectos(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FabricaProyecto[]> {
  const repos = await listarProyectosPorTopic(token, fetchImpl);
  return Promise.all(
    repos.map(async (r) => ({
      repo: r.name,
      owner: r.owner.login,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      manifest: await leerManifest(token, r.owner.login, r.name, fetchImpl),
    })),
  );
}

/** Usuario autenticado del PAT — necesario como `owner` al generar un repo desde el template. */
export async function obtenerUsuarioAutenticado(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ login: string }> {
  const res = await fetchImpl("https://api.github.com/user", {
    headers: githubHeaders(token),
    cache: "no-store",
  } as RequestInit);
  if (!res.ok) {
    throw new Error(`GitHub API respondió ${res.status} consultando el usuario autenticado`);
  }
  const data = (await res.json()) as { login: string };
  return { login: data.login };
}

export interface CrearDesdeTemplateOpts {
  templateOwner: string;
  templateRepo: string;
  owner: string;
  nombre: string;
  descripcion?: string;
  privado: boolean;
}

export interface RepoCreado {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
}

/** `POST /repos/{owner}/{template}/generate` — crea el repo nuevo desde el template. */
export async function crearDesdeTemplate(
  token: string,
  opts: CrearDesdeTemplateOpts,
  fetchImpl: typeof fetch = fetch,
): Promise<RepoCreado> {
  const res = await fetchImpl(
    `https://api.github.com/repos/${opts.templateOwner}/${opts.templateRepo}/generate`,
    {
      method: "POST",
      headers: { ...githubHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: opts.owner,
        name: opts.nombre,
        description: opts.descripcion ?? "",
        private: opts.privado,
        include_all_branches: false,
      }),
    },
  );
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`GitHub API respondió ${res.status} creando el repo desde el template: ${detalle}`);
  }
  const data = (await res.json()) as {
    name: string;
    full_name: string;
    html_url: string;
    owner: { login: string };
    default_branch?: string;
  };
  return {
    owner: data.owner.login,
    repo: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    defaultBranch: data.default_branch ?? "main",
  };
}

/** `PUT /repos/{owner}/{repo}/topics` — agrega el topic `fabrica-agentes` (entre otros). */
export async function agregarTopic(
  token: string,
  owner: string,
  repo: string,
  topics: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/topics`, {
    method: "PUT",
    headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ names: topics }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API respondió ${res.status} agregando topics`);
  }
}

export interface ArchivoRepo {
  contenido: string;
  sha: string;
}

/** Lee un archivo de texto de un repo vía Contents API. Devuelve null si no existe (404). */
export async function leerArchivo(
  token: string,
  owner: string,
  repo: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ArchivoRepo | null> {
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: githubHeaders(token),
    cache: "no-store",
  } as RequestInit);
  if (!res.ok) return null;
  const data = (await res.json()) as { content: string; encoding: string; sha: string };
  if (data.encoding !== "base64") return null;
  return { contenido: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha };
}

/** Lista los nombres de archivo de un directorio (usado para encontrar el reporte más reciente). */
export async function listarArchivosDirectorio(
  token: string,
  owner: string,
  repo: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: githubHeaders(token),
    cache: "no-store",
  } as RequestInit);
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return (data as Array<{ name: string; type: string }>)
    .filter((item) => item.type === "file")
    .map((item) => item.name);
}

export interface CommitResultado {
  commitSha: string;
  htmlUrl: string;
}

class ErrorGitHubEscritura extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

/** `PUT /repos/{owner}/{repo}/contents/{path}` — crea (sin sha) o actualiza (con sha) un archivo. */
export async function escribirArchivo(
  token: string,
  owner: string,
  repo: string,
  path: string,
  contenido: string,
  mensaje: string,
  shaExistente?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CommitResultado> {
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: mensaje,
      content: Buffer.from(contenido, "utf-8").toString("base64"),
      ...(shaExistente ? { sha: shaExistente } : {}),
    }),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new ErrorGitHubEscritura(
      `GitHub API respondió ${res.status} escribiendo ${path}: ${detalle}`,
      res.status,
    );
  }
  const data = (await res.json()) as { commit: { sha: string; html_url: string } };
  return { commitSha: data.commit.sha, htmlUrl: data.commit.html_url };
}

/**
 * Lee-modifica-escribe con reintento ante conflicto de sha (409/422) — usado por el Inbox: si
 * otro commit cambió el archivo entre la lectura y la escritura, vuelve a leer y reintenta en vez
 * de sobrescribir a ciegas.
 */
export async function actualizarArchivoConReintento(
  token: string,
  owner: string,
  repo: string,
  path: string,
  mensaje: string,
  transformar: (contenidoActual: string) => string,
  fetchImpl: typeof fetch = fetch,
  maxIntentos = 3,
): Promise<CommitResultado> {
  let ultimoError: unknown;
  for (let intento = 0; intento < maxIntentos; intento++) {
    const actual = await leerArchivo(token, owner, repo, path, fetchImpl);
    if (!actual) throw new Error(`No se pudo leer ${path} para actualizarlo`);
    const nuevoContenido = transformar(actual.contenido);
    try {
      return await escribirArchivo(token, owner, repo, path, nuevoContenido, mensaje, actual.sha, fetchImpl);
    } catch (err) {
      ultimoError = err;
      const status = err instanceof ErrorGitHubEscritura ? err.status : undefined;
      if (status !== 409 && status !== 422) throw err;
    }
  }
  throw ultimoError instanceof Error ? ultimoError : new Error("No se pudo actualizar el archivo tras reintentos");
}
