import { NextResponse } from "next/server";
import { actualizarArchivoConReintento, obtenerProyectos } from "@/lib/github";
import { insertarEnInbox } from "@/lib/backlog";

export const dynamic = "force-dynamic";

const MAX_LARGO_TEXTO = 4000;

interface CuerpoTareas {
  owner: string;
  repo: string;
  texto: string;
}

function validar(input: unknown): CuerpoTareas {
  if (typeof input !== "object" || input === null) throw new Error("Cuerpo de la solicitud inválido.");
  const b = input as Record<string, unknown>;
  const owner = typeof b.owner === "string" ? b.owner.trim() : "";
  const repo = typeof b.repo === "string" ? b.repo.trim() : "";
  const texto = typeof b.texto === "string" ? b.texto.trim() : "";
  if (!owner || !repo) throw new Error("Falta el proyecto destino (owner/repo).");
  if (!texto) throw new Error("El texto no puede estar vacío.");
  if (texto.length > MAX_LARGO_TEXTO) {
    throw new Error(`El texto es demasiado largo (máximo ${MAX_LARGO_TEXTO} caracteres).`);
  }
  return { owner, repo, texto };
}

/**
 * Única escritura permitida sobre backlogs de proyectos existentes (regla no negociable de
 * CLAUDE.md): appendea `texto` TAL CUAL dentro de la sección `📥 Inbox` de `docs/backlog.md` del
 * proyecto — cubre tanto "＋ Nueva tarea / feedback" como las respuestas de las cards de decisión
 * (formato `Respuesta a decisión "...": ...`, ya armado por el cliente antes de llamar aquí).
 */
export async function POST(request: Request) {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT no configurado en el entorno del servidor." }, { status: 500 });
  }

  let body: CuerpoTareas;
  try {
    body = validar(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Body inválido." }, { status: 400 });
  }

  try {
    // Solo se escribe en repos que la propia consola reconoce como proyectos de la fábrica
    // (topic fabrica-agentes) — nunca en un repo arbitrario aunque el PAT tenga acceso.
    const proyectos = await obtenerProyectos(token);
    const esProyectoValido = proyectos.some((p) => p.owner === body.owner && p.repo === body.repo);
    if (!esProyectoValido) {
      return NextResponse.json(
        { error: "El proyecto no existe o no tiene el topic fabrica-agentes." },
        { status: 404 },
      );
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const resultado = await actualizarArchivoConReintento(
      token,
      body.owner,
      body.repo,
      "docs/backlog.md",
      "feat(inbox): agrega entrada desde la consola",
      (actual) => insertarEnInbox(actual, body.texto, fecha),
    );

    return NextResponse.json({ commitUrl: resultado.htmlUrl, commitSha: resultado.commitSha });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido escribiendo en el Inbox." },
      { status: 502 },
    );
  }
}
