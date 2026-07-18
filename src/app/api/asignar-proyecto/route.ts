import { NextResponse } from "next/server";
import { obtenerProyectos, reclamarProyecto, trabajadorasLibres } from "@/lib/github";

export const dynamic = "force-dynamic";

interface CuerpoAsignar {
  owner: string;
  repo: string;
}

function validar(input: unknown): CuerpoAsignar {
  if (typeof input !== "object" || input === null) throw new Error("Cuerpo de la solicitud inválido.");
  const b = input as Record<string, unknown>;
  const owner = typeof b.owner === "string" ? b.owner.trim() : "";
  const repo = typeof b.repo === "string" ? b.repo.trim() : "";
  if (!owner || !repo) throw new Error("Falta el proyecto a asignar (owner/repo).");
  return { owner, repo };
}

/**
 * "🔧 Asignar ahora" del dashboard (Motor A-pool, ver docs/diseno-consola-web.md §4): deja el
 * proyecto listo para que una rutina trabajadora lo tome en su PRÓXIMO tick normal — no lo
 * dispara al instante. La consola no tiene acceso a `list_triggers`/`fire_trigger` (esa API
 * requiere el token OAuth de la sesión de claude.ai, que nunca vive en un servidor público), así
 * que "trabajadora libre" se infiere leyendo el `lock` de todos los proyectos del catálogo
 * (`trabajadorasLibres`) en vez de preguntarle a la API de rutinas.
 */
export async function POST(request: Request) {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT no configurado en el entorno del servidor." }, { status: 500 });
  }

  let cuerpo: CuerpoAsignar;
  try {
    cuerpo = validar(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Solicitud inválida." }, { status: 400 });
  }

  try {
    const proyectos = await obtenerProyectos(token);
    const proyecto = proyectos.find((p) => p.owner === cuerpo.owner && p.repo === cuerpo.repo);
    if (!proyecto) {
      return NextResponse.json(
        { error: "El proyecto no existe o no tiene el topic fabrica-agentes." },
        { status: 404 },
      );
    }
    if (proyecto.manifest?.trigger_id) {
      return NextResponse.json(
        { error: "Este proyecto tiene su propia routine dedicada — no lo atiende el pool." },
        { status: 409 },
      );
    }

    const libres = trabajadorasLibres(proyectos);
    if (libres.length === 0) {
      return NextResponse.json(
        { error: "Las rutinas trabajadoras están ocupadas ahora mismo — inténtalo de nuevo en unos minutos." },
        { status: 409 },
      );
    }

    const resultado = await reclamarProyecto(token, cuerpo.owner, cuerpo.repo, libres[0]);
    if (!resultado.ganado) {
      return NextResponse.json(
        { error: "Otra rutina (la despachadora o una trabajadora) acaba de tomar este proyecto — ya está en cola." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, rutina: libres[0] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido asignando el proyecto." },
      { status: 502 },
    );
  }
}
