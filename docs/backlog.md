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
  `trig_01XJA8ejJVsh1aQE4fZFdeN1`, cron cada 2h con offset :15, peldaño 3). En su primer disparo mergeará a main
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
- 2026-07-17: PRIMER ERROR CONOCIDO resuelto — el tick de las 06:15 no pudo publicar: las
  sesiones de routine tienen bloqueado el push a main por el clasificador del modo auto (ver
  CLAUDE.md § Errores Conocidos). Solución desplegada: workflow `fabrica-sync.yml` (consola y
  template) que auto-mergea a main las ramas de solo-estado; las routines ahora pushean
  únicamente su rama designada. El merge de la documentación de hoy a main lo hizo el usuario
  vía sesión interactiva (`9f9af34` consola, `862c483` template).
- 2026-07-17: ERROR CONOCIDO #2 — los triggers creados programáticamente generan sesiones SIN
  permiso de escritura (sin `outcomes`); el tick disparado a las 13:45 construyó pero no pudo
  pushear ni su rama designada y su trabajo se perdió. Consecuencias aplicadas: la routine de la
  consola DEBE crearse desde la UI de routines (tarea manual nueva), la madre pasa a v3
  (preparadora de prompts + despachadora, ya no instaladora), y la pantalla de arranque del
  formulario vuelve a ser el mecanismo oficial de instalación de routines. Las 5 P0 las está
  implementando la sesión interactiva del usuario (que sí tiene escritura) para no perder otro
  ciclo.
- 2026-07-17: decisión del usuario — regla **Primer tick = producto funcional** en la plantilla
  de routine del template y en la routine de la consola: el primer disparo de un proyecto no
  entrega un lote incremental sino la idea principal funcionando de punta a punta (las P0 que
  constituyen el corazón, en serie donde compartan archivos); al backlog solo queda lo no
  esencial. Para la consola: las 4 P0 son UN producto y van juntas en el primer tick.

- 2026-07-17 (cierre del lote v1): las 5 P0 implementadas y con gate en verde (lint ✅ build ✅
  test:run 74/74 ✅) en la rama `claude/factory-console-backlog-7jafgw` — pendiente de merge por
  el usuario (peldaño 3). Revisión del orquestador: secretos solo server-side, markdown con
  sanitizador propio (escape-first), escritura únicamente en sección 📥 Inbox con reintento por
  SHA, countdown sin links a claude.ai, UI mobile-first. Reporte:
  `docs/reportes/2026-07-17-lote-v1-consola.md`. Verificado además fabrica-sync en vivo: main
  recibió `7f1fe03` automáticamente.

## P0 — Features MVP (sembradas desde las specs de la Fase 0)

- [x] **Formulario "Nuevo proyecto".** Página con los 12 campos de `docs/diseno-consola-web.md`
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

- [x] **Dropdown de proyectos existentes.** Usa `GET /api/proyectos` (ya implementado en el
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

- [x] **Dashboard read-only por proyecto.** Página `/proyectos/[id]` que lee (vía Contents API)
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
  "actualizado hace Xs" en cada sección; además **auto-refresh suave** (decisión del usuario,
  2026-07-17): polling cada ~60s mientras la pestaña está visible (`document.visibilityState`),
  para que cuando la routine commitee (triaje de respuestas, inicio/cierre de tick) el dashboard
  se actualice solo sin tocar nada.
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

- [x] **"＋ Nueva tarea / feedback" → Inbox (subido de P1 a P0 por decisión del usuario,
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

- [x] **Cards de decisiones respondibles + "Disparar routine ahora" (subido de P1/v2 a P0 por
  decisión del usuario, 2026-07-17 — cierre rápido del ciclo de feedback).** El dashboard muestra
  cada decisión estacionada `[USUARIO]` del backlog como card con la pregunta EXACTA + input de
  respuesta (+ botones si la pregunta es de opción). Al responder: (1) la consola commitea la
  respuesta AL INBOX del proyecto con el formato `Respuesta a decisión "<primeras palabras de la
  pregunta>": <respuesta>` — así se mantiene la regla de que la consola SOLO escribe en la
  sección `📥 Inbox`; la routine aplica la respuesta en su triaje (despeja la decisión, ajusta la
  tarea, repriorísa); (2) la card pasa a estado "respondida — la fábrica la tomará
  automáticamente" con **countdown al próximo despacho**: el mínimo entre el próximo tick del
  proyecto (`cadencia_cron` del manifest) y el próximo paso del despachador de la routine madre
  (cada hora a los :50). IMPORTANTE (decisión del usuario, 2026-07-17): **los usuarios de la
  consola NO tienen acceso a claude.ai/routines** — nada en la UI puede depender de deep-links a
  claude.ai ni de disparar routines a mano; la inmediatez la da el despachador de la madre
  (≤1h) y, en el futuro, Motor B (instantáneo). Lo mismo aplica al envío de feedback normal.
  **Criterios de aceptación:** dado un proyecto con ≥1 decisión `[USUARIO]`, cuando el usuario
  responde desde la card, entonces existe un commit nuevo cuyo diff agrega la respuesta SOLO
  dentro de la sección `📥 Inbox`, y la card muestra "respondida — la fábrica la tomará en ~X
  min" con el countdown calculado de `cadencia_cron` y el horario del despachador — sin ningún
  link a claude.ai en la UI.
  **Archivos previstos:** `src/components/DecisionCard.tsx`, reutiliza `src/app/api/tareas/route.ts`
  (mismo endpoint del Inbox), `src/lib/backlog.ts` (parser de decisiones ya previsto en el
  dashboard P0), `src/lib/cron.ts` (próximo disparo, compartido con la vista de cola).

- [x] **Eliminar proyecto ("⚠️ Zona de peligro" del dashboard).** (Decisión del usuario,
  2026-07-17, motivada por el proyecto fallido del Error Conocido #3; implementada el mismo día.)
  Sección colapsada al final del dashboard: borra el repo de GitHub (`DELETE /repos`) y el
  proyecto Vercel (`DELETE /v9/projects`, 404 tolerado y degradación sin token), con confirmación
  escribiendo el nombre EXACTO del repo (re-validada server-side), botón deshabilitado hasta
  coincidir, targets ≥44px. Redirige al home con el dropdown refrescado. Tercera excepción a la
  regla read-only de v1 (ver CLAUDE.md). Archivos: `src/app/api/eliminar-proyecto/route.ts`,
  `src/components/EliminarProyecto.tsx`, `eliminarRepo`/`eliminarProyectoVercel` en libs con 6
  tests nuevos.

- [x] **Esqueletos por stack en el formulario (decisión del usuario, 2026-07-17 — extiende el fix
  del Error Conocido #3 a TODOS los stacks del dropdown).** La consola siembra el esqueleto del
  stack elegido al crear el repo: Recomiéndame/Next → esqueleto del template; Vite y Estático →
  esqueleto Vite vanilla-TS (borra los archivos Next vía Contents API y siembra los propios;
  Vercel con `framework: "vite"`; verificado con npm install + gate real en proyecto de prueba);
  Otro → placeholder Next + tarea manual 🟠 para que arquitecto-stack instale el stack en Fase 1.
  **Invariante de fábrica:** todo esqueleto expone los MISMOS scripts `dev/build/lint/test:run` —
  el gate es uniforme para cualquier routine. Archivos: `src/lib/esqueletos.ts` (+tests),
  `borrarArchivo` en github.ts (+tests), paso "esqueleto" en crear-proyecto y ProgresoCreacion.
  Gate: lint ✅ build ✅ test:run 100/100 ✅.

## P1 — Siguientes

- [ ] **Tipo de proyecto "Gem" en el formulario (decisión del usuario, 2026-07-17 — primera de
  la cola P1).** Checkbox "🤖 Gem (chatbot con rol)" en `/nuevo-proyecto`; al marcarse muestra
  textarea "Rol del bot" y las features MVP manuales se sustituyen por el blueprint Gem de
  `docs/diseno-consola-web.md` §1.1 (CRUD de Gems, chat streaming con el rol SIEMPRE como
  parámetro `system` fuera del historial, "✨ Mejorar rol" con preview, localStorage sin BD; el
  usuario puede agregar features extra). Al crear: `docs/SPECS.md` del repo nuevo se genera desde
  el blueprint con el rol del usuario TAL CUAL (sección "Rol inicial"), el backlog se siembra con
  las P0 del blueprint, `.fabrica.json` lleva `tipo: "gem"`, y el `TAREAS-MANUALES.md` del repo
  nuevo incluye la tarea 🔴 de configurar su `ANTHROPIC_API_KEY` en Vercel. El refinado del rol
  es trabajo del primer tick de la routine del proyecto (la consola no llama a LLM).
  **Criterios de aceptación:** dado el checkbox marcado y un rol escrito, cuando se crea el
  proyecto, entonces el repo nuevo tiene SPECS.md tipo Gem con el rol textual íntegro, backlog
  sembrado con las P0 del blueprint y `tipo:"gem"` en el manifest; dado el checkbox sin marcar,
  el formulario se comporta exactamente como hoy (cero campos de rol); todo usable en móvil.
  **Archivos previstos:** `src/app/nuevo-proyecto/page.tsx` (checkbox+textarea),
  `src/lib/formulario-proyecto.ts` (blueprint Gem + generación de SPECS/backlog, con tests),
  `src/lib/github.test.ts`/`formulario-proyecto.test.ts` (casos gem y no-gem).

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
(Las cards de decisiones y el botón "Disparar routine ahora" subieron a P0 el 2026-07-17.)

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
| 2026-07-17 | Lote v1: las 5 P0 (formulario+Vercel, dropdown, dashboard, Inbox, decisiones) | claude/factory-console-backlog-7jafgw | 5cd4910..3f20eb1 | lint ✅ test:run 74/74 ✅ build ✅ | Mergeado a main (7f2644f) |
| 2026-07-17 | Eliminar proyecto (Zona de peligro) | claude/factory-console-backlog-7jafgw | bcd92e7 | lint ✅ test:run 80/80 ✅ build ✅ | Mergeado a main (488cab0) |
| 2026-07-17 | Esqueletos por stack (vite/estático/otro) | claude/factory-console-backlog-7jafgw | 61d7ceb..f129c0a | lint ✅ test:run 100/100 ✅ build ✅ | Mergeado a main (2ac3276) |
| 2026-07-17 | Estado del deploy en preview + aviso claro de routine pendiente | claude/factory-console-backlog-7jafgw | (este lote) | lint ✅ test:run 104/104 ✅ build ✅ | Pendiente de merge por el usuario |
