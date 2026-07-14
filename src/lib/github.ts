export const FABRICA_TOPIC = "fabrica-agentes";

export interface FabricaManifest {
  id: string;
  nombre: string;
  creado: string;
  peldano: number;
  trigger_id?: string;
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
    { headers: githubHeaders(token) },
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
    { headers: githubHeaders(token) },
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
