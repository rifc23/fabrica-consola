import type { PuntoBurndown } from "@/lib/burndown";
import styles from "./Burndown.module.css";

interface Props {
  serie: PuntoBurndown[];
}

// Coordenadas internas del SVG — el `viewBox` las escala al ancho real del contenedor (responsive,
// sin scroll horizontal desde 360px: regla Multiplataforma SIEMPRE de CLAUDE.md).
const ANCHO = 600;
const ALTO = 220;
const PADDING = { top: 16, right: 12, bottom: 40, left: 32 };
const MAX_ETIQUETAS_FECHA = 6;

function formatearFechaCorta(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso.slice(0, 10);
  return fecha.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}

/** Gráfica SVG propia (sin librería — regla del backlog) del burn-down: pendientes vs. tiempo. */
export default function Burndown({ serie }: Props) {
  if (serie.length < 2) {
    return (
      <p className={styles.vacio}>
        Aún no hay suficiente historial de commits sobre el backlog para graficar el burndown (se
        necesitan al menos 2 puntos).
      </p>
    );
  }

  const maxPendientes = Math.max(...serie.map((p) => p.pendientes), 1);
  const anchoUtil = ANCHO - PADDING.left - PADDING.right;
  const altoUtil = ALTO - PADDING.top - PADDING.bottom;

  const puntos = serie.map((p, i) => {
    const x = PADDING.left + (i / (serie.length - 1)) * anchoUtil;
    const y = PADDING.top + altoUtil - (p.pendientes / maxPendientes) * altoUtil;
    return { x, y, ...p };
  });

  const puntosLinea = puntos.map((p) => `${p.x},${p.y}`).join(" ");
  // No amontona etiquetas de fecha en pantallas angostas: muestra como mucho ~6, distribuidas.
  const pasoEtiquetas = Math.max(1, Math.ceil(puntos.length / MAX_ETIQUETAS_FECHA));

  return (
    <div className={styles.contenedor}>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className={styles.svg}
        role="img"
        aria-label="Gráfica de burndown: tareas pendientes del backlog a lo largo del tiempo"
      >
        {[0, 0.5, 1].map((frac) => {
          const y = PADDING.top + altoUtil - frac * altoUtil;
          const valor = Math.round(frac * maxPendientes);
          return (
            <g key={frac}>
              <line x1={PADDING.left} y1={y} x2={ANCHO - PADDING.right} y2={y} className={styles.guia} />
              <text x={PADDING.left - 6} y={y} textAnchor="end" dominantBaseline="middle" className={styles.etiquetaEje}>
                {valor}
              </text>
            </g>
          );
        })}

        <polyline points={puntosLinea} className={styles.linea} fill="none" />

        {puntos.map((p, i) => (
          <g key={`${p.fecha}-${i}`}>
            <circle cx={p.x} cy={p.y} r={3.5} className={styles.punto} />
            {(i % pasoEtiquetas === 0 || i === puntos.length - 1) && (
              <text
                x={p.x}
                y={ALTO - PADDING.bottom + 16}
                textAnchor="middle"
                className={styles.etiquetaEje}
                transform={`rotate(-40 ${p.x} ${ALTO - PADDING.bottom + 16})`}
              >
                {formatearFechaCorta(p.fecha)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className={styles.resumen}>
        {serie[0].pendientes} → {serie[serie.length - 1].pendientes} pendientes ({serie.length} puntos de
        historial)
      </p>
    </div>
  );
}
