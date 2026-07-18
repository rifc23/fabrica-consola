"use client";

import { useEffect, useState } from "react";
import styles from "./ColaProyecto.module.css";
import { proximaEjecucion, derivarCadenciaMinutos } from "@/lib/cron";
import type { ItemCola } from "@/lib/backlog";

interface Props {
  cola: ItemCola[];
  cadenciaCron?: string | null;
  ultimoTick?: string | null;
}

/**
 * "🕐 Cola y tiempos" del dashboard (diseño §2.2): la cola numerada en el orden REAL del backlog,
 * el badge "🏭 trabajando ahora" cuando hay tareas `🔄`, el countdown al próximo tick (derivado de
 * `cadencia_cron` con `src/lib/cron.ts`, en el cliente para que siga corriendo sin recargar) y la
 * espera estimada de cada pendiente (`ceil(posición/4) × cadencia`, o "—" si la cadencia no es un
 * patrón simple derivable). Cero estado propio más allá del countdown: todo viene del repo.
 */
export default function ColaProyecto({ cola, cadenciaCron, ultimoTick }: Props) {
  const [minutosProximoTick, setMinutosProximoTick] = useState<number | null>(null);
  const [cronInvalido, setCronInvalido] = useState(false);

  useEffect(() => {
    const actualizar = () => {
      if (!cadenciaCron) {
        setMinutosProximoTick(null);
        setCronInvalido(false);
        return;
      }
      try {
        const proxima = proximaEjecucion(cadenciaCron, new Date());
        setMinutosProximoTick(Math.max(0, Math.round((proxima.getTime() - Date.now()) / 60000)));
        setCronInvalido(false);
      } catch {
        setMinutosProximoTick(null);
        setCronInvalido(true);
      }
    };
    actualizar();
    const t = setInterval(actualizar, 30000);
    return () => clearInterval(t);
  }, [cadenciaCron]);

  const cadenciaMinutos = cadenciaCron ? derivarCadenciaMinutos(cadenciaCron) : null;
  const hayTrabajoEnCurso = cola.some((item) => item.enCurso);

  return (
    <div className={styles.cola}>
      <div className={styles.estado}>
        {hayTrabajoEnCurso && (
          <span className={styles.trabajando}>
            🏭 trabajando ahora{ultimoTick ? ` (desde ${new Date(ultimoTick).toLocaleString()})` : ""}
          </span>
        )}
        <span className={styles.countdown}>
          {!cadenciaCron
            ? "cadencia desconocida"
            : cronInvalido
              ? "cadencia inválida"
              : minutosProximoTick !== null
                ? `⏱️ próximo tick en ~${minutosProximoTick} min`
                : "calculando…"}
        </span>
      </div>

      <ol className={styles.lista}>
        {cola.map((item) => (
          <li key={item.posicion} className={item.enCurso ? styles.itemEnCurso : undefined}>
            <span className={styles.posicion}>#{item.posicion}</span>
            <span className={styles.texto}>
              [{item.prioridad}] {item.texto}
            </span>
            {item.enCurso ? (
              <span className={styles.badgeEnCurso}>🔄 en curso</span>
            ) : (
              <span className={styles.espera}>
                {cadenciaMinutos != null
                  ? `~${Math.ceil(item.posicion / 4) * cadenciaMinutos} min de espera`
                  : "—"}
              </span>
            )}
          </li>
        ))}
        {cola.length === 0 && <li>Sin pendientes en la cola — al día.</li>}
      </ol>
    </div>
  );
}
