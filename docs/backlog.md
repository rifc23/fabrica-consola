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
6. **El orden es la cola** — dentro de P0 y luego P1, el orquestador toma tareas de ARRIBA hacia
   ABAJO: reordenar el backlog = repriorizar la cola (solo el orquestador/triaje reordena). Al
   iniciar un lote, el orquestador marca cada tarea tomada anteponiendo `🔄` a su título y
   actualiza `ultimo_tick` en `.fabrica.json` (commit + push de inicio de tick); al cerrar el
   lote, las completadas pasan a `[x]` y las no terminadas pierden el `🔄`. La consola lee estos
   marcadores para mostrar cola, "trabajando ahora" y tiempos de espera.

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
- 2026-07-17: tareas manuales 1 y 2 completadas por el usuario — `GITHUB_PAT` fine-grained en
  Vercel y repo conectado (deploy automático por push activo). Verificado en producción:
  `/api/proyectos` responde 200 con `[]`. Las features P0 quedan totalmente desbloqueadas,
  incluida la prueba end-to-end contra la API real de GitHub.
- 2026-07-17: routine orquestadora instalada (`routine-fabrica-consola`,
  `trig_01PwHzgz3RGxF82XPhN3hszo`, cron cada 2h con offset :15, peldaño 3). En su primer disparo mergeará a main
  la rama `claude/factory-console-backlog-7jafgw` (solo documentación — autorizado por el usuario)
  y empezará a trabajar este backlog. Apagado automático por candado
  `docs/reportes/CAMPANA-*-FINAL.md` cuando no queden ítems delegables; entradas nuevas en el
  `📥 Inbox` o el backlog reabren la campaña.
- 2026-07-17: decisión del usuario — el dashboard incluye "🧑 Tareas manuales" como documento
  vivo y un "📋 Brief" hecho/pendiente derivado por parsing (sin LLM), ambos con botón
  "↻ Actualizar" que re-lee del repo sin caché. Ampliada la spec del dashboard P0 y §2 del
  diseño.
- 2026-07-17: tareas manuales 5 y 6 completadas — `VERCEL_TOKEN` configurado (deploy autónomo de
  proyectos nuevos habilitado para la P0 del formulario) y routine madre activa
  (`trig_01GKMxZGYkU5TqkS3pPcC5Mc`, cron `50 * * * *`). TODAS las tareas manuales bloqueantes o
  habilitadoras están cerradas: la P0 del formulario puede implementarse y probarse end-to-end
  (repo + Vercel + routine) sin intervención del usuario.
- 2026-07-17: decisión del usuario — regla **Multiplataforma SIEMPRE** (mobile-first/responsive,
  E2E en viewport móvil) agregada a las REGLAS NO NEGOCIABLES de la consola Y del template: toda
  UI de la fábrica funciona en celular. Aplica a TODAS las tareas P0/P1 con UI de este backlog.

## P0 — Features MVP (sembradas desde las specs de la Fase 0)

- [ ] **Formulario "Nuevo proyecto".** Página con los 12 campos de `docs/diseno-consola-web.md`
  §1 (nombre, objetivo, features MVP repetibles, qué NO es v1, criterios de aceptación opcionales,
  stack, presupuesto, decisiones reservadas, visibilidad, cadencia de routine, autoridad inicial
  informativa, notificaciones opcionales). Al enviar, un API route server-side: (1) crea el repo
  desde `rifc23/fabrica-agentes-template` vía `POST /repos/{owner}/{template}/generate` +
  agrega el topic `fabrica-agentes`; (2) **conecta el repo a Vercel** (decisión del usuario,
  2026-07-17 — deploy autónomo §4.5 del diseño): si `VERCEL_TOKEN` está configurado (env var
  server-side, mismas reglas que `GITHUB_PAT`), `POST https://api.vercel.com/v9/projects` con
  `gitRepository` apuntando al repo nuevo → cada push despliega y cada PR genera preview, sin CLI;
  la `preview_url` resultante va al manifest. Sin token: degradación elegante — los pasos de
  conexión manual se escriben en el `TAREAS-MANUALES.md` del proyecto nuevo; (3) commitea
  `.fabrica.json` inicial (`peldano: 3`, `estado: "iterando"`, `cadencia_cron`, `preview_url` si
  hubo Vercel) y `docs/SPECS.md` con las respuestas del form; (4) siembra `docs/backlog.md` del
  repo nuevo con las features MVP como paquetes P0 — este push dispara el primer deploy.
  **Flujo post-creación (decisión del usuario, 2026-07-17):** al enviar, el botón se deshabilita
  y aparece un indicador de progreso por pasos con el estado REAL de cada uno (creando repo →
  conectando Vercel → sembrando backlog y manifest); al terminar, la consola redirige
  AUTOMÁTICAMENTE al dashboard del proyecto nuevo (`/proyectos/<id>`), con el dropdown ya
  revalidado (sin caché) y el proyecto nuevo seleccionado, un banner de éxito con la liga al repo
  y la `preview_url` de Vercel, y el estado de la routine: "🏭 la routine madre la instalará
  automáticamente (≤1h)" mientras el manifest no tenga `trigger_id` — el prompt manual de
  `/schedule` queda como fallback colapsable por si la madre no está activa. Si un paso falla, se
  muestra el error de ESE paso, qué alcanzó a crearse y cómo reintentar — nunca un fallo
  silencioso. Desde ahí, el dashboard (cola, brief, Inbox, tareas manuales) es el **hub de mejora
  continua** del proyecto.
  **Criterios de aceptación:** dado un usuario que llena el formulario con nombre+objetivo+≥1
  feature MVP, cuando lo envía, entonces ve el progreso por pasos y al completarse es redirigido
  al dashboard del proyecto nuevo con el dropdown incluyéndolo y seleccionado, la liga al repo y
  la `preview_url` visibles; y existe el repo nuevo en GitHub con el topic `fabrica-agentes`,
  `.fabrica.json` válido y `docs/SPECS.md` commiteado; y dado que `VERCEL_TOKEN` está
  configurado, entonces existe además el proyecto Vercel conectado al repo y el manifest contiene
  su `preview_url`. El cron generado lleva **offset de minutos escalonado** (0/15/30/45, rotando
  entre proyectos — ver §4 Motor A del diseño) y se guarda en `cadencia_cron` del manifest, para
  que N routines no se disparen todas a la misma hora.
  **Archivos previstos:** `src/app/nuevo-proyecto/page.tsx`, `src/app/api/crear-proyecto/route.ts`,
  `src/lib/github.ts` (extender con `crearDesdeTemplate`, `commitearArchivo`),
  `src/lib/vercel.ts` (crear-proyecto-conectado, con tests),
  `src/components/ProgresoCreacion.tsx`, tests en `src/lib/github.test.ts`.

- [ ] **Dropdown de proyectos existentes.** Usa `GET /api/proyectos` (ya implementado en el
  esqueleto — `src/app/api/proyectos/route.ts` + `src/lib/github.ts::obtenerProyectos`) para
  listar repos por topic con nombre desde el manifest. Selector en el header que navega al
  dashboard del proyecto elegido.
  **Criterios de aceptación:** dado que existen N repos con el topic `fabrica-agentes`, cuando se
  carga la consola, entonces el dropdown muestra los N proyectos por su `nombre` de manifest (o el
  nombre del repo si el manifest falta) y seleccionar uno navega a `/proyectos/<id>`; y dado que
  se acaba de crear un proyecto, cuando la consola redirige a su dashboard, entonces el dropdown
  ya lo incluye y lo muestra seleccionado (lectura sin caché tras la creación).
  **Archivos previstos:** `src/app/layout.tsx` o un `src/components/SelectorProyectos.tsx`,
  `src/app/proyectos/[id]/page.tsx` (ruta destino).

- [ ] **Dashboard read-only por proyecto.** Página `/proyectos/[id]` que lee (vía Contents API)
  y renderiza: progreso desde checkboxes de `docs/backlog.md` (barra + lista ✅/⏳), el reporte
  más reciente de `docs/reportes/` (markdown renderizado, sanitizado), decisiones `[USUARIO]`
  visibles del backlog, link al repo y a `preview_url` del manifest. Además (decisión del usuario,
  2026-07-17): sección **"🧑 Tareas manuales" como documento vivo** (render sanitizado de
  `docs/TAREAS-MANUALES.md` del proyecto) y sección **"📋 Brief"** con qué-se-hizo / qué-falta
  derivado POR PARSING, sin LLM (regla no negociable de v1): completadas recientes (`[x]` +
  Registro de trabajo), en curso (tareas `🔄`), pendientes con su posición en la cola y conteos
  por prioridad. **Frescura:** todas las lecturas del dashboard con `cache: 'no-store'` y botón
  **"↻ Actualizar"** (componente compartido, en el header del dashboard y en las secciones
  Tareas manuales y Brief) que re-lee del repo al instante (`router.refresh()`), mostrando
  "actualizado hace Xs" en cada sección.
  **Criterios de aceptación:** dado un proyecto con backlog y al menos un reporte, cuando se abre
  su dashboard, entonces se ve la barra de progreso con el conteo real de checkboxes, el reporte
  más reciente renderizado, la lista de decisiones estacionadas (vacía si no hay ninguna), las
  tareas manuales del proyecto y el brief hecho/pendiente; y dado que el repo cambió después de
  cargar la página (ej. la routine commiteó), cuando el usuario pulsa "↻ Actualizar", entonces
  las secciones reflejan el contenido más reciente del repo sin recargar manualmente el navegador.
  **Archivos previstos:** `src/app/proyectos/[id]/page.tsx`, `src/lib/backlog.ts` (parser de
  checkboxes, `🔄`, sección `[USUARIO]` y Registro de trabajo, con tests), `src/lib/markdown.ts`
  (render sanitizado), `src/lib/brief.ts` (derivar hecho/en-curso/falta, con tests),
  `src/components/BotonActualizar.tsx`.

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

- [ ] **Vista de cola y tiempos en el dashboard** (decisión del usuario, 2026-07-17; requiere el
  dashboard P0). Renderiza los pendientes del backlog como cola numerada en su orden real (el
  orden del archivo ES la cola — regla 6 del protocolo del template); badge "🏭 trabajando ahora"
  cuando hay tareas marcadas `🔄` (con `ultimo_tick` del manifest como inicio); countdown al
  próximo tick calculado desde `cadencia_cron` del manifest (sin APIs extra); espera estimada por
  posición: `ceil(posición/4) × cadencia`. Ver diseño en `docs/diseno-consola-web.md` §2.2.
  **Criterios de aceptación:** dado un proyecto cuyo manifest tiene `cadencia_cron` y un backlog
  con N pendientes (alguno marcado `🔄`), cuando se abre su dashboard, entonces se ve la cola
  numerada en el orden del archivo, el badge de trabajo en curso, el countdown correcto al
  próximo disparo del cron y la espera estimada junto a cada pendiente.
  **Archivos previstos:** `src/lib/backlog.ts` (extender parser: orden + marcador `🔄`, tests),
  `src/lib/cron.ts` (próximo disparo de una expresión cron de 5 campos, tests),
  `src/components/ColaProyecto.tsx`.
- [ ] **Burn-down del backlog** (decisión del usuario, 2026-07-17). Gráfica de tareas pendientes
  vs tiempo para ver desde cuándo "se rebaja" el backlog: historial de commits de
  `docs/backlog.md` (GitHub Commits API, muestreado — máx ~30 puntos), conteo de checkboxes
  pendientes por versión, render SVG propio sin librería de gráficas.
  **Criterios de aceptación:** dado un proyecto con ≥2 commits que cambian checkboxes del
  backlog, cuando se abre su dashboard, entonces la gráfica muestra la serie de pendientes por
  fecha con al menos esos puntos.
  **Archivos previstos:** `src/lib/burndown.ts` (con tests), `src/components/Burndown.tsx`,
  `src/lib/github.ts` (extender: historial de commits de un archivo).
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
  exista el formulario real contra un repo de prueba. Cada spec de UI corre en DOS viewports:
  desktop y móvil ~390×844 (regla Multiplataforma de CLAUDE.md).
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
