"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./EstadoPool.module.css";
import { proximaEjecucion, cronDeTrabajadoraPool, CRON_DESPACHADORA_POOL } from "@/lib/cron";
import { lockEstaLibre } from "@/lib/github";
import type { FabricaManifestLock } from "@/lib/github";

interface Props {
  owner: string;
  repo: string;
  lock?: FabricaManifestLock | null;
}

function minutosHasta(cron: string, ahora: Date): number | null {
  try {
    const proxima = proximaEjecucion(cron, ahora);
    return Math.max(0, Math.round((proxima.getTime() - ahora.getTime()) / 60000));
  } catch {
    return null;
  }
}

/**
 * "🤖 Estado del pool" del dashboard: solo se renderiza para proyectos SIN routine dedicada
 * (`trigger_id` ausente) — atendidos por el Motor A-pool en vez de una routine fija. Dos estados
 * posibles según `lock` (ver docs/diseno-consola-web.md §4):
 * - Vigente (no huérfano): "asignado a <rutina> — corre en ~X min", countdown contra el cron FIJO
 *   de esa trabajadora (no `cadencia_cron` del manifest — el pool no usa ese campo).
 * - Ausente/huérfano: "esperando asignación — próxima ronda de la despachadora en ~X min", MÁS
 *   el botón "🔧 Asignar ahora" (vía /api/asignar-proyecto): deja el proyecto listo para que una
 *   trabajadora libre lo tome en su PRÓXIMO tick normal — no lo dispara al instante (la consola
 *   no tiene acceso a fire_trigger, esa API requiere el token OAuth de la sesión de claude.ai).
 */
export default function EstadoPool({ owner, repo, lock }: Props) {
  const router = useRouter();
  const [minutos, setMinutos] = useState<number | null>(null);
  const [cronInvalido, setCronInvalido] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asignado = !lockEstaLibre(lock);
  const cronObjetivo = asignado && lock ? cronDeTrabajadoraPool(lock.rutina) : CRON_DESPACHADORA_POOL;

  useEffect(() => {
    const actualizar = () => {
      if (!cronObjetivo) {
        setMinutos(null);
        setCronInvalido(true);
        return;
      }
      const m = minutosHasta(cronObjetivo, new Date());
      if (m === null) {
        setMinutos(null);
        setCronInvalido(true);
      } else {
        setMinutos(m);
        setCronInvalido(false);
      }
    };
    actualizar();
    const t = setInterval(actualizar, 30000);
    return () => clearInterval(t);
  }, [cronObjetivo]);

  async function asignarAhora() {
    setAsignando(true);
    setError(null);
    try {
      const res = await fetch("/api/asignar-proyecto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `El servidor respondió ${res.status}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red asignando el proyecto.");
    } finally {
      setAsignando(false);
    }
  }

  return (
    <div className={styles.estadoPool}>
      {asignado && lock ? (
        <span className={styles.asignado}>
          🤖 asignado a <strong>{lock.rutina}</strong>
          {" — "}
          {cronInvalido ? "corre pronto" : minutos !== null ? `corre en ~${minutos} min` : "calculando…"}
        </span>
      ) : (
        <>
          <span className={styles.esperando}>
            ⏳ esperando asignación —{" "}
            {cronInvalido ? "próxima ronda de la despachadora pronto" : minutos !== null ? `próxima ronda de la despachadora en ~${minutos} min` : "calculando…"}
          </span>
          <button type="button" onClick={asignarAhora} disabled={asignando} className={styles.botonAsignar}>
            {asignando ? "Asignando…" : "🔧 Asignar ahora"}
          </button>
        </>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
