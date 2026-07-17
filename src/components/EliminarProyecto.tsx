"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./EliminarProyecto.module.css";

interface Props {
  owner: string;
  repo: string;
}

/**
 * Zona de peligro del dashboard: elimina el proyecto COMPLETO (repo de GitHub + proyecto
 * Vercel). Acción irreversible — exige escribir el nombre exacto del repo (patrón GitHub) y el
 * endpoint lo re-valida server-side.
 */
export default function EliminarProyecto({ owner, repo }: Props) {
  const router = useRouter();
  const [confirmacion, setConfirmacion] = useState("");
  const [estado, setEstado] = useState<"idle" | "borrando" | "error">("idle");
  const [error, setError] = useState("");

  const coincide = confirmacion.trim() === repo;

  async function eliminar() {
    if (!coincide || estado === "borrando") return;
    setEstado("borrando");
    setError("");
    try {
      const res = await fetch("/api/eliminar-proyecto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, confirmacion: confirmacion.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; nota?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `El servidor respondió ${res.status}.`);
      if (data.nota) window.alert(`Proyecto eliminado. ${data.nota}`);
      router.push("/");
      router.refresh();
    } catch (e) {
      setEstado("error");
      setError(e instanceof Error ? e.message : "Error desconocido al eliminar.");
    }
  }

  return (
    <details className={styles.zona}>
      <summary className={styles.titulo}>⚠️ Zona de peligro</summary>
      <div className={styles.contenido}>
        <p>
          Eliminar este proyecto borra <strong>para siempre</strong> el repositorio{" "}
          <code>
            {owner}/{repo}
          </code>{" "}
          (backlog, reportes e historial incluidos) y su proyecto en Vercel. Si tiene una routine
          instalada, elimínala después desde la UI de routines.
        </p>
        <label className={styles.etiqueta} htmlFor="confirmar-eliminar">
          Escribe <code>{repo}</code> para confirmar:
        </label>
        <input
          id="confirmar-eliminar"
          className={styles.campo}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          placeholder={repo}
          autoComplete="off"
        />
        <button
          type="button"
          className={styles.boton}
          disabled={!coincide || estado === "borrando"}
          onClick={eliminar}
        >
          {estado === "borrando" ? "Eliminando…" : "Eliminar proyecto definitivamente"}
        </button>
        {estado === "error" && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </details>
  );
}
