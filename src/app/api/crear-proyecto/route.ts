import { NextResponse } from "next/server";
import {
  FABRICA_TOPIC,
  agregarTopic,
  crearDesdeTemplate,
  actualizarArchivoConReintento,
  borrarArchivo,
  escribirArchivo,
  leerArchivo,
  listarArchivosDirectorio,
  obtenerProyectos,
  obtenerUsuarioAutenticado,
  type FabricaManifest,
} from "@/lib/github";
import { crearProyectoVercelConectado, obtenerDominioProduccion } from "@/lib/vercel";
import { sembrarBacklogNuevoProyecto } from "@/lib/backlog";
import { generarCadenciaEscalonada } from "@/lib/cron";
import {
  validarFormulario,
  generarContenidoProyecto,
  agregarTareaManualVercel,
  agregarTareaManualClaveIA,
  personalizarClaudeMd,
  personalizarTareasManuales,
  personalizarAgente,
  type FormularioProyectoValidado,
} from "@/lib/formulario-proyecto";
import {
  stackEfectivo,
  frameworkVercel,
  esStackOtro,
  archivosEsqueletoVite,
  archivosABorrarDeNext,
  agregarTareaManualStackOtro,
} from "@/lib/esqueletos";

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

  // Paso 1.2: personalizar CLAUDE.md y TAREAS-MANUALES.md con las specs reales (Fase 1 del
  // método /fabrica) — sin esto, el proyecto nace con los placeholders <...> del template
  // intactos y cualquier rutina que lea CLAUDE.md como "fuente de verdad" no tiene contexto real
  // (bug detectado 2026-07-18). No es fatal si falla: el proyecto sigue siendo usable con los
  // placeholders sin rellenar, así que un error aquí solo se reporta, no aborta la creación.
  emitir({ tipo: "paso", paso: "cimientos", estado: "en-progreso" });
  try {
    const [claudeMdActual, tareasActual] = await Promise.all([
      leerArchivo(token, owner, repo, "CLAUDE.md"),
      leerArchivo(token, owner, repo, "docs/TAREAS-MANUALES.md"),
    ]);
    if (claudeMdActual) {
      await escribirArchivo(
        token,
        owner,
        repo,
        "CLAUDE.md",
        personalizarClaudeMd(claudeMdActual.contenido, body, GATE_POR_DEFECTO),
        "docs: personaliza CLAUDE.md con las specs del formulario",
        claudeMdActual.sha,
      );
    }
    if (tareasActual) {
      await escribirArchivo(
        token,
        owner,
        repo,
        "docs/TAREAS-MANUALES.md",
        personalizarTareasManuales(tareasActual.contenido, body),
        "docs: personaliza TAREAS-MANUALES.md con el nombre del proyecto",
        tareasActual.sha,
      );
    }
    // Los 7 agentes de .claude/agents/ también llevan <NOMBRE-PROYECTO> en el template (mismo
    // bug detectado 2026-07-18 al corregir 'calculadora' a mano) — se reemplaza en paralelo, uno
    // por uno tolera el fallo individual sin tumbar los demás.
    const nombresAgentes = await listarArchivosDirectorio(token, owner, repo, ".claude/agents");
    await Promise.all(
      nombresAgentes
        .filter((n) => n.endsWith(".md"))
        .map(async (nombre) => {
          const ruta = `.claude/agents/${nombre}`;
          const actual = await leerArchivo(token, owner, repo, ruta);
          if (!actual) return;
          await escribirArchivo(
            token,
            owner,
            repo,
            ruta,
            personalizarAgente(actual.contenido, body),
            `docs: personaliza ${ruta} con el nombre del proyecto`,
            actual.sha,
          );
        }),
    );
    emitir({ tipo: "paso", paso: "cimientos", estado: "ok" });
  } catch (err) {
    emitir({ tipo: "paso", paso: "cimientos", estado: "error", error: mensajeError(err) });
    // No abortamos: el proyecto sigue siendo usable con los placeholders sin rellenar.
  }

  // Paso 1.5: sembrar el esqueleto del stack elegido (el template solo trae el de Next). Ocurre
  // ANTES de conectar Vercel y ANTES de manifest/SPECS/backlog para que el primer push visible
  // ya sea el esqueleto correcto y el deploy nazca verde.
  const stack = stackEfectivo(body.stack);
  emitir({ tipo: "paso", paso: "esqueleto", estado: "en-progreso" });
  try {
    if (stack === "vite") {
      for (const ruta of archivosABorrarDeNext()) {
        await borrarArchivo(token, owner, repo, ruta, "chore(fabrica): quita el esqueleto Next para sembrar Vite");
      }
      for (const archivo of archivosEsqueletoVite(body.nombre)) {
        const existente = await leerArchivo(token, owner, repo, archivo.ruta);
        await escribirArchivo(
          token,
          owner,
          repo,
          archivo.ruta,
          archivo.contenido,
          "feat(fabrica): esqueleto Vite inicial",
          existente?.sha,
        );
      }
      emitir({ tipo: "paso", paso: "esqueleto", estado: "ok", detalle: { stack: "vite" } });
    } else if (esStackOtro(body.stack)) {
      await actualizarArchivoConReintento(
        token,
        owner,
        repo,
        "docs/TAREAS-MANUALES.md",
        "docs: tarea manual — instalar el stack 'Otro' elegido",
        (actual) => agregarTareaManualStackOtro(actual, body.stack),
      );
      emitir({
        tipo: "paso",
        paso: "esqueleto",
        estado: "omitido",
        motivo: "Stack 'Otro' — se dejó el esqueleto Next como placeholder y una tarea manual para el arquitecto-stack.",
      });
    } else {
      emitir({
        tipo: "paso",
        paso: "esqueleto",
        estado: "omitido",
        motivo: "El esqueleto Next.js del template ya corresponde al stack elegido.",
      });
    }
  } catch (err) {
    emitir({ tipo: "paso", paso: "esqueleto", estado: "error", error: mensajeError(err) });
    emitir({ tipo: "fin", ok: false, error: "El repo se creó pero no se pudo sembrar el esqueleto del stack elegido." });
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
        framework: frameworkVercel(body.stack),
      });
      // Dominio REAL asignado por Vercel — nunca adivinar <nombre>.vercel.app (espacio global:
      // si el nombre estaba tomado, el link llevaría a la app de un tercero).
      previewUrl = (await obtenerDominioProduccion(vercelToken, proyectoVercel.nombre)) ?? proyectoVercel.urlProduccion;
      emitir({ tipo: "paso", paso: "vercel", estado: "ok", detalle: { previewUrl } });
    } catch (err) {
      degradadoVercel = true;
      emitir({ tipo: "paso", paso: "vercel", estado: "error", error: mensajeError(err) });
    }
  }

  // Paso 3: manifest + SPECS.md (+ tarea manual de Vercel si aplica)
  emitir({ tipo: "paso", paso: "manifest", estado: "en-progreso" });
  let manifestId = "";
  // §1.1 del diseño: para un Gem, SPECS.md lleva el rol del usuario íntegro y el blueprint fijo
  // se suma a las features del backlog. Para el resto, es la generación genérica de siempre.
  const contenido = generarContenidoProyecto(body);
  try {
    const proyectosExistentes = await obtenerProyectos(token);
    const indice = proyectosExistentes.length; // offset escalonado por orden de creación
    const cadenciaCron = generarCadenciaEscalonada(body.cadencia, indice);
    manifestId = `fab-${slug}`;
    const manifest: FabricaManifest & { tipo?: "gem" } = {
      id: manifestId,
      nombre: body.nombre,
      creado: new Date().toISOString().slice(0, 10),
      peldano: 3,
      estado: "iterando",
      ...(cadenciaCron ? { cadencia_cron: cadenciaCron } : {}),
      ...(previewUrl ? { preview_url: previewUrl } : {}),
      ...(body.esGem ? { tipo: "gem" as const } : {}),
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
      contenido.specsMd,
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
    if (contenido.esGem) {
      await actualizarArchivoConReintento(
        token,
        owner,
        repo,
        "docs/TAREAS-MANUALES.md",
        "docs: tarea manual — key del proveedor de IA del Gem",
        (actual) => agregarTareaManualClaveIA(actual),
      );
    }
    emitir({ tipo: "paso", paso: "manifest", estado: "ok", detalle: { id: manifestId } });
  } catch (err) {
    emitir({ tipo: "paso", paso: "manifest", estado: "error", error: mensajeError(err) });
    emitir({ tipo: "fin", ok: false, error: "El repo se creó pero no se pudo commitear el manifest/SPECS.md." });
    return;
  }

  // Paso 4: siembra del backlog P0 con las features del formulario (blueprint Gem + extras, si aplica)
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
          features: contenido.featuresBacklog,
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
