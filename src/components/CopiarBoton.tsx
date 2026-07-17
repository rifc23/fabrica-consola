"use client";

import { useState } from "react";

interface Props {
  texto: string;
  etiqueta?: string;
}

/** Botón "copiar" genérico (clipboard es client-only) — usado por la pantalla de arranque. */
export default function CopiarBoton({ texto, etiqueta = "📋 Copiar" }: Props) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard puede fallar por permisos del navegador; sin acción destructiva, se ignora.
    }
  }

  return (
    <button type="button" onClick={copiar}>
      {copiado ? "✅ Copiado" : etiqueta}
    </button>
  );
}
