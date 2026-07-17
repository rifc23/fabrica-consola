"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./SelectorProyectos.module.css";

interface ProyectoOpcion {
  repo: string;
  nombre: string;
}

interface RespuestaProyectos {
  proyectos?: Array<{ repo: string; manifest: { nombre?: string } | null }>;
  error?: string;
}

/**
 * Dropdown de proyectos existentes en el header. Usa GET /api/proyectos (sin caché) para que un
 * proyecto recién creado aparezca disponible justo después del redirect post-creación.
 */
export default function SelectorProyectos() {
  const [proyectos, setProyectos] = useState<ProyectoOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // "Ajustar estado durante el render" (patrón oficial de React) en vez de un setState síncrono
  // al inicio del efecto: cuando cambia la ruta, marca "cargando" ANTES de disparar el fetch.
  const [ultimoPathname, setUltimoPathname] = useState(pathname);
  if (pathname !== ultimoPathname) {
    setUltimoPathname(pathname);
    setCargando(true);
  }

  useEffect(() => {
    let cancelado = false;
    fetch("/api/proyectos", { cache: "no-store" })
      .then((r) => r.json() as Promise<RespuestaProyectos>)
      .then((data) => {
        if (cancelado) return;
        const lista = (data.proyectos ?? []).map((p) => ({
          repo: p.repo,
          nombre: p.manifest?.nombre?.trim() || p.repo,
        }));
        setProyectos(lista);
      })
      .catch(() => {
        if (!cancelado) setProyectos([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [pathname]);

  const seleccionado = pathname?.startsWith("/proyectos/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : "";

  return (
    <div className={styles.barra}>
      <select
        aria-label="Selector de proyectos"
        className={styles.selector}
        value={seleccionado}
        onChange={(e) => {
          if (e.target.value) router.push(`/proyectos/${e.target.value}`);
        }}
      >
        <option value="">
          {cargando ? "Cargando proyectos…" : proyectos.length ? "Elegir proyecto…" : "Sin proyectos aún"}
        </option>
        {proyectos.map((p) => (
          <option key={p.repo} value={p.repo}>
            {p.nombre}
          </option>
        ))}
      </select>
      <button type="button" className={styles.nuevo} onClick={() => router.push("/nuevo-proyecto")}>
        ＋ Nuevo proyecto
      </button>
    </div>
  );
}
