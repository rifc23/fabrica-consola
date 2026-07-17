import { describe, it, expect } from "vitest";
import { renderMarkdownSanitizado } from "./markdown";

describe("renderMarkdownSanitizado", () => {
  it("escapa HTML/scripts crudos en vez de interpretarlos", () => {
    const html = renderMarkdownSanitizado('<script>alert("xss")</script> texto');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renderiza encabezados, negrita y cursiva", () => {
    const html = renderMarkdownSanitizado("# Título\n\nUn **texto** con *énfasis*.");
    expect(html).toContain("<h1>Título</h1>");
    expect(html).toContain("<strong>texto</strong>");
    expect(html).toContain("<em>énfasis</em>");
  });

  it("renderiza listas y checkboxes marcados/desmarcados", () => {
    const html = renderMarkdownSanitizado("- [x] hecho\n- [ ] pendiente\n- item normal");
    expect(html).toContain('<input type="checkbox" disabled checked /> hecho');
    expect(html).toContain('<input type="checkbox" disabled /> pendiente');
    expect(html).toContain("<li>item normal</li>");
  });

  it("permite enlaces http(s) pero descarta esquemas peligrosos", () => {
    const seguro = renderMarkdownSanitizado("[GitHub](https://github.com/rifc23)");
    expect(seguro).toContain('<a href="https://github.com/rifc23"');
    expect(seguro).toContain('rel="noopener noreferrer"');

    const inseguro = renderMarkdownSanitizado('[click](javascript:alert(1))');
    expect(inseguro).not.toContain("<a ");
    expect(inseguro).not.toContain("href=");
  });

  it("renderiza bloques de código escapando su contenido", () => {
    const html = renderMarkdownSanitizado("```\n<b>no-html</b>\n```");
    expect(html).toContain("<pre><code>");
    expect(html).toContain("&lt;b&gt;no-html&lt;/b&gt;");
    expect(html).not.toContain("<b>no-html</b>");
  });

  it("agrupa líneas sueltas en párrafos", () => {
    const html = renderMarkdownSanitizado("línea uno\nlínea dos\n\notro párrafo");
    expect(html).toContain("<p>línea uno línea dos</p>");
    expect(html).toContain("<p>otro párrafo</p>");
  });

  it("no rompe con entrada vacía o nula", () => {
    expect(renderMarkdownSanitizado("")).toBe("");
    expect(renderMarkdownSanitizado(null)).toBe("");
    expect(renderMarkdownSanitizado(undefined)).toBe("");
  });
});
