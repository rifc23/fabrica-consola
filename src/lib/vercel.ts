/**
 * Helpers de la API de Vercel para el deploy autónomo de proyectos nuevos (§4.5 del diseño).
 * `VERCEL_TOKEN` sigue exactamente las mismas reglas que `GITHUB_PAT`: server-side únicamente,
 * nunca en cliente/logs/git — solo se importa desde route handlers server-side (`src/app/api`).
 */

export interface CrearProyectoVercelOpts {
  /** Nombre del proyecto Vercel — debe coincidir con el slug del repo (minúsculas, guiones). */
  nombre: string;
  /** `owner/repo` del repo recién creado en GitHub. */
  repoFullName: string;
  framework?: string;
}

export interface ProyectoVercel {
  id: string;
  nombre: string;
  urlProduccion: string;
}

/**
 * `POST /v9/projects` con `gitRepository` apuntando al repo — deja el proyecto CONECTADO: cada
 * push despliega y cada PR genera preview, sin CLI. Requiere la integración GitHub↔Vercel
 * instalada una vez por cuenta (prerequisito documentado en TAREAS-MANUALES, no por proyecto).
 */
export async function crearProyectoVercelConectado(
  token: string,
  opts: CrearProyectoVercelOpts,
  fetchImpl: typeof fetch = fetch,
): Promise<ProyectoVercel> {
  const res = await fetchImpl("https://api.vercel.com/v9/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: opts.nombre,
      framework: opts.framework ?? "nextjs",
      gitRepository: { type: "github", repo: opts.repoFullName },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Vercel API respondió ${res.status} creando el proyecto: ${detalle}`);
  }

  const data = (await res.json()) as { id: string; name: string };
  return { id: data.id, nombre: data.name, urlProduccion: `https://${data.name}.vercel.app` };
}

export type EstadoDeploy = "listo" | "desplegando" | "error" | "sin-deploys";

/**
 * Estado del deploy más reciente del proyecto (`GET /v6/deployments?app=<nombre>&limit=1`).
 * Para el badge junto a la preview_url: recién creado un proyecto, Vercel tarda 1-2 min en
 * buildear y el link daría 404 — este estado evita el click ciego. Devuelve null sin token o si
 * la API falla (el dashboard degrada a mostrar el link sin badge).
 */
export async function obtenerEstadoDeploy(
  token: string,
  nombreProyecto: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EstadoDeploy | null> {
  const res = await fetchImpl(
    `https://api.vercel.com/v6/deployments?app=${encodeURIComponent(nombreProyecto)}&limit=1`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" } as RequestInit,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { deployments?: { readyState?: string }[] };
  const estado = data.deployments?.[0]?.readyState;
  if (!estado) return "sin-deploys";
  if (estado === "READY") return "listo";
  if (estado === "ERROR" || estado === "CANCELED") return "error";
  return "desplegando"; // QUEUED | BUILDING | INITIALIZING
}

/**
 * Elimina el proyecto Vercel por nombre (acción destructiva — solo desde el endpoint de
 * eliminar proyecto, tras confirmación explícita). Devuelve false si no existía (404), lo cual
 * es normal cuando el proyecto se creó sin `VERCEL_TOKEN` o ya fue borrado a mano.
 */
export async function eliminarProyectoVercel(
  token: string,
  nombre: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const res = await fetchImpl(`https://api.vercel.com/v9/projects/${encodeURIComponent(nombre)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Vercel API respondió ${res.status} eliminando el proyecto: ${detalle}`);
  }
  return true;
}
