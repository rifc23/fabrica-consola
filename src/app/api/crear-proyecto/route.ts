import { NextResponse } from "next/server";
import {
  FABRICA_TOPIC,
  agregarTopic,
  crearDesdeTemplate,
  actualizarArchivoConReintento,
  escribirArchivo,
  obtenerProyectos,
  obtenerUsuarioAutenticado,
  type FabricaManifest,
} from "@/lib/github";
import { crearProyectoVercelConectado } from "@/lib/vercel";
import { sembrarBacklogNuevoProyecto } from "@/lib/backlog";
import { generarCadenciaEscalonada } from "@/lib/cron";
import {
  validarFormulario,
  generarSpecsMd,
  agregarTareaManualVercel,
  type FormularioProyectoValidado,
} from "@/lib/formulario-proyecto";

export const dynamic = "force-dynamic";

const TEMPLATE_OWNER = "rifc23";
const TEMPLATE_REPO = "fabrica-agentes-template";
const GATE_POR_DEFECTO = "npm run lint && npm run build && npm run test:run";

type EventoProgreso =
  | { tipo: "paso"; paso: string; estado: "en-progreso" }
  | { tipo: "paso"; paso: string; estado: "ok"; detalle?: Record<string, unknown> }
  | { tipo: "paso"; paso: string; estado: "omitido"; motivo: string }
  | { tipo: "paso"; paso: string; estado: "error"; error: string }
  | {
      tipo: "fin";
      ok: true;
      proyecto: { owner: string; repo: string; htmlUrl: string; previewUrl?: string; degradadoVercel: boolean };
    }
  | { tipo: "fin"; ok: false; error: string };

function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido.";
}

async function ejecutarCreacion(
  token: string,
  body: FormularioProyectoValidado,
  emitir: (evento: EventoProgreso) => void,
) {
  const slug = body.slug;

  // Paso 1: repo desde el template + topic
  emitir({ tipo: "paso", paso: "repo", estado: "en-progreso" });
  let owner: string;
  let repo: string;
  let htmlUrl: string;
  try {
    const usuario = await obtenerUsuarioAutenticado(token);
    const creado = await crearDesdeTemplate(token, {
      templateOwner: TEMPLATE_OWNER,
      templateRepo: TEMPLATE_REPO,
      owner: usuario.login,
      nombre: slug,
      descripcion: body.objetivo.slice(0, 200),
      privado: body.visibilidad === "private",
    });
    owner = creado.owner;
    repo = creado.repo;
    htmlUrl = creado.htmlUrl;
    await agregarTopic(token, owner, repo, [FABRICA_TOPIC]);
    emitir({ tipo: "paso", paso: "repo", estado: "ok", detalle: { owner, repo, htmlUrl } });
  } catch (err) {
    emitir({ tipo: "paso", paso: "repo", estado: "error", error: mensajeError(err) });
    emitir({ tipo: "fin", ok: false, error: "No se pudo crear el repo desde el template." });
    return;
  }

  // Paso 2: conectar a Vercel (degradación elegante si falta VERCEL_TOKEN o la API falla)
  emitir({ tipo: "paso", paso: "vercel", estado: "en-progreso" });
  let previewUrl: string | undefined;
  let degradadoVercel = false;
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    degradadoVercel = true;
    emitir({
      tipo: "paso",
      paso: "vercel",
      estado: "omitido",
      motivo: "VERCEL_TOKEN no configurado — se agregó el paso manual a TAREAS-MANUALES.md",
    });
  } else {
    try {
      const proyectoVercel = await crearProyectoVercelConectado(vercelToken, {
        nombre: slug,
        repoFullName: `${owner}/${repo}`,
      });
      previewUrl = proyectoVercel.urlProduccion;
      emitir({ tipo: "paso", paso: "vercel", estado: "ok", detalle: { previewUrl } });
    } catch (err) {
      degradadoVercel = true;
      emitir({ tipo: "paso", paso: "vercel", estado: "error", error: mensajeError(err) });
    }
  }

  // Paso 3: manifest + SPECS.md (+ tarea manual de Vercel si aplica)
  emitir({ tipo: "paso", paso: "manifest", estado: "en-progreso" });
  let manifestId = "";
  try {
    const proyectosExistentes = await obtenerProyectos(token);
    const indice = proyectosExistentes.length; // offset escalonado por orden de creación
    const cadenciaCron = generarCadenciaEscalonada(body.cadencia, indice);
    manifestId = `fab-${slug}`;
    const manifest: FabricaManifest = {
      id: manifestId,
      nombre: body.nombre,
      creado: new Date().toISOString().slice(0, 10),
      peldano: 3,
      estado: "iterando",
      ...(cadenciaCron ? { cadencia_cron: cadenciaCron } : {}),
      ...(previewUrl ? { preview_url: previewUrl } : {}),
    };
    await escribirArchivo(
      token,
      owner,
      repo,
      ".fabrica.json",
      `${JSON.stringify(manifest, null, 2)}\n`,
      "chore(fabrica): manifest inicial desde la consola",
    );
    await escribirArchivo(
      token,
      owner,
      repo,
      "docs/SPECS.md",
      generarSpecsMd(body),
      "docs: SPECS.md desde el formulario de la consola",
    );

    if (degradadoVercel) {
      await actualizarArchivoConReintento(
        token,
        owner,
        repo,
        "docs/TAREAS-MANUALES.md",
        "docs: pasos manuales de conexión a Vercel",
        (actual) => agregarTareaManualVercel(actual, slug, `${owner}/${repo}`),
      );
    }
    emitir({ tipo: "paso", paso: "manifest", estado: "ok", detalle: { id: manifestId } });
  } catch (err) {
    emitir({ tipo: "paso", paso: "manifest", estado: "error", error: mensajeError(err) });
    emitir({ tipo: "fin", ok: false, error: "El repo se creó pero no se pudo commitear el manifest/SPECS.md." });
    return;
  }

  // Paso 4: siembra del backlog P0 con las features del formulario
  emitir({ tipo: "paso", paso: "backlog", estado: "en-progreso" });
  try {
    await actualizarArchivoConReintento(
      token,
      owner,
      repo,
      "docs/backlog.md",
      "docs: siembra backlog P0 desde el formulario de la consola",
      (actual) =>
        sembrarBacklogNuevoProyecto(actual, {
          nombre: body.nombre,
          fechaCreacion: new Date().toISOString().slice(0, 10),
          repoUrl: htmlUrl,
          comandosGate: GATE_POR_DEFECTO,
          features: body.features,
          decisionesReservadas: body.decisionesReservadas,
        }),
    );
    emitir({ tipo: "paso", paso: "backlog", estado: "ok" });
  } catch (err) {
    emitir({ tipo: "paso", paso: "backlog", estado: "error", error: mensajeError(err) });
    emitir({ tipo: "fin", ok: false, error: "El repo y el manifest se crearon pero no se pudo sembrar el backlog." });
    return;
  }

  emitir({ tipo: "fin", ok: true, proyecto: { owner, repo, htmlUrl, previewUrl, degradadoVercel } });
}

export async function POST(request: Request) {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT no configurado en el entorno del servidor." }, { status: 500 });
  }

  let body: FormularioProyectoValidado;
  try {
    body = validarFormulario(await request.json());
  } catch (err) {
    return NextResponse.json({ error: mensajeError(err) }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emitir = (evento: EventoProgreso) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(evento)}\n`));
      };
      try {
        await ejecutarCreacion(token, body, emitir);
      } catch (err) {
        emitir({ tipo: "fin", ok: false, error: mensajeError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
