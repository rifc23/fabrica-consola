"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ProgresoCreacion.module.css";
import type { FormularioProyecto } from "@/lib/formulario-proyecto";

export interface ProyectoCreado {
  owner: string;
  repo: string;
  htmlUrl: string;
  previewUrl?: string;
  degradadoVercel: boolean;
}

type PasoId = "repo" | "vercel" | "manifest" | "backlog";
type EstadoPaso = "pendiente" | "en-progreso" | "ok" | "omitido" | "error";

type EventoProgreso =
  | { tipo: "paso"; paso: PasoId; estado: "en-progreso" }
  | { tipo: "paso"; paso: PasoId; estado: "ok"; detalle?: Record<string, unknown> }
  | { tipo: "paso"; paso: PasoId; estado: "omitido"; motivo: string }
  | { tipo: "paso"; paso: PasoId; estado: "error"; error: string }
  | { tipo: "fin"; ok: true; proyecto: ProyectoCreado }
  | { tipo: "fin"; ok: false; error: string };

interface InfoPaso {
  estado: EstadoPaso;
  detalle?: string;
}

const PASOS: { id: PasoId; etiqueta: string }[] = [
  { id: "repo", etiqueta: "Creando el repo desde el template + topic fabrica-agentes" },
  { id: "vercel", etiqueta: "Conectando el proyecto a Vercel" },
  { id: "manifest", etiqueta: "Commiteando .fabrica.json y docs/SPECS.md" },
  { id: "backlog", etiqueta: "Sembrando docs/backlog.md con las features MVP" },
];

const ICONOS: Record<EstadoPaso, string> = {
  pendiente: "⏳",
  "en-progreso": "🔄",
  ok: "✅",
  omitido: "⚪",
  error: "❌",
};

interface Props {
  payload: FormularioProyecto;
  onExito: (proyecto: ProyectoCreado) => void;
}

/**
 * Consume el stream NDJSON de /api/crear-proyecto y muestra el estado REAL de cada paso — nunca
 * un fallo silencioso: cada paso con error queda visible con su detalle y qué alcanzó a crearse.
 */
export default function ProgresoCreacion({ payload, onExito }: Props) {
  const [pasos, setPasos] = useState<Record<PasoId, InfoPaso>>(() =>
    Object.fromEntries(PASOS.map((p) => [p.id, { estado: "pendiente" as EstadoPaso }])) as Record<PasoId, InfoPaso>,
  );
  const [errorFinal, setErrorFinal] = useState<string | null>(null);
  const [terminado, setTerminado] = useState(false);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    let cancelado = false;

    function procesarEvento(evento: EventoProgreso) {
      if (cancelado) return;
      if (evento.tipo === "paso") {
        setPasos((prev) => ({
          ...prev,
          [evento.paso]: {
            estado: evento.estado,
            detalle:
              evento.estado === "error" ? evento.error : evento.estado === "omitido" ? evento.motivo : undefined,
          },
        }));
        return;
      }
      setTerminado(true);
      if (evento.ok) {
        onExito(evento.proyecto);
      } else {
        setErrorFinal(evento.error);
      }
    }

    async function correr() {
      try {
        const res = await fetch("/api/crear-proyecto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}) as { error?: string });
          throw new Error(data.error || `El servidor respondió ${res.status}.`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const linea = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (linea.trim()) procesarEvento(JSON.parse(linea) as EventoProgreso);
          }
        }
        if (buffer.trim()) procesarEvento(JSON.parse(buffer) as EventoProgreso);
      } catch (err) {
        if (!cancelado) {
          setTerminado(true);
          setErrorFinal(err instanceof Error ? err.message : "Error de red creando el proyecto.");
        }
      }
    }

    correr();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <ul className={styles.lista}>
        {PASOS.map((p) => {
          const info = pasos[p.id];
          return (
            <li key={p.id} className={styles.paso}>
              <span className={styles.icono} aria-hidden="true">
                {ICONOS[info.estado]}
              </span>
              <span className={styles.textoPaso}>
                {p.etiqueta}
                {info.detalle ? <span className={styles.detalle}>{info.detalle}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {errorFinal && (
        <div className={styles.error} role="alert">
          <strong>No se pudo terminar la creación.</strong>
          <p>{errorFinal}</p>
          <p>Revisa qué paso quedó en ❌ arriba — lo que ya se creó (repo, manifest…) queda en GitHub; reintenta desde el formulario.</p>
        </div>
      )}
      {!terminado && <p className={styles.espera}>Esto toma unos segundos…</p>}
    </div>
  );
}
