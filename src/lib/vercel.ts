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
