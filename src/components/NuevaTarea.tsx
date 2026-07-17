"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NuevaTarea.module.css";

interface Props {
  owner: string;
  repo: string;
}

/**
 * "＋ Nueva tarea / feedback": commitea el texto TAL CUAL (sin LLM) dentro de la sección
 * 📥 Inbox del backlog del proyecto vía /api/tareas. El triaje inteligente lo hace la routine.
 */
export default function NuevaTarea({ owner, repo }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [commitUrl, setCommitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    setCommitUrl(null);
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `El servidor respondió ${res.status}.`);
      setCommitUrl(data.commitUrl);
      setTexto("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red enviando el feedback.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <textarea
        aria-label="Nueva tarea o feedback"
        placeholder="Escribe una idea, feedback o spec en lenguaje natural…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={enviando}
      />
      <div>
        <button type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? "Enviando…" : "＋ Agregar al Inbox"}
        </button>
      </div>
      {commitUrl && (
        <p className={styles.ok}>
          ✅ Agregado al Inbox —{" "}
          <a href={commitUrl} target="_blank" rel="noopener noreferrer">
            ver commit
          </a>
          . La routine lo triará en su próximo tick.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
