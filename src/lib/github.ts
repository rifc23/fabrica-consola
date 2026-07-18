export const FABRICA_TOPIC = "fabrica-agentes";

export interface FabricaManifestLock {
  rutina: string;
  desde: string;
}

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
  /** Presente SOLO mientras una rutina del pool trabaja este proyecto (Motor A-pool, ver
   *  docs/diseno-consola-web.md §4). Ausente/null = proyecto libre o atendido por su
   *  routine dedicada (`trigger_id`). */
  lock?: FabricaManifestLock | null;
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

/**
 * Elimina un repositorio COMPLETO (acción destructiva e irreversible — solo la invoca el
 * endpoint de eliminar proyecto tras la confirmación explícita del usuario escribiendo el
 * nombre). Devuelve false si el repo ya no existía (404).
 */
export async function eliminarRepo(
  token: string,
  owner: string,
  repo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}`, {
    method: "DELETE",
    headers: githubHeaders(token),
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    throw new Error(`GitHub API respondió ${res.status} eliminando el repo`);
  }
  return true;
}

export interface ArchivoRepo {
  contenido: string;
  sha: string;
}

/**
 * Lee un archivo de texto de un repo vía Contents API. Devuelve null si no existe (404).
 * `ref` es opcional (nuevo parámetro AL FINAL, tras `fetchImpl`, para no romper ninguna llamada
 * posicional existente): sha/branch/tag a leer; sin él lee la default branch (HEAD), igual que
 * antes. Usado por `obtenerHistorialArchivo` para leer el contenido en un commit puntual.
 */
export async function leerArchivo(
  token: string,
  owner: string,
  repo: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
  ref?: string,
): Promise<ArchivoRepo | null> {
  const url = ref
    ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`
    : `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetchImpl(url, {
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
 * `DELETE /repos/{owner}/{repo}/contents/{path}` — borra un archivo (usado al reemplazar el
 * esqueleto Next del template por el de Vite cuando el stack elegido lo requiere). Lee el sha
 * actual primero: si el archivo ya no existe (404) es un no-op tolerado — devuelve false en vez
 * de lanzar, igual que `eliminarRepo`.
 */
export async function borrarArchivo(
  token: string,
  owner: string,
  repo: string,
  path: string,
  mensaje: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const actual = await leerArchivo(token, owner, repo, path, fetchImpl);
  if (!actual) return false;
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message: mensaje, sha: actual.sha }),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new ErrorGitHubEscritura(`GitHub API respondió ${res.status} borrando ${path}: ${detalle}`, res.status);
  }
  return true;
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

const LOCK_HUERFANO_MINUTOS = 90;

/**
 * ¿Está `lock` libre para reclamar? Ausente/null = libre. Presente pero con `desde` de hace más
 * de `LOCK_HUERFANO_MINUTOS` = lock huérfano (la rutina que lo tomó murió a medio tick) —
 * tratado como libre. `ahora` es inyectable para tests deterministas.
 */
export function lockEstaLibre(
  lock: FabricaManifestLock | null | undefined,
  ahora: Date = new Date(),
): boolean {
  if (!lock) return true;
  const desde = new Date(lock.desde).getTime();
  if (Number.isNaN(desde)) return true;
  const minutosTranscurridos = (ahora.getTime() - desde) / 60000;
  return minutosTranscurridos > LOCK_HUERFANO_MINUTOS;
}

/**
 * Reclama un proyecto para el pool de rutinas genéricas (Motor A-pool): escribe
 * `lock: {rutina, desde: ahora}` en su `.fabrica.json`, preservando el resto de campos. Lock
 * optimista — si el push falla por conflicto de sha (409/422, alguien más escribió primero),
 * devuelve `{ganado: false}` en vez de lanzar: es el caso esperado de "otra rutina ganó la
 * carrera", no un error. Antes de reclamar, verifica que el lock actual esté realmente libre
 * (`lockEstaLibre`) — si no, devuelve `{ganado: false}` sin intentar el commit.
 */
export async function reclamarProyecto(
  token: string,
  owner: string,
  repo: string,
  nombreRutina: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ganado: boolean }> {
  const actual = await leerManifestConSha(token, owner, repo, fetchImpl);
  if (!actual) return { ganado: false };
  if (!lockEstaLibre(actual.manifest.lock)) return { ganado: false };

  const nuevoManifest: FabricaManifest = {
    ...actual.manifest,
    lock: { rutina: nombreRutina, desde: new Date().toISOString() },
  };
  try {
    await escribirArchivo(
      token,
      owner,
      repo,
      ".fabrica.json",
      JSON.stringify(nuevoManifest, null, 2) + "\n",
      `fabrica: ${nombreRutina} reclama el proyecto`,
      actual.sha,
      fetchImpl,
    );
    return { ganado: true };
  } catch (err) {
    const status = err instanceof ErrorGitHubEscritura ? err.status : undefined;
    if (status === 409 || status === 422) return { ganado: false };
    throw err;
  }
}

/**
 * Libera el lock de un proyecto (`lock: null`), preservando el resto de campos. Usa
 * `actualizarArchivoConReintento` porque liberar SIEMPRE debe tener éxito eventualmente (no hay
 * "otra rutina ganó la carrera" al liberar — solo conflictos transitorios de sha con otro
 * escritor legítimo del manifest, ej. la consola actualizando `estado`), a diferencia de
 * `reclamarProyecto` donde perder la carrera es un resultado válido y esperado.
 */
export async function liberarProyecto(
  token: string,
  owner: string,
  repo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await actualizarArchivoConReintento(
    token,
    owner,
    repo,
    ".fabrica.json",
    "fabrica: libera el lock del proyecto",
    (contenidoActual) => {
      const manifest = JSON.parse(contenidoActual) as FabricaManifest;
      return JSON.stringify({ ...manifest, lock: null }, null, 2) + "\n";
    },
    fetchImpl,
  );
}

async function leerManifestConSha(
  token: string,
  owner: string,
  repo: string,
  fetchImpl: typeof fetch,
): Promise<{ manifest: FabricaManifest; sha: string } | null> {
  const archivo = await leerArchivo(token, owner, repo, ".fabrica.json", fetchImpl);
  if (!archivo) return null;
  try {
    return { manifest: JSON.parse(archivo.contenido) as FabricaManifest, sha: archivo.sha };
  } catch {
    return null;
  }
}

export interface CommitArchivo {
  sha: string;
  fecha: string;
}

/**
 * `GET /repos/{owner}/{repo}/commits?path=...` paginado (100/página) — todos los commits que
 * tocaron `path`, más reciente primero (orden nativo de la API de GitHub).
 */
export async function historialCommitsArchivo(
  token: string,
  owner: string,
  repo: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CommitArchivo[]> {
  const commits: CommitArchivo[] = [];
  let page = 1;
  for (;;) {
    const res = await fetchImpl(
      `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=100&page=${page}`,
      { headers: githubHeaders(token), cache: "no-store" } as RequestInit,
    );
    if (!res.ok) {
      throw new Error(`GitHub API respondió ${res.status} listando el historial de ${path}`);
    }
    const data = (await res.json()) as Array<{
      sha: string;
      commit: { author?: { date?: string }; committer?: { date?: string } };
    }>;
    if (data.length === 0) break;
    commits.push(
      ...data.map((c) => ({ sha: c.sha, fecha: c.commit.author?.date ?? c.commit.committer?.date ?? "" })),
    );
    if (data.length < 100) break;
    page += 1;
  }
  return commits;
}

const MAX_PUNTOS_HISTORIAL = 30;

/**
 * Muestrea `items` uniformemente a lo largo de su longitud, hasta `maxPuntos` elementos (incluye
 * siempre el primero y el último). Si `items.length <= maxPuntos`, los devuelve todos tal cual.
 * Pura, sin I/O — usada para no pedir el contenido de CADA commit de un historial largo.
 */
export function muestrearUniforme<T>(items: T[], maxPuntos: number): T[] {
  if (items.length <= maxPuntos) return items;
  if (maxPuntos <= 1) return items.slice(0, 1);
  const indicesVistos = new Set<number>();
  const resultado: T[] = [];
  for (let i = 0; i < maxPuntos; i++) {
    const idx = Math.round((i * (items.length - 1)) / (maxPuntos - 1));
    if (!indicesVistos.has(idx)) {
      indicesVistos.add(idx);
      resultado.push(items[idx]);
    }
  }
  return resultado;
}

export interface PuntoHistorialArchivo {
  sha: string;
  fecha: string;
  contenidoMarkdown: string;
}

/**
 * Serie histórica del contenido de `path`, lista para el burndown: pide el historial de commits
 * que lo tocaron, lo muestrea uniformemente a lo más `maxPuntos` (evita 1 request por commit en
 * repos con historial largo — máx ~30 por defecto) y lee el contenido del archivo en cada punto
 * muestreado. Devuelve en orden CRONOLÓGICO (más antiguo primero), listo para graficar.
 */
export async function obtenerHistorialArchivo(
  token: string,
  owner: string,
  repo: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
  maxPuntos: number = MAX_PUNTOS_HISTORIAL,
): Promise<PuntoHistorialArchivo[]> {
  const commits = await historialCommitsArchivo(token, owner, repo, path, fetchImpl);
  const cronologico = [...commits].reverse();
  const muestreados = muestrearUniforme(cronologico, maxPuntos);
  return Promise.all(
    muestreados.map(async (c) => {
      const archivo = await leerArchivo(token, owner, repo, path, fetchImpl, c.sha);
      return { sha: c.sha, fecha: c.fecha, contenidoMarkdown: archivo?.contenido ?? "" };
    }),
  );
}
