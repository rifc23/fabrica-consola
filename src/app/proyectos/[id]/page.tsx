import { notFound } from "next/navigation";
import { obtenerProyectos, leerArchivo, listarArchivosDirectorio } from "@/lib/github";
import { calcularProgreso, extraerDecisiones } from "@/lib/backlog";
import { derivarBrief, esperaEstimadaTicks } from "@/lib/brief";
import { renderMarkdownSanitizado } from "@/lib/markdown";
import { parametrizarPromptRoutine } from "@/lib/routine-prompt";
import BotonActualizar from "@/components/BotonActualizar";
import NuevaTarea from "@/components/NuevaTarea";
import DecisionCard from "@/components/DecisionCard";
import CopiarBoton from "@/components/CopiarBoton";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

const GATE_POR_DEFECTO = "npm run lint && npm run build && npm run test:run";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardProyecto({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const token = process.env.GITHUB_PAT;

  if (!token) {
    return (
      <div className="container">
        <p role="alert">GITHUB_PAT no configurado en el entorno del servidor.</p>
      </div>
    );
  }

  const proyectos = await obtenerProyectos(token);
  const proyecto = proyectos.find((p) => p.repo === id);
  if (!proyecto) notFound();

  const { owner, repo, htmlUrl, manifest } = proyecto;

  const [backlogArchivo, tareasArchivo, nombresReportes] = await Promise.all([
    leerArchivo(token, owner, repo, "docs/backlog.md"),
    leerArchivo(token, owner, repo, "docs/TAREAS-MANUALES.md"),
    listarArchivosDirectorio(token, owner, repo, "docs/reportes"),
  ]);

  const backlogMd = backlogArchivo?.contenido ?? "";
  const progreso = calcularProgreso(backlogMd);
  const decisiones = extraerDecisiones(backlogMd);
  const brief = derivarBrief(backlogMd);

  const nombreReporteReciente = nombresReportes
    .filter((n) => n.endsWith(".md"))
    .sort()
    .reverse()[0];
  const reporteArchivo = nombreReporteReciente
    ? await leerArchivo(token, owner, repo, `docs/reportes/${nombreReporteReciente}`)
    : null;

  let promptRoutine: string | null = null;
  if (!manifest?.trigger_id) {
    const plantilla = await leerArchivo(token, owner, repo, "docs/plantilla-routine-prompt.md");
    if (plantilla) {
      promptRoutine = parametrizarPromptRoutine(plantilla.contenido, {
        nombreProyecto: manifest?.nombre || repo,
        repoUrl: htmlUrl,
        comandosGate: GATE_POR_DEFECTO,
      });
    }
  }

  const generadoEn = new Date().toISOString();
  const creadoBanner = sp.creado === "1";
  const previewDesdeQuery = typeof sp.preview === "string" ? sp.preview : undefined;
  const degradadoVercelQuery = sp.degradado === "1";
  const previewUrl = manifest?.preview_url || previewDesdeQuery;

  return (
    <div className={`container ${styles.pagina}`}>
      {creadoBanner && (
        <div className={styles.banner}>
          <strong>✅ Proyecto creado.</strong>
          <span>
            Repo: <a href={htmlUrl} target="_blank" rel="noopener noreferrer">{htmlUrl}</a>
          </span>
          {previewUrl && (
            <span>
              Preview: <a href={previewUrl} target="_blank" rel="noopener noreferrer">{previewUrl}</a>
            </span>
          )}
          {degradadoVercelQuery && (
            <span>
              No se encontró VERCEL_TOKEN — la conexión a Vercel quedó como tarea manual en su
              TAREAS-MANUALES.md.
            </span>
          )}
          {!manifest?.trigger_id && (
            <span>
              🏭 la routine madre la instalará automáticamente (≤1h) — mientras tanto, mira la
              sección &quot;Instalar la routine&quot; más abajo.
            </span>
          )}
        </div>
      )}

      <div className={styles.cabecera}>
        <div className={styles.tituloFila}>
          <h1>{manifest?.nombre || repo}</h1>
          <span className={styles.badge}>{manifest?.estado ?? "sin manifest"}</span>
        </div>
        <div className={styles.enlaces}>
          <a href={htmlUrl} target="_blank" rel="noopener noreferrer">
            📦 Repo en GitHub
          </a>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              🔗 Preview
            </a>
          )}
        </div>
        <BotonActualizar generadoEn={generadoEn} autoRefresh etiqueta="dashboard" />
      </div>

      <section className={styles.seccion} aria-labelledby="titulo-progreso">
        <h2 id="titulo-progreso">📊 Progreso</h2>
        <div className={styles.barraProgreso}>
          <div className={styles.barraProgresoRelleno} style={{ width: `${progreso.porcentaje}%` }} />
        </div>
        <p>
          {progreso.hechas} / {progreso.total} tareas completadas ({progreso.porcentaje}%)
        </p>
        <ul className={styles.listaFeatures}>
          {progreso.items.map((item, i) => (
            <li key={i}>
              <span aria-hidden="true">{item.hecho ? "✅" : item.enCurso ? "🔄" : "⏳"}</span>
              <span>
                [{item.prioridad}] {item.texto}
              </span>
            </li>
          ))}
          {progreso.items.length === 0 && <li>Sin tareas en el backlog todavía.</li>}
        </ul>
      </section>

      <section className={styles.seccion} aria-labelledby="titulo-decisiones">
        <h2 id="titulo-decisiones">🔔 Decisiones que te esperan</h2>
        {decisiones.length === 0 && <p>Sin decisiones estacionadas por ahora.</p>}
        {decisiones.map((pregunta, i) => (
          <DecisionCard key={i} pregunta={pregunta} owner={owner} repo={repo} cadenciaCron={manifest?.cadencia_cron} />
        ))}
      </section>

      <section className={styles.seccion} aria-labelledby="titulo-brief">
        <div className={styles.seccionCabecera}>
          <h2 id="titulo-brief">📋 Brief</h2>
          <BotonActualizar generadoEn={generadoEn} etiqueta="brief" />
        </div>
        <div className={styles.conteos}>
          {Object.entries(brief.conteos).map(([prioridad, c]) => (
            <span key={prioridad} className={styles.badge}>
              {prioridad}: {c.hechas}/{c.total}
            </span>
          ))}
        </div>
        <h3>✅ Hecho recientemente</h3>
        <ul className={styles.listaFeatures}>
          {brief.hechoReciente.length ? brief.hechoReciente.map((t, i) => <li key={i}>{t}</li>) : <li>(nada todavía)</li>}
        </ul>
        <h3>🔄 En curso</h3>
        <ul className={styles.listaFeatures}>
          {brief.enCurso.length ? brief.enCurso.map((t, i) => <li key={i}>{t}</li>) : <li>(nada en curso ahora)</li>}
        </ul>
        <h3>⏳ Pendientes (posición en la cola)</h3>
        <ul className={styles.listaFeatures}>
          {brief.pendientes.slice(0, 10).map((p) => (
            <li key={p.posicion}>
              #{p.posicion} [{p.prioridad}] {p.texto} — ~{esperaEstimadaTicks(p.posicion)} tick(s)
            </li>
          ))}
          {brief.pendientes.length === 0 && <li>Sin pendientes.</li>}
        </ul>
      </section>

      <section className={styles.seccion} aria-labelledby="titulo-reporte">
        <h2 id="titulo-reporte">📝 Último reporte</h2>
        {reporteArchivo ? (
          <div
            className={styles.markdown}
            dangerouslySetInnerHTML={{ __html: renderMarkdownSanitizado(reporteArchivo.contenido) }}
          />
        ) : (
          <p>Todavía no hay reportes en docs/reportes/.</p>
        )}
      </section>

      <section className={styles.seccion} aria-labelledby="titulo-tareas-manuales">
        <div className={styles.seccionCabecera}>
          <h2 id="titulo-tareas-manuales">🧑 Tareas manuales</h2>
          <BotonActualizar generadoEn={generadoEn} etiqueta="tareas manuales" />
        </div>
        {tareasArchivo ? (
          <div
            className={styles.markdown}
            dangerouslySetInnerHTML={{ __html: renderMarkdownSanitizado(tareasArchivo.contenido) }}
          />
        ) : (
          <p>Sin TAREAS-MANUALES.md en este repo.</p>
        )}
      </section>

      {promptRoutine && (
        <section className={styles.seccion} aria-labelledby="titulo-instalar-routine">
          <h2 id="titulo-instalar-routine">🏭 Instalar la routine</h2>
          <p>
            La routine madre instala esto automáticamente (≤1h). Si prefieres hacerlo ya: pega
            este prompt en la UI de routines de claude.ai, cadencia sugerida{" "}
            {manifest?.cadencia_cron ?? "cada 2 horas"}.
          </p>
          <details className={styles.detallesInstalacion}>
            <summary>Ver prompt parametrizado</summary>
            <pre>{promptRoutine}</pre>
            <CopiarBoton texto={promptRoutine} etiqueta="📋 Copiar prompt" />
          </details>
        </section>
      )}

      <section className={styles.seccion} aria-labelledby="titulo-inbox">
        <h2 id="titulo-inbox">＋ Nueva tarea / feedback</h2>
        <NuevaTarea owner={owner} repo={repo} />
      </section>
    </div>
  );
}
