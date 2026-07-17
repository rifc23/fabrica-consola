"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BotonActualizar.module.css";

interface Props {
  /** Timestamp (ISO) generado por el servidor en cada render del dashboard — cambia con cada refresh. */
  generadoEn: string;
  /** Solo UNA instancia por página debe traer el polling activo (evita refrescos triplicados). */
  autoRefresh?: boolean;
  etiqueta?: string;
}

/**
 * Componente compartido "↻ Actualizar" (header + secciones Brief/Tareas manuales): fuerza
 * `router.refresh()` (re-lee el repo sin caché) y muestra "actualizado hace Xs". Con
 * `autoRefresh`, hace polling cada ~60s mientras la pestaña está visible (regla de frescura).
 */
export default function BotonActualizar({ generadoEn, autoRefresh = false, etiqueta = "actualizado" }: Props) {
  const router = useRouter();
  const [hace, setHace] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  // "Ajustar estado durante el render" (patrón oficial de React) en vez de un efecto que llama
  // setState de forma síncrona: cuando el servidor manda un `generadoEn` nuevo, reinicia el timer.
  const [ultimoGeneradoEn, setUltimoGeneradoEn] = useState(generadoEn);
  if (generadoEn !== ultimoGeneradoEn) {
    setUltimoGeneradoEn(generadoEn);
    setHace(0);
    setActualizando(false);
  }

  useEffect(() => {
    const t = setInterval(() => setHace((h) => h + 1), 1000);
    return () => clearInterval(t);
  }, [generadoEn]);

  useEffect(() => {
    if (!autoRefresh) return;
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60000);
    return () => clearInterval(poll);
  }, [autoRefresh, router]);

  return (
    <div className={styles.frescura}>
      <span className={styles.hace}>{etiqueta} hace {hace}s</span>
      <button
        type="button"
        onClick={() => {
          setActualizando(true);
          router.refresh();
        }}
        disabled={actualizando}
      >
        ↻ Actualizar
      </button>
    </div>
  );
}
