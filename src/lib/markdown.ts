/**
 * Renderer + sanitizador propio y mínimo de markdown → HTML seguro, sin dependencias externas
 * (regla no negociable: "sanitizar todo render de markdown/HTML proveniente de los repos leídos
 * antes de insertarlo en el DOM"). Estrategia: TODO el texto pasa por `escapeHtml` primero; solo
 * se generan las etiquetas explícitas de abajo — nunca se interpola HTML crudo del origen.
 * Soporta: encabezados, negrita/cursiva, código en línea y en bloque, listas (con checkboxes),
 * párrafos y enlaces `http(s)://` (cualquier otro esquema, p. ej. `javascript:`, se descarta).
 */

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function esUrlSegura(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function renderInline(textoCrudo: string): string {
  let out = escapeHtml(textoCrudo);
  out = out.replace(/`([^`]+)`/g, (_m, codigo: string) => `<code>${codigo}</code>`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, etiqueta: string, url: string) =>
    esUrlSegura(url) ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${etiqueta}</a>` : m,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

/** Convierte markdown (texto de repos del propio usuario) a HTML seguro para insertar en el DOM. */
export function renderMarkdownSanitizado(md: string | null | undefined): string {
  const lineas = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let enLista = false;
  let enCodigo = false;
  let bufferParrafo: string[] = [];

  const cerrarParrafo = () => {
    if (bufferParrafo.length) {
      html.push(`<p>${renderInline(bufferParrafo.join(" "))}</p>`);
      bufferParrafo = [];
    }
  };
  const cerrarLista = () => {
    if (enLista) {
      html.push("</ul>");
      enLista = false;
    }
  };

  for (const linea of lineas) {
    if (linea.trim().startsWith("```")) {
      cerrarParrafo();
      cerrarLista();
      if (!enCodigo) {
        html.push("<pre><code>");
        enCodigo = true;
      } else {
        html.push("</code></pre>");
        enCodigo = false;
      }
      continue;
    }
    if (enCodigo) {
      html.push(escapeHtml(linea));
      continue;
    }

    const encabezado = linea.match(/^(#{1,6})\s+(.*)$/);
    if (encabezado) {
      cerrarParrafo();
      cerrarLista();
      const nivel = encabezado[1].length;
      html.push(`<h${nivel}>${renderInline(encabezado[2])}</h${nivel}>`);
      continue;
    }

    const checkbox = linea.match(/^\s*-\s\[( |x|X)\]\s*(.*)$/);
    if (checkbox) {
      cerrarParrafo();
      if (!enLista) {
        html.push("<ul>");
        enLista = true;
      }
      const marcado = checkbox[1].toLowerCase() === "x";
      html.push(`<li><input type="checkbox" disabled${marcado ? " checked" : ""} /> ${renderInline(checkbox[2])}</li>`);
      continue;
    }

    const item = linea.match(/^\s*[-*]\s+(.*)$/);
    if (item) {
      cerrarParrafo();
      if (!enLista) {
        html.push("<ul>");
        enLista = true;
      }
      html.push(`<li>${renderInline(item[1])}</li>`);
      continue;
    }

    if (linea.trim() === "") {
      cerrarParrafo();
      cerrarLista();
      continue;
    }

    cerrarLista();
    bufferParrafo.push(linea.trim());
  }
  cerrarParrafo();
  cerrarLista();
  if (enCodigo) html.push("</code></pre>");

  return html.join("\n");
}
