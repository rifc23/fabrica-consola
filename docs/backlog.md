# Backlog — fabrica-consola

Fuente única de tareas para los agentes (`implementador`, `arquitecto`, `auditor-seguridad`,
`qa-funcional`, `producto`) y la routine orquestadora. La memoria del proyecto ES este archivo +
`docs/reportes/` + CLAUDE.md — no hay estado fuera de git.

**Protocolo obligatorio para todo agente que trabaje este backlog:**
1. **Prod intocable** — nunca push/merge a la rama principal (despliega a producción); todo en
   ramas; sin migraciones de datos ni deploys de configuración (esos los ejecuta el usuario u
   orquestador autorizado).
2. **Paquetes completos** — una tarea se toma entera o no se toma: código + tests + gate en verde
   + reporte. Prohibido dejar ramas a medias o en estado inconsistente.
3. **Checkpoint de contexto** — antes de iniciar cada tarea, evaluar el contexto de sesión
   restante; si no alcanza para completarla y reportar, NO iniciarla: cerrar en estado consistente
   y dejar el estado exacto en el reporte.
4. **Territorio y escritor único** — cada agente escribe SOLO dentro de su worktree. Este archivo
   y CLAUDE.md los edita ÚNICAMENTE el orquestador; los agentes entregan su reporte en
   `docs/reportes/<YYYY-MM-DD>-<rama>.md` (commiteado en su rama, nombre único) con una sección
   "Propuestas para CLAUDE.md/backlog" que el orquestador consolida tras el merge.
5. **Serialización por archivos compartidos** — nunca dos tareas en paralelo que toquen los mismos
   archivos fuente; van en serie (o el mismo agente vía SendMessage). Un agente que detecte solape
   no contemplado lo reporta y NO toma la tarea.

## Estado general

- 2026-07-14: proyecto arrancado con la Fábrica (`/fabrica`). Esqueleto andante: Next.js 16
  (App Router, TypeScript) + Vitest, endpoint `/api/proyectos` funcional (lee repos por topic
  `fabrica-agentes` vía GitHub API server-side) con 6 tests unitarios sobre `src/lib/github.ts`.
  Gate en verde local (lint + test:run + build). CI en `.github/workflows/gate.yml`. Pusheado a
  `main` (commit `cafebd9`). Deploy a Vercel: pendiente de conexión (ver TAREAS-MANUALES.md).
- 2026-07-17: decisión del usuario: una SOLA consola multi-proyecto (dropdown, no una consola por
  proyecto) y la consola también recibe inputs sobre proyectos ya creados. El "＋ Nueva tarea /
  feedback" sube de P1 a P0 con tratamiento inteligente del input (patrón Inbox + triaje de la
  routine, ver la tarea P0 y CLAUDE.md § Decisiones Arquitectónicas). El template gana la sección
  `📥 Inbox` en su backlog y el paso de triaje en la plantilla de routine.
- 2026-07-17 (más tarde): simplificación por decisión del usuario — la consola NO llama a ningún
  LLM en v1: commitea el feedback crudo al Inbox y el refinado completo lo hace la routine en el
  cron (triaje). El refinado instantáneo con preview (`ANTHROPIC_API_KEY`) baja a P2 como mejora
  opcional de UX; se retiró la tarea manual de la key.

## P0 — Features MVP (sembradas desde las specs de la Fase 0)

- [ ] **Formulario "Nuevo proyecto".** Página con los 12 campos de `docs/diseno-consola-web.md`
  §1 (nombre, objetivo, features MVP repetibles, qué NO es v1, criterios de aceptación opcionales,
  stack, presupuesto, decisiones reservadas, visibilidad, cadencia de routine, autoridad inicial
  informativa, notificaciones opcionales). Al enviar, un API route server-side: (1) crea el repo
  desde `rifc23/fabrica-agentes-template` vía `POST /repos/{owner}/{template}/generate` +
  agrega el topic `fabrica-agentes`; (2) commitea `.fabrica.json` inicial (`peldano: 3`,
  `estado: "iterando"`) y `docs/SPECS.md` con las respuestas del form; (3) siembra
  `docs/backlog.md` del repo nuevo con las features MVP como paquetes P0.
  **Criterios de aceptación:** dado un usuario que llena el formulario con nombre+objetivo+≥1
  feature MVP, cuando lo envía, entonces existe un repo nuevo en GitHub con el topic
  `fabrica-agentes`, `.fabrica.json` válido y `docs/SPECS.md` commiteado, y la consola redirige a
  la "pantalla de arranque" con el prompt de routine pre-rellenado.
  **Archivos previstos:** `src/app/nuevo-proyecto/page.tsx`, `src/app/api/crear-proyecto/route.ts`,
  `src/lib/github.ts` (extender con `crearDesdeTemplate`, `commitearArchivo`), tests en
  `src/lib/github.test.ts`.

- [ ] **Dropdown de proyectos existentes.** Usa `GET /api/proyectos` (ya implementado en el
  esqueleto — `src/app/api/proyectos/route.ts` + `src/lib/github.ts::obtenerProyectos`) para
  listar repos por topic con nombre desde el manifest. Selector en el header que navega al
  dashboard del proyecto elegido.
  **Criterios de aceptación:** dado que existen N repos con el topic `fabrica-agentes`, cuando se
  carga la consola, entonces el dropdown muestra los N proyectos por su `nombre` de manifest (o el
  nombre del repo si el manifest falta) y seleccionar uno navega a `/proyectos/<id>`.
  **Archivos previstos:** `src/app/layout.tsx` o un `src/components/SelectorProyectos.tsx`,
  `src/app/proyectos/[id]/page.tsx` (ruta destino).

- [ ] **Dashboard read-only por proyecto.** Página `/proyectos/[id]` que lee (vía Contents API)
  y renderiza: progreso desde checkboxes de `docs/backlog.md` (barra + lista ✅/⏳), el reporte
  más reciente de `docs/reportes/` (markdown renderizado, sanitizado), decisiones `[USUARIO]`
  visibles del backlog, link al repo y a `preview_url` del manifest.
  **Criterios de aceptación:** dado un proyecto con backlog y al menos un reporte, cuando se abre
  su dashboard, entonces se ve la barra de progreso con el conteo real de checkboxes, el reporte
  más reciente renderizado, y la lista de decisiones estacionadas (vacía si no hay ninguna).
  **Archivos previstos:** `src/app/proyectos/[id]/page.tsx`, `src/lib/backlog.ts` (parser de
  checkboxes y sección `[USUARIO]`, con tests), `src/lib/markdown.ts` (render sanitizado).

- [ ] **"＋ Nueva tarea / feedback" → Inbox (subido de P1 a P0 por decisión del usuario,
  2026-07-17; simplificado el mismo día: el refinado lo hace la routine en el cron, no la
  consola).** En el dashboard de cada proyecto, un textarea donde el usuario escribe feedback, una
  idea o una spec en lenguaje natural. Al enviar, el API route commitea el texto TAL CUAL (con
  fecha) DENTRO de la sección `📥 Inbox` del `docs/backlog.md` del proyecto — la consola no llama
  a ningún LLM ni decide prioridades. El tratamiento inteligente ocurre en el siguiente tick de la
  routine orquestadora (paso "TRIAJE DEL INBOX" de la plantilla): mejora el wording, redacta
  criterios de aceptación, deduplica, prioriza a P0/P1/P2 o estaciona como pregunta `[USUARIO]`.
  **Criterios de aceptación:** dado un proyecto existente, cuando el usuario envía un feedback
  desde su dashboard, entonces aparece un commit nuevo en el repo del proyecto cuyo diff agrega la
  entrada SOLO dentro de la sección `📥 Inbox` de `docs/backlog.md`, y la UI confirma mostrando el
  link al commit.
  **Archivos previstos:** `src/app/proyectos/[id]/NuevaTarea.tsx`,
  `src/app/api/tareas/route.ts`, `src/lib/backlog.ts` (helper `insertarEnInbox`, con tests),
  `src/lib/github.ts` (extender con append/commit de archivo existente, con tests).

## P1 — Siguientes

- [ ] Cards de decisiones `[USUARIO]` respondibles desde la web (input/botones → commit de la
  respuesta al backlog; v2 del roadmap, §5 de diseno-consola-web.md).
- [ ] Botón "Disparar routine ahora" (deep-link a `claude.ai/code/routines/<trigger_id>`).

## P2 — Deuda / mejoras

- [ ] Refinado instantáneo del feedback (mejora de UX, opcional): el API route llama a la API de
  Claude server-side (`ANTHROPIC_API_KEY`, mismas reglas que `GITHUB_PAT`) para reescribir el
  input al formato de tarea y mostrar un preview editable ANTES del commit al Inbox. Solo cambia
  CUÁNDO se ve el wording mejorado — el triaje del cron sigue siendo la única autoridad de
  prioridades. Requiere reponer la tarea manual de crear la key en Vercel.
- [ ] Playwright E2E del flujo completo (crear proyecto → verlo en dropdown → dashboard) una vez
  exista el formulario real contra un repo de prueba.
- [ ] Motor B (GitHub Actions + Agent SDK) — instalación 100% automática, ver §4 de
  diseno-consola-web.md. No es v1.

## Decisiones estacionadas [USUARIO]

- **Diseño visual**: la UI actual del esqueleto es intencionalmente mínima (sin sistema de diseño,
  sin librería de componentes). ¿Quieres que el `disenador-ui` proponga 2-3 direcciones antes de
  construir el formulario y el dashboard, o prefieres iterar sobre lo mínimo primero y refinar
  después?
- **Nombre del producto**: el repo y el `package.json` usan el nombre técnico "fabrica-consola".
  ¿Hay un nombre de producto distinto que prefieras mostrar en la UI (título, `<title>`, etc.)?

## Registro de trabajo

| Fecha | Tarea | Rama | Commits | Gate | Estado |
|-------|-------|------|---------|------|--------|
| 2026-07-14 | Fase 0-1: kit, esqueleto andante, gate | main | (inicial) | lint ✅ test:run 6/6 ✅ build ✅ | Completado |
