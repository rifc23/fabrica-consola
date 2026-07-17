import { NextResponse } from "next/server";
import { obtenerProyectos } from "@/lib/github";

// Lectura sin caché (regla no negociable "frescura"): un proyecto recién creado debe aparecer
// en el dropdown inmediatamente después del redirect, sin esperar una revalidación.
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_PAT no configurado en el entorno del servidor." },
      { status: 500 },
    );
  }

  try {
    const proyectos = await obtenerProyectos(token);
    return NextResponse.json({ proyectos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando GitHub." },
      { status: 502 },
    );
  }
}
