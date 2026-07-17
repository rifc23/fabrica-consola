"use client";

import { useEffect, useState } from "react";
import styles from "./DecisionCard.module.css";
import { formatearRespuestaDecision } from "@/lib/backlog";
import { proximoDespachoEfectivo } from "@/lib/cron";

interface Props {
  pregunta: string;
  owner: string;
  repo: string;
  cadenciaCron?: string | null;
}

/**
 * Card de decisión estacionada [USUARIO]: la killer feature. Responder commitea al Inbox con el
 * formato exacto `Respuesta a decisión "...": ...` — nunca edita la sección [USUARIO] directamente
 * (regla no negociable). Sin ningún link a claude.ai/routines: la inmediatez la da el despachador
 * de la routine madre (≤1h) — el countdown se calcula solo con cron + Date, sin deep-links.
 */
export default function DecisionCard({ pregunta, owner, repo, cadenciaCron }: Props) {
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [respondida, setRespondida] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaDespacho, setFechaDespacho] = useState<Date | null>(null);
  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null);

  useEffect(() => {
    if (!fechaDespacho) return;
    const tick = () => {
      const restante = Math.max(0, Math.round((fechaDespacho.getTime() - Date.now()) / 60000));
      setMinutosRestantes(restante);
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [fechaDespacho]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!respuesta.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const texto = formatearRespuestaDecision(pregunta, respuesta);
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `El servidor respondió ${res.status}.`);
      const despacho = proximoDespachoEfectivo(cadenciaCron ?? null);
      setFechaDespacho(despacho.fecha);
      setMinutosRestantes(despacho.minutos);
      setRespondida(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red enviando la respuesta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={`${styles.card} ${respondida ? styles.respondida : ""}`}>
      <p className={styles.pregunta}>{pregunta}</p>
      {!respondida ? (
        <form className={styles.form} onSubmit={enviar}>
          <textarea
            aria-label={`Respuesta a: ${pregunta}`}
            placeholder="Tu respuesta…"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            disabled={enviando}
          />
          <div>
            <button type="submit" disabled={enviando || !respuesta.trim()}>
              {enviando ? "Enviando…" : "Responder"}
            </button>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p>
          ✅ respondida — la fábrica la tomará en ~{minutosRestantes ?? "?"} min.
        </p>
      )}
    </div>
  );
}
