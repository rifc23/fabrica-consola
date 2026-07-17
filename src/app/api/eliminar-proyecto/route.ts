import { NextResponse } from "next/server";
import { eliminarRepo } from "@/lib/github";
import { eliminarProyectoVercel } from "@/lib/vercel";

export const dynamic = "force-dynamic";

interface CuerpoEliminar {
  owner: string;
  repo: string;
  confirmacion: string;
}

function validar(input: unknown): CuerpoEliminar {
  if (typeof input !== "object" || input === null) throw new Error("Cuerpo de la solicitud inválido.");
  const b = input as Record<string, unknown>;
  const owner = typeof b.owner === "string" ? b.owner.trim() : "";
  const repo = typeof b.repo === "string" ? b.repo.trim() : "";
  const confirmacion = typeof b.confirmacion === "string" ? b.confirmacion.trim() : "";
  if (!owner || !repo) throw new Error("Falta el proyecto a eliminar (owner/repo).");
  if (confirmacion !== repo) {
    throw new Error("La confirmación no coincide: escribe el nombre EXACTO del repo para eliminarlo.");
  }
  return { owner, repo, confirmacion };
}

/**
 * Eliminación COMPLETA de un proyecto de la fábrica (decisión del usuario, 2026-07-17): borra el
 * proyecto Vercel (si hay `VERCEL_TOKEN`; 404 tolerado) y el repositorio de GitHub. Acción
 * destructiva e irreversible — el cliente exige escribir el nombre exacto del repo y este
 * endpoint lo re-valida server-side. La routine del proyecto (si existía) queda huérfana: su
 * candado/anti-solape hará que sus ticks terminen sin repo, y se elimina desde la UI de routines
 * (se informa en la respuesta).
 */
export async function POST(request: Request) {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT no configurado en el entorno del servidor." }, { status: 500 });
  }

  let cuerpo: CuerpoEliminar;
  try {
    cuerpo = validar(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Solicitud inválida." }, { status: 400 });
  }

  const resultado = { vercel: "sin token — revisa/borra a mano en vercel.com si existía", repo: "" };

  const vercelToken = process.env.VERCEL_TOKEN;
  if (vercelToken) {
    try {
      const existia = await eliminarProyectoVercel(vercelToken, cuerpo.repo);
      resultado.vercel = existia ? "eliminado" : "no existía";
    } catch (e) {
      return NextResponse.json(
        { error: `No se pudo eliminar el proyecto Vercel (no se tocó el repo): ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      );
    }
  }

  try {
    const existia = await eliminarRepo(token, cuerpo.owner, cuerpo.repo);
    resultado.repo = existia ? "eliminado" : "no existía";
  } catch (e) {
    return NextResponse.json(
      { error: `Proyecto Vercel: ${resultado.vercel}; pero el repo NO pudo eliminarse: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...resultado,
    nota: "Si el proyecto tenía routine instalada, elimínala desde la UI de routines de claude.ai.",
  });
}
